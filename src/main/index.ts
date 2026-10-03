import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { IPC, type Settings } from '../shared/ipc'
import { getSettings, onSettings, patchSettings } from './settings'
import { getState, graphql, onState, startEngine, stopEngine } from './suwayomi'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 260,
    minHeight: 320,
    show: false,
    autoHideMenuBar: true,
    title: 'ManwhaView',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => (mainWindow = null))

  mainWindow.webContents.setWindowOpenHandler((details) => {
    if (/^https?:\/\//.test(details.url)) shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.manwhaview.app')
  app.on('browser-window-created', (_, window) => optimizer.watchWindowShortcuts(window))

  ipcMain.handle(IPC.engineGetState, () => getState())
  ipcMain.handle(IPC.engineRestart, () => startEngine())
  ipcMain.handle(IPC.engineGraphql, (_e, query: string, variables?: unknown) =>
    graphql(query, variables)
  )
  ipcMain.handle(IPC.openPath, (_e, path: string) => shell.showItemInFolder(path))
  ipcMain.handle(IPC.settingsGet, () => getSettings())
  ipcMain.handle(IPC.settingsPatch, (_e, key: keyof Settings, value: object) =>
    patchSettings(key, value as Partial<Settings[typeof key]>)
  )
  onSettings((s) => mainWindow?.webContents.send(IPC.settingsChanged, s))
  onState((s) => mainWindow?.webContents.send(IPC.engineState, s))

  createWindow()
  void startEngine()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

let quitting = false
app.on('before-quit', (e) => {
  if (quitting) return
  e.preventDefault()
  quitting = true
  void stopEngine().finally(() => app.quit())
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
