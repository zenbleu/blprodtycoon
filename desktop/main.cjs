const { app, BrowserWindow, ipcMain, shell } = require('electron')
const { createHash } = require('node:crypto')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const fsp = require('node:fs/promises')
const path = require('node:path')
const https = require('node:https')

const APP_NAME = 'BL Production Tycoon'
const REPOSITORY = process.env.BL_TYCOON_UPDATE_REPO || 'zenbleu/blprodtycoon'
const MANIFEST_URL = `https://github.com/${REPOSITORY}/releases/download/desktop-latest/latest.json`
const UPDATE_FILE_NAME = 'BL-Production-Tycoon-update.exe'

let mainWindow
let updateManifest = null
let downloadedUpdate = null

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#120a24',
    autoHideMenuBar: true,
    title: APP_NAME,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function sendProgress(progress) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('update-progress', progress)
  }
}

function requestJson(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 4) {
      reject(new Error('Too many redirects'))
      return
    }
    const request = https.get(url, {
      headers: {
        'User-Agent': 'BL-Production-Tycoon-Updater',
        Accept: 'application/json',
      },
    }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        response.resume()
        requestJson(response.headers.location, redirectCount + 1).then(resolve, reject)
        return
      }
      if (response.statusCode !== 200) {
        response.resume()
        reject(new Error(`Update manifest returned HTTP ${response.statusCode}`))
        return
      }
      let body = ''
      response.setEncoding('utf8')
      response.on('data', chunk => {
        body += chunk
        if (body.length > 1024 * 1024) response.destroy(new Error('Manifest is too large'))
      })
      response.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch {
          reject(new Error('Update manifest was not valid JSON'))
        }
      })
    })
    request.setTimeout(8000, () => request.destroy(new Error('Update request timed out')))
    request.on('error', reject)
  })
}

function compareVersions(left, right) {
  const parse = value => {
    const [core, pre = ''] = String(value).split('-', 2)
    const numbers = core.split('.').map(part => Number.parseInt(part, 10) || 0)
    return { numbers: [numbers[0] || 0, numbers[1] || 0, numbers[2] || 0], pre }
  }
  const a = parse(left)
  const b = parse(right)
  for (let i = 0; i < 3; i += 1) {
    if (a.numbers[i] !== b.numbers[i]) return a.numbers[i] - b.numbers[i]
  }
  if (!a.pre && b.pre) return 1
  if (a.pre && !b.pre) return -1
  return a.pre.localeCompare(b.pre, undefined, { numeric: true })
}

async function checkForUpdates() {
  const installedVersion = app.getVersion()
  try {
    const manifest = await requestJson(MANIFEST_URL)
    if (!manifest || !manifest.version || !manifest.downloadUrl) {
      throw new Error('Update manifest is missing required fields')
    }
    updateManifest = manifest
    const available = compareVersions(manifest.version, installedVersion) > 0
    return {
      status: available ? 'available' : 'current',
      installedVersion,
      latestVersion: manifest.version,
      releaseNotes: manifest.releaseNotes || '',
      size: Number(manifest.size) || 0,
    }
  } catch (error) {
    return {
      status: 'unavailable',
      installedVersion,
      error: error.message || 'Update check failed',
    }
  }
}

function downloadFile(url, destination, expectedSize, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 4) {
      reject(new Error('Too many redirects'))
      return
    }
    const request = https.get(url, {
      headers: { 'User-Agent': 'BL-Production-Tycoon-Updater' },
    }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        response.resume()
        downloadFile(response.headers.location, destination, expectedSize, redirectCount + 1).then(resolve, reject)
        return
      }
      if (response.statusCode !== 200) {
        response.resume()
        reject(new Error(`Update download returned HTTP ${response.statusCode}`))
        return
      }

      const total = Number(response.headers['content-length']) || expectedSize || 0
      let received = 0
      const file = fs.createWriteStream(destination)
      response.on('data', chunk => {
        received += chunk.length
        sendProgress({
          received,
          total,
          percent: total > 0 ? Math.min(100, Math.round((received / total) * 100)) : null,
        })
      })
      response.on('error', error => {
        file.destroy()
        reject(error)
      })
      file.on('error', reject)
      file.on('finish', () => {
        file.close(() => resolve({ received, total }))
      })
      response.pipe(file)
    })
    request.setTimeout(30000, () => request.destroy(new Error('Update download timed out')))
    request.on('error', reject)
  })
}

async function downloadUpdate() {
  if (!updateManifest) throw new Error('Check for updates before downloading')
  const destination = path.join(app.getPath('temp'), UPDATE_FILE_NAME)
  await fsp.rm(destination, { force: true })
  sendProgress({ received: 0, total: Number(updateManifest.size) || 0, percent: 0 })
  await downloadFile(updateManifest.downloadUrl, destination, Number(updateManifest.size) || 0)

  const hash = createHash('sha256')
  const stream = fs.createReadStream(destination)
  for await (const chunk of stream) hash.update(chunk)
  const sha256 = hash.digest('hex')
  if (updateManifest.sha256 && sha256.toLowerCase() !== String(updateManifest.sha256).toLowerCase()) {
    await fsp.rm(destination, { force: true })
    throw new Error('Downloaded update checksum did not match')
  }
  downloadedUpdate = destination
  sendProgress({ received: Number(updateManifest.size) || 0, total: Number(updateManifest.size) || 0, percent: 100 })
  return { status: 'ready', version: updateManifest.version }
}

function installUpdate() {
  if (process.platform !== 'win32') {
    return { status: 'unsupported', error: 'Automatic installation is only available on Windows.' }
  }
  if (!downloadedUpdate || !fs.existsSync(downloadedUpdate)) {
    return { status: 'error', error: 'Download the update before installing it.' }
  }

  const target = app.getPath('exe')
  const script = [
    `$pidToWait = ${process.pid}`,
    `$source = '${downloadedUpdate.replace(/'/g, "''")}'`,
    `$target = '${target.replace(/'/g, "''")}'`,
    'while (Get-Process -Id $pidToWait -ErrorAction SilentlyContinue) { Start-Sleep -Milliseconds 250 }',
    'for ($attempt = 0; $attempt -lt 40; $attempt++) {',
    '  try { Move-Item -LiteralPath $source -Destination $target -Force; break }',
    '  catch { Start-Sleep -Milliseconds 250 }',
    '}',
    'Start-Process -FilePath $target',
  ].join('\n')
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  const child = spawn('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-ExecutionPolicy',
    'Bypass',
    '-EncodedCommand',
    encoded,
  ], { detached: true, stdio: 'ignore', windowsHide: true })
  child.unref()
  setTimeout(() => app.quit(), 100)
  return { status: 'installing' }
}

ipcMain.handle('app-info', () => ({
  isDesktop: true,
  platform: process.platform,
  installedVersion: app.getVersion(),
  repository: REPOSITORY,
}))
ipcMain.handle('check-for-updates', checkForUpdates)
ipcMain.handle('download-update', downloadUpdate)
ipcMain.handle('install-update', installUpdate)
ipcMain.handle('open-external', (_event, url) => {
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) shell.openExternal(url)
})

app.whenReady().then(() => {
  createMainWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})