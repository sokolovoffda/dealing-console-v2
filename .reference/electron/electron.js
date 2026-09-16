import path from 'path'
import { fileURLToPath } from 'url'

import { app, BrowserWindow, screen, globalShortcut, ipcMain } from 'electron'

import {
  installHarNetworkCapture,
  installMainProcessConsoleCapture,
  registerDiagnosticsIpcHandlers,
  trackDiagnosticEvent,
} from './diagnostics.mjs'
import { registerStandConfigIpcHandlers } from './stand-config.mjs'

const isDev = process.env.IS_DEV === 'true'
// TODO(temp): отключить перед релизом — временно для отладки Linux .deb
const FORCE_DISABLE_KIOSK = true

installMainProcessConsoleCapture()
trackDiagnosticEvent('Electron main process bootstrap started', {
  source: 'electron-main-lifecycle',
  tags: ['bootstrap'],
})

function createWindow () {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = path.dirname(__filename)

  const { width, height } = screen.getPrimaryDisplay().bounds
  const shouldUseKioskMode = !isDev && !FORCE_DISABLE_KIOSK

  const mainWindow = new BrowserWindow({
    width,
    height,
    fullscreen: shouldUseKioskMode,
    kiosk: shouldUseKioskMode,
    autoHideMenuBar: shouldUseKioskMode,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: true,
      contextIsolation: true,
      // electron:dev грузит UI с localhost:5558, а API — абсолютными URL стенда.
      // Без этого Chromium режет cross-origin fetch (CORS) → Failed to fetch на логине.
      // В production (file:// dist) флаг не включаем.
      webSecurity: !isDev,
    },
  })
  installHarNetworkCapture(mainWindow.webContents.session)
  trackDiagnosticEvent('Main BrowserWindow created', {
    source: 'electron-main-window',
    payload: {
      width,
      height,
      contextIsolation: true,
      nodeIntegration: true,
    },
  })

  const enableKioskMode = () => {
    if (!shouldUseKioskMode) return

    mainWindow.setFullScreen(true)
    mainWindow.setKiosk(true)
  }

  enableKioskMode()

  const url = isDev ? 'http://localhost:5558' : `file://${path.join(__dirname, '../dist/index.html')}`
  mainWindow.loadURL(url)
  trackDiagnosticEvent('Main window navigation started', {
    source: 'electron-main-window',
    payload: { url },
  })
  mainWindow.once('ready-to-show', enableKioskMode)
  mainWindow.webContents.on('did-finish-load', enableKioskMode)
  mainWindow.on('focus', enableKioskMode)


  if (isDev || FORCE_DISABLE_KIOSK) {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.webContents.on('did-finish-load', () => {
    trackDiagnosticEvent('Main window content loaded', {
      source: 'electron-main-window',
      payload: { url: mainWindow.webContents.getURL() },
    })
  })
  // Перехват сетевых ошибок
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.log('Network error:', errorCode, errorDescription)
    trackDiagnosticEvent('BrowserWindow did-fail-load', {
      source: 'electron-main-window',
      level: 'error',
      payload: {
        errorCode,
        errorDescription,
        validatedURL,
      },
      tags: ['network-error'],
    })
    mainWindow.webContents.send('network-error', {
      type: 'load-failed',
      code: errorCode,
      description: errorDescription,
      url: validatedURL,
      timestamp: new Date().toISOString(),
    })
  })
  // Обработка ошибок сертификатов
  mainWindow.webContents.on('certificate-error', (event, url, error, certificate, callback) => {
    event.preventDefault()
    console.log('Certificate error:', error, url)
    trackDiagnosticEvent('BrowserWindow certificate error', {
      source: 'electron-main-window',
      level: 'error',
      payload: {
        error,
        url,
        certificate,
      },
      tags: ['certificate-error'],
    })
    mainWindow.webContents.send('certificate-error', {
      type: 'certificate-error',
      error: error,
      url: url,
      timestamp: new Date().toISOString(),
    })
    // Блокируем загрузку при ошибке сертификата
    callback(false)
  })
  // Мониторинг онлайн/офлайн статуса
  mainWindow.webContents.on('render-process-gone', (event, details) => {
    trackDiagnosticEvent('Renderer process gone', {
      source: 'electron-main-window',
      level: 'error',
      payload: details,
      tags: ['renderer-crashed'],
    })
    mainWindow.webContents.send('network-error', {
      type: 'renderer-crashed',
      reason: details.reason,
      timestamp: new Date().toISOString(),
    })
  })
}

app.whenReady().then(() => {
  trackDiagnosticEvent('Electron app is ready', {
    source: 'electron-main-lifecycle',
  })
  registerDiagnosticsIpcHandlers({ app, ipcMain })
  registerStandConfigIpcHandlers({ app, ipcMain })
  createWindow()

  app.on('activate', function () {
    trackDiagnosticEvent('Electron app activate event received', {
      source: 'electron-main-lifecycle',
    })
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })

  ipcMain.handle('relaunch-app', () => {
    trackDiagnosticEvent('Application relaunch requested', {
      source: 'electron-main-ipc',
      tags: ['relaunch'],
    })
    app.relaunch()
    app.exit()
  })  
})

app.on('window-all-closed', () => {
  trackDiagnosticEvent('All windows closed', {
    source: 'electron-main-lifecycle',
  })
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('browser-window-focus', function () {
  trackDiagnosticEvent('Browser window focused', {
    source: 'electron-main-window',
  })
  globalShortcut.register('CommandOrControl+R', () => { // Отключаем перезагрузку страницы
    console.log('CommandOrControl+R is pressed: Shortcut Disabled')
  })
  globalShortcut.register('CommandOrControl+Shift+R', () => { // Отключаем перезагрузку страницы
    console.log('CommandOrControl+Shift+R is pressed: Shortcut Disabled')
  })
  globalShortcut.register('F5', () => { // Отключаем перезагрузку страницы
    console.log('F5 is pressed: Shortcut Disabled')
  })
})

app.on('browser-window-blur', function () {
  trackDiagnosticEvent('Browser window lost focus', {
    source: 'electron-main-window',
  })
  globalShortcut.unregister('CommandOrControl+R')
  globalShortcut.unregister('CommandOrControl+Shift+R')
  globalShortcut.unregister('F5')
})
