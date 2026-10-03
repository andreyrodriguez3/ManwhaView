import { create } from 'zustand'
import type { WinState } from '../../../shared/ipc'

export const useWin = create<WinState>(() => ({ pinned: false, ghost: false, opacity: 1 }))

/** Sincroniza el estado de la ventana con el proceso principal. Llamar una vez. */
export function initWin(): void {
  void window.api.win.getState().then((s) => useWin.setState(s))
  window.api.win.onState((s) => useWin.setState(s))
}
