import { useEffect } from 'react'
import { useReaderStore } from '../store/reader'

/** Atajos globales que se resuelven en la interfaz (scroll y auto-scroll del lector). */
export function useHotkeys(): void {
  useEffect(
    () =>
      window.api.hotkeys.onAction((action) => {
        const r = useReaderStore.getState()
        if (action === 'scrollUp') r.scrollBy(-1)
        else if (action === 'scrollDown') r.scrollBy(1)
        else r.toggleAutoScroll()
      }),
    []
  )
}
