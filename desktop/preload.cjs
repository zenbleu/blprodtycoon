const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('desktopUpdater', {
  getInfo: () => ipcRenderer.invoke('app-info'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  openExternal: url => ipcRenderer.invoke('open-external', url),
  onProgress: callback => {
    const listener = (_event, progress) => callback(progress)
    ipcRenderer.on('update-progress', listener)
    return () => ipcRenderer.removeListener('update-progress', listener)
  },
})