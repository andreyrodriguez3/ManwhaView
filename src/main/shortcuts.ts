import { globalShortcut } from 'electron'
import { IPC, type HotkeyAction, type ShortcutAction, type ShortcutStatus } from '../shared/ipc'
import { getSettings } from './settings'
import { getWinState, getWindow, setGhost, setPinned, toggleVisible } from './window'

let status: ShortcutStatus = { failed: [] }
export const getShortcutStatus = (): ShortcutStatus => status

const toRenderer = (action: HotkeyAction) => (): void =>
  getWindow()?.webContents.send(IPC.hotkey, action)

const HANDLERS: Record<ShortcutAction, () => void> = {
  toggleVisible: () => toggleVisible(),
  toggleGhost: () => setGhost(!getWinState().ghost),
  togglePin: () => setPinned(!getWinState().pinned),
  scrollUp: toRenderer('scrollUp'),
  scrollDown: toRenderer('scrollDown'),
  toggleAutoScroll: toRenderer('toggleAutoScroll')
}

/** (Re)registra los atajos globales según los ajustes. Los que fallen se avisan a la interfaz. */
export function registerShortcuts(): ShortcutStatus {
  globalShortcut.unregisterAll()
  const failed: ShortcutAction[] = []
  const entries = Object.entries(getSettings().shortcuts) as [ShortcutAction, string][]
  for (const [action, accel] of entries) {
    if (!accel) continue
    try {
      if (!globalShortcut.register(accel, HANDLERS[action])) failed.push(action)
    } catch {
      failed.push(action) // acelerador inválido
    }
  }
  status = { failed }
  getWindow()?.webContents.send(IPC.shortcutsStatus, status)
  return status
}

export const unregisterShortcuts = (): void => globalShortcut.unregisterAll()
