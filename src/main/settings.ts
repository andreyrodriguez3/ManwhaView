import Store from 'electron-store'
import { DEFAULT_SETTINGS, type Settings } from '../shared/ipc'

const store = new Store<Settings>({ name: 'settings', defaults: DEFAULT_SETTINGS })
const listeners = new Set<(s: Settings) => void>()

/** Ajustes completos; las secciones guardadas se completan con los valores por defecto. */
export function getSettings(): Settings {
  const s = store.store
  return {
    window: { ...DEFAULT_SETTINGS.window, ...s.window },
    reader: { ...DEFAULT_SETTINGS.reader, ...s.reader },
    shortcuts: { ...DEFAULT_SETTINGS.shortcuts, ...s.shortcuts },
    app: { ...DEFAULT_SETTINGS.app, ...s.app }
  }
}

export function patchSettings<K extends keyof Settings>(
  key: K,
  value: Partial<Settings[K]>
): Settings {
  store.set(key, { ...getSettings()[key], ...value })
  const next = getSettings()
  listeners.forEach((fn) => fn(next))
  return next
}

export function onSettings(fn: (s: Settings) => void): void {
  listeners.add(fn)
}
