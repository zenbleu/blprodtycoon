import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const packageJson = JSON.parse(await readFile('package.json', 'utf8'))
const repository = process.env.GITHUB_REPOSITORY || packageJson.build?.desktopRepository
if (!repository) throw new Error('GITHUB_REPOSITORY or package.desktopRepository is required')

const executable = path.resolve('release/BL-Production-Tycoon.exe')
const bytes = await readFile(executable)
const sha256 = createHash('sha256').update(bytes).digest('hex')
const manifest = {
  version: packageJson.version,
  productName: packageJson.productName || 'BL Production Tycoon',
  size: bytes.byteLength,
  sha256,
  downloadUrl: `https://github.com/${repository}/releases/download/desktop-latest/BL-Production-Tycoon.exe`,
  releaseNotes: `Windows desktop build ${packageJson.version}`,
}

await writeFile('release/latest.json', `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Created release manifest for ${manifest.version} (${manifest.size} bytes)`)