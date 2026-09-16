import { contextBridge, ipcRenderer } from 'electron'

const DIAGNOSTIC_IPC_CHANNELS = {
  GET_SNAPSHOT: 'diagnostics:get-snapshot',
}

const STAND_CONFIG_IPC_CHANNELS = {
  GET: 'standConfig:get',
  SET: 'standConfig:set',
  PING: 'standConfig:ping',
}

contextBridge.exposeInMainWorld('api/user/login', {
  // fetch: (url, options) => {
  //   console.log('preload url', url)
  //   console.log('preload options', options)
  //   return window.fetch(`https://webclientrtudev.satel.org:3333/${url}`, options)
  // }
})

contextBridge.exposeInMainWorld('electronAPI', {
  relaunch: () => ipcRenderer.invoke('relaunch-app'),
  getDiagnosticsSnapshot: (request) => ipcRenderer.invoke(DIAGNOSTIC_IPC_CHANNELS.GET_SNAPSHOT, request),
  getStandConfig: () => ipcRenderer.invoke(STAND_CONFIG_IPC_CHANNELS.GET),
  setStandConfig: (config) => ipcRenderer.invoke(STAND_CONFIG_IPC_CHANNELS.SET, config),
  pingStandConfig: (request) => ipcRenderer.invoke(STAND_CONFIG_IPC_CHANNELS.PING, request),
  // Для сетевых ошибок
  onNetworkError: (callback) => ipcRenderer.on('network-error', callback),
  removeAllNetworkErrorListeners: () => ipcRenderer.removeAllListeners('network-error'),
  // Для статуса сети
  onOnlineStatus: (callback) => ipcRenderer.on('online-status-changed', callback),
  // Для проверки сертификатов
  onCertificateError: (callback) => ipcRenderer.on('certificate-error', callback),
})
