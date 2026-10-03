import { useEffect, useRef } from 'react'

/** Devuelve una ref para un elemento "centinela": cuando entra en pantalla se llama a `onVisible`. */
export function useSentinel(
  onVisible: () => void,
  enabled: boolean
): React.RefObject<HTMLDivElement | null> {
  const ref = useRef<HTMLDivElement | null>(null)
  const cb = useRef(onVisible)
  useEffect(() => {
    cb.current = onVisible
  })
  useEffect(() => {
    const el = ref.current
    if (!enabled || !el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) cb.current()
      },
      { rootMargin: '400px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [enabled])
  return ref
}
