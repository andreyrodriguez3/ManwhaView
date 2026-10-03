import { useEffect, useState } from 'react'
import {
  DEFAULT_SETTINGS,
  SHORTCUT_ACTIONS,
  type ShortcutAction,
  type ShortcutStatus
} from '../../../shared/ipc'
import { patchSettings, useSettings } from '../store/settings'

const KEY_NAMES: Record<string, string> = {
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  ' ': 'Space',
  Escape: 'Escape',
  Enter: 'Return',
  PageUp: 'PageUp',
  PageDown: 'PageDown',
  Home: 'Home',
  End: 'End',
  Tab: 'Tab'
}

/** Convierte un evento de teclado en un acelerador de Electron (o null si falta tecla/modificador). */
function toAccelerator(e: React.KeyboardEvent): string | null {
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return null
  const mods = [e.ctrlKey && 'Ctrl', e.altKey && 'Alt', e.shiftKey && 'Shift', e.metaKey && 'Super']
  if (!mods.some(Boolean)) return null
  let key = KEY_NAMES[e.key]
  if (!key) {
    if (/^F\d{1,2}$/.test(e.key)) key = e.key
    else if (e.key.length === 1) key = e.key.toUpperCase()
    else return null
  }
  return [...mods.filter(Boolean), key].join('+')
}

export default function ShortcutSettings(): React.JSX.Element {
  const shortcuts = useSettings((s) => s.settings.shortcuts)
  const [status, setStatus] = useState<ShortcutStatus>({ failed: [] })

  useEffect(() => {
    void window.api.hotkeys.getStatus().then(setStatus)
    return window.api.hotkeys.onStatus(setStatus)
  }, [])

  const set = (action: ShortcutAction, value: string): void =>
    patchSettings('shortcuts', { [action]: value })

  return (
    <>
      <h3>Atajos globales</h3>
      <p className="muted small">
        Funcionan aunque la ventana no esté activa. Haz clic en un campo y pulsa la combinación (con
        Ctrl, Alt, Shift o Win). Retroceso la deja vacía.
      </p>
      {(Object.keys(SHORTCUT_ACTIONS) as ShortcutAction[]).map((action) => (
        <div className="shortcut-row" key={action}>
          <span className="label">{SHORTCUT_ACTIONS[action]}</span>
          <input
            readOnly
            value={shortcuts[action]}
            placeholder="(sin atajo)"
            onKeyDown={(e) => {
              e.preventDefault()
              if (e.key === 'Backspace' || e.key === 'Delete') return set(action, '')
              const accel = toAccelerator(e)
              if (accel) set(action, accel)
            }}
          />
          <button
            className="secondary"
            onClick={() => set(action, DEFAULT_SETTINGS.shortcuts[action])}
          >
            Restablecer
          </button>
          {status.failed.includes(action) && shortcuts[action] && (
            <span className="error small">Ya lo usa otra aplicación</span>
          )}
        </div>
      ))}
    </>
  )
}
