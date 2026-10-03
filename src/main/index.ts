import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { IPC, type Settings } from '../shared/ipc'
import { getSettings, onSettings, patchSettings } from './settings'
import { getShortcutStatus, registerShortcuts, unregisterShortcuts } from './shortcuts'
import { createTray, refreshTray } from './tray'
import { getLoginItem, HIDDEN_ARG, setLoginItem } from './login'
import { getState, graphql, onState, startEngine, stopEngine } from './suwayomi'
import {
  createWindow,
  getWinState,
  getWindow,
  setGhost,
  setGhostHandle,
  setOpacity,
  onWinChange,
  setPinned,
  setQuitting,
  showWindow
} from './window'

// Instancia única: una segunda copia solo muestra la ventana de la primera.
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => showWindow())
  void app.whenReady().then(start)
}

function start(): void {
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

  ipcMain.handle(IPC.winGetState, () => getWinState())
  ipcMain.handle(IPC.winSetPinned, (_e, v: boolean) => setPinned(v))
  ipcMain.handle(IPC.winSetGhost, (_e, v: boolean) => setGhost(v))
  ipcMain.handle(IPC.winSetOpacity, (_e, v: number) => setOpacity(v))
  ipcMain.handle(IPC.winMinimize, () => getWindow()?.minimize())
  ipcMain.handle(IPC.winClose, () => getWindow()?.close())
  ipcMain.on(IPC.winGhostHandle, (_e, inside: boolean) => setGhostHandle(inside))
  ipcMain.handle(IPC.appGetLogin, () => getLoginItem())
  ipcMain.handle(IPC.appSetLogin, (_e, v: boolean) => {
    setLoginItem(v)
    refreshTray()
    return getLoginItem()
  })
  ipcMain.handle(IPC.shortcutsGetStatus, () => getShortcutStatus())

  let shortcutsJson = JSON.stringify(getSettings().shortcuts)
  onSettings((s) => {
    getWindow()?.webContents.send(IPC.settingsChanged, s)
    const json = JSON.stringify(s.shortcuts)
    if (json !== shortcutsJson) {
      shortcutsJson = json
      registerShortcuts()
    }
  })
  onState((s) => getWindow()?.webContents.send(IPC.engineState, s))

  onWinChange(refreshTray)
  createWindow({ hidden: process.argv.includes(HIDDEN_ARG) })
  createTray()
  registerShortcuts()
  void startEngine()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}

let quitting = false
app.on('before-quit', (e) => {
  if (quitting) return
  e.preventDefault()
  quitting = true
  setQuitting()
  unregisterShortcuts()
  void stopEngine().finally(() => app.quit())
})

// La app vive en la bandeja: cerrar la ventana no la termina (solo «Salir»).
app.on('window-all-closed', () => {})
