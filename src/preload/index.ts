import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type EngineState, type GraphqlResponse, type Settings } from '../shared/ipc'

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
  showInFolder: (path: string): Promise<void> => ipcRenderer.invoke(IPC.openPath, path)
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
