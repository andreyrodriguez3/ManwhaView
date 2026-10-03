/** Canales IPC y tipos compartidos entre main, preload y renderer. */

export const IPC = {
  engineGetState: 'engine:getState',
  engineRestart: 'engine:restart',
  engineState: 'engine:state',
  engineGraphql: 'engine:graphql',
  openPath: 'shell:openPath'
} as const

export type EngineState =
  | { status: 'starting' }
  | { status: 'ready'; url: string; version: string; logPath: string }
  | { status: 'error'; message: string; logPath: string }

export interface GraphqlResponse<T = unknown> {
  data?: T | null
  errors?: { message: string }[]
}

/** Repositorio de extensiones por defecto (el mismo que usa Mihon: Keiyoushi). */
export const DEFAULT_EXTENSION_STORE = 'https://github.com/keiyoushi/extensions/raw/repo/index.pb'
