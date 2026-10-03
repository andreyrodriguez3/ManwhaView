import { create } from 'zustand'
import { DEFAULT_SETTINGS, type Settings } from '../../../shared/ipc'

interface Store {
  settings: Settings
  loaded: boolean
}

export const useSettings = create<Store>(() => ({ settings: DEFAULT_SETTINGS, loaded: false }))

/** Carga los ajustes del proceso principal y los mantiene sincronizados. Llamar una vez. */
export function initSettings(): void {
  void window.api.settings
    .get()
    .then((settings) => useSettings.setState({ settings, loaded: true }))
  window.api.settings.onChange((settings) => useSettings.setState({ settings }))
}

export const patchSettings = <K extends keyof Settings>(
  key: K,
  value: Partial<Settings[K]>
): void => {
  // Actualización optimista; el proceso principal confirma con settings:changed.
  useSettings.setState((s) => ({
    settings: { ...s.settings, [key]: { ...s.settings[key], ...value } }
  }))
  void window.api.settings.patch(key, value)
}
