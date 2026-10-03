import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type EngineState, type GraphqlResponse } from '../shared/ipc'

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
  showInFolder: (path: string): Promise<void> => ipcRenderer.invoke(IPC.openPath, path)
}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
