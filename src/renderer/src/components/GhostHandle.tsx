import { useEffect, useRef } from 'react'
import { useReaderStore } from '../store/reader'

/** Ancho (px) de la franja del borde derecho que reacciona al ratón en modo fantasma. */
export const HANDLE_WIDTH = 28

/**
 * En modo fantasma la ventana ignora el ratón (los clics atraviesan), pero `forward: true`
 * sigue enviando `mousemove`. Al entrar en el asa se avisa al proceso principal para que
 * capture el ratón; al salir, se vuelve a dejar pasar.
 */
export default function GhostHandle(): React.JSX.Element {
  const inside = useRef(false)

  useEffect(() => {
    const onMove = (e: MouseEvent): void => {
      const now = e.clientX >= window.innerWidth - HANDLE_WIDTH
      if (now === inside.current) return
      inside.current = now
      window.api.win.ghostHandle(now)
    }
    const onLeave = (): void => {
      if (!inside.current) return
      inside.current = false
      window.api.win.ghostHandle(false)
    }
    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      if (inside.current) window.api.win.ghostHandle(false)
    }
  }, [])

  return (
    <div
      className="ghost-handle"
      style={{ width: HANDLE_WIDTH }}
      onWheel={(e) => useReaderStore.getState().wheelBy(e.deltaY)}
    >
      <button
        className="icon"
        title="Salir del modo fantasma (Ctrl+Alt+G)"
        onClick={() => void window.api.win.setGhost(false)}
      >
        👻
      </button>
    </div>
  )
}
