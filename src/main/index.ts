import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { IPC, type Settings } from '../shared/ipc'
import { getSettings, onSettings, patchSettings } from './settings'
import { getShortcutStatus, registerShortcuts, unregisterShortcuts } from './shortcuts'
import { getState, graphql, onState, startEngine, stopEngine } from './suwayomi'
import {
  createWindow,
  getWinState,
  getWindow,
  setGhost,
  setGhostHandle,
  setOpacity,
  setPinned
} from './window'

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

  ipcMain.handle(IPC.winGetState, () => getWinState())
  ipcMain.handle(IPC.winSetPinned, (_e, v: boolean) => setPinned(v))
  ipcMain.handle(IPC.winSetGhost, (_e, v: boolean) => setGhost(v))
  ipcMain.handle(IPC.winSetOpacity, (_e, v: number) => setOpacity(v))
  ipcMain.handle(IPC.winMinimize, () => getWindow()?.minimize())
  ipcMain.handle(IPC.winClose, () => getWindow()?.close())
  ipcMain.on(IPC.winGhostHandle, (_e, inside: boolean) => setGhostHandle(inside))
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

  createWindow()
  registerShortcuts()
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
  unregisterShortcuts()
  void stopEngine().finally(() => app.quit())
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
