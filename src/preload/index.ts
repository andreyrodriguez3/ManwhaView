import { contextBridge, ipcRenderer } from 'electron'
import {
  IPC,
  type EngineState,
  type GraphqlResponse,
  type HotkeyAction,
  type Settings,
  type ShortcutStatus,
  type WinState
} from '../shared/ipc'

const subscribe = <T>(channel: string, cb: (v: T) => void): (() => void) => {
  const handler = (_: unknown, v: T): void => cb(v)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api = {
  engine: {
    getState: (): Promise<EngineState> => ipcRenderer.invoke(IPC.engineGetState),
    restart: (): Promise<void> => ipcRenderer.invoke(IPC.engineRestart),
    onState: (cb: (s: EngineState) => void): (() => void) => {
      const handler = (_: unknown, s: EngineState): void => cb(s)
      ipcRenderer.on(IPC.engineState, handler)
      return () => ipcRenderer.removeListener(IPC.engineState, handler)
    }
  },
  graphql: <T>(query: string, variables?: unknown): Promise<GraphqlResponse<T>> =>
    ipcRenderer.invoke(IPC.engineGraphql, query, variables),
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke(IPC.settingsGet),
    patch: <K extends keyof Settings>(key: K, value: Partial<Settings[K]>): Promise<Settings> =>
      ipcRenderer.invoke(IPC.settingsPatch, key, value),
    onChange: (cb: (s: Settings) => void): (() => void) => {
      const handler = (_: unknown, s: Settings): void => cb(s)
      ipcRenderer.on(IPC.settingsChanged, handler)
      return () => ipcRenderer.removeListener(IPC.settingsChanged, handler)
    }
  },
  win: {
    getState: (): Promise<WinState> => ipcRenderer.invoke(IPC.winGetState),
    onState: (cb: (s: WinState) => void): (() => void) => subscribe(IPC.winState, cb),
    setPinned: (v: boolean): Promise<void> => ipcRenderer.invoke(IPC.winSetPinned, v),
    setGhost: (v: boolean): Promise<void> => ipcRenderer.invoke(IPC.winSetGhost, v),
    setOpacity: (v: number): Promise<void> => ipcRenderer.invoke(IPC.winSetOpacity, v),
    minimize: (): Promise<void> => ipcRenderer.invoke(IPC.winMinimize),
    close: (): Promise<void> => ipcRenderer.invoke(IPC.winClose),
    /** El ratón entró/salió del asa del modo fantasma. */
    ghostHandle: (inside: boolean): void => ipcRenderer.send(IPC.winGhostHandle, inside)
  },
  app: {
    getLogin: (): Promise<{ enabled: boolean; available: boolean }> =>
      ipcRenderer.invoke(IPC.appGetLogin),
    setLogin: (v: boolean): Promise<{ enabled: boolean; available: boolean }> =>
      ipcRenderer.invoke(IPC.appSetLogin, v)
  },
  hotkeys: {
    onAction: (cb: (a: HotkeyAction) => void): (() => void) => subscribe(IPC.hotkey, cb),
    getStatus: (): Promise<ShortcutStatus> => ipcRenderer.invoke(IPC.shortcutsGetStatus),
    onStatus: (cb: (s: ShortcutStatus) => void): (() => void) => subscribe(IPC.shortcutsStatus, cb)
  },
  showInFolder: (path: string): Promise<void> => ipcRenderer.invoke(IPC.openPath, path)
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
