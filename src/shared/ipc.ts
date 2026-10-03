/** Canales IPC y tipos compartidos entre main, preload y renderer. */

export const IPC = {
  engineGetState: 'engine:getState',
  engineRestart: 'engine:restart',
  engineState: 'engine:state',
  engineGraphql: 'engine:graphql',
  openPath: 'shell:openPath',
  settingsGet: 'settings:get',
  settingsPatch: 'settings:patch',
  settingsChanged: 'settings:changed',
  winGetState: 'win:getState',
  winState: 'win:state',
  winSetPinned: 'win:setPinned',
  winSetGhost: 'win:setGhost',
  winSetOpacity: 'win:setOpacity',
  winMinimize: 'win:minimize',
  winClose: 'win:close',
  winGhostHandle: 'win:ghostHandle',
  backupPick: 'backup:pick',
  backupValidate: 'backup:validate',
  backupRestore: 'backup:restore',
  backupStatus: 'backup:status',
  backupExport: 'backup:export',
  appQuit: 'app:quit',
  appGetLogin: 'app:getLogin',
  appSetLogin: 'app:setLogin',
  hotkey: 'hotkey:action',
  shortcutsStatus: 'shortcuts:status',
  shortcutsGetStatus: 'shortcuts:getStatus'
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

export type ReaderMode = 'vertical' | 'ltr' | 'rtl'

export interface Bounds {
  x: number
  y: number
  width: number
  height: number
}

/** Acciones con atajo global (Fase 7). */
export const SHORTCUT_ACTIONS = {
  toggleVisible: 'Mostrar/ocultar la ventana',
  toggleGhost: 'Modo fantasma',
  togglePin: 'Fijar/desfijar',
  scrollUp: 'Scroll hacia arriba',
  scrollDown: 'Scroll hacia abajo',
  toggleAutoScroll: 'Auto-scroll'
} as const
export type ShortcutAction = keyof typeof SHORTCUT_ACTIONS

/** Ajustes persistentes (electron-store). */
export interface Settings {
  window: {
    bounds: Bounds | null
    opacity: number // 0.3–1
    ghostOpacity: number // 0.2–1
    pinned: boolean
  }
  reader: {
    widthPct: number // 100 = ajustar a la ventana
    speed: number // px/s del auto-scroll
    modes: Record<string, ReaderMode> // por manga
  }
  shortcuts: Record<ShortcutAction, string>
  app: { trayHintShown: boolean }
  content: { hideAdult: boolean; hideMixed: boolean }
}

export const DEFAULT_SETTINGS: Settings = {
  window: { bounds: null, opacity: 1, ghostOpacity: 0.6, pinned: false },
  reader: { widthPct: 100, speed: 120, modes: {} },
  shortcuts: {
    toggleVisible: 'Ctrl+Alt+M',
    toggleGhost: 'Ctrl+Alt+G',
    togglePin: 'Ctrl+Alt+P',
    scrollUp: 'Ctrl+Alt+Up',
    scrollDown: 'Ctrl+Alt+Down',
    toggleAutoScroll: 'Ctrl+Alt+Space'
  },
  app: { trayHintShown: false },
  content: { hideAdult: false, hideMixed: false }
}

/** Estado de la ventana flotante que muestra la interfaz. */
export interface WinState {
  pinned: boolean
  ghost: boolean
  opacity: number
}

/** Acciones de atajo que se resuelven en la interfaz (el resto las hace el proceso principal). */
export type HotkeyAction = 'scrollUp' | 'scrollDown' | 'toggleAutoScroll'

/** Atajos que el sistema no dejó registrar (ya los usa otra aplicación o son inválidos). */
export type ShortcutStatus = { failed: ShortcutAction[] }

/** Progreso de una restauración de copia de seguridad. `state` es el de Suwayomi (RESTORING_MANGA, SUCCESS…). */
export interface BackupSummary {
  state: string
  progress: number
  total: number
}
