import { useEffect, useRef, useState } from 'react'
import type { ChapterFieldsFragment } from '../api/gql/graphql'
import { usePages } from '../hooks/usePages'
import { useReaderStore } from '../store/reader'

const DEFAULT_RATIO = 0.7
const PRELOAD_AHEAD = 3

interface SectionProps {
  chapter: ChapterFieldsFragment
  root: HTMLElement | null
  resume: boolean
  onPage: (chapterId: number, page: number, total: number) => void
  onEnd: (chapterId: number) => void
  showTitle: boolean
}

/** Un capítulo en modo continuo: páginas con altura estimada que cargan al acercarse. */
function ChapterSection({
  chapter,
  root,
  resume,
  onPage,
  onEnd,
  showTitle
}: SectionProps): React.JSX.Element {
  const pages = usePages(chapter.id)
  const urls = pages.data?.urls
  const total = urls?.length ?? 0
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set())
  const [ratios, setRatios] = useState<Record<number, number>>({})
  const [attempts, setAttempts] = useState<Record<number, number>>({})
  const [failed, setFailed] = useState<Set<number>>(() => new Set())
  const sectionRef = useRef<HTMLElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const pageEls = useRef<(HTMLDivElement | null)[]>([])
  const cbs = useRef({ onPage, onEnd })
  useEffect(() => {
    cbs.current = { onPage, onEnd }
  })

  // Al reanudar, la página de destino y las siguientes se piden desde el principio.
  const resumeAt = resume && !chapter.isRead ? chapter.lastPageRead : 0
  const isWanted = (i: number): boolean =>
    loaded.has(i) || (resumeAt > 0 && i >= resumeAt && i <= resumeAt + PRELOAD_AHEAD)

  const known = Object.values(ratios)
  const avg = known.length ? known.reduce((a, b) => a + b, 0) / known.length : DEFAULT_RATIO

  const want = (from: number, to: number): void =>
    setLoaded((prev) => {
      const next = new Set(prev)
      for (let k = from; k <= to && k < total; k++) next.add(k)
      return next.size === prev.size ? prev : next
    })

  // Carga al llegar a cada página (con margen) y precarga las siguientes.
  useEffect(() => {
    if (!root || total === 0) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          const i = Number((e.target as HTMLElement).dataset.page)
          want(i, i + PRELOAD_AHEAD)
        }
      },
      { root, rootMargin: '1500px 0px' }
    )
    pageEls.current.forEach((el) => el && io.observe(el))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, total])

  // Reanuda en la última página leída. Al cargar las páginas cercanas cambia su altura y el
  // destino se mueve, así que se realinea mientras el diseño se estabiliza (máx. 4 s) o hasta
  // que el usuario haga algún gesto.
  useEffect(() => {
    if (!root || !resume || total === 0) return
    const target = chapter.isRead ? 0 : Math.min(chapter.lastPageRead, total - 1)
    if (target <= 0) return
    const align = (): void => pageEls.current[target]?.scrollIntoView({ block: 'start' })
    align()
    const ro = new ResizeObserver(align)
    if (sectionRef.current) ro.observe(sectionRef.current)
    const stop = (): void => {
      ro.disconnect()
      clearTimeout(timer)
    }
    const timer = setTimeout(stop, 4000)
    root.addEventListener('wheel', stop, { passive: true })
    root.addEventListener('pointerdown', stop)
    root.addEventListener('touchstart', stop, { passive: true })
    window.addEventListener('keydown', stop)
    return () => {
      stop()
      root.removeEventListener('wheel', stop)
      root.removeEventListener('pointerdown', stop)
      root.removeEventListener('touchstart', stop)
      window.removeEventListener('keydown', stop)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, resume, total])

  // Página actual = la que cruza una línea al 35 % de la altura visible.
  useEffect(() => {
    if (!root || total === 0) return
    let raf = 0
    const compute = (): void => {
      raf = 0
      const sec = sectionRef.current
      if (!sec) return
      const rr = root.getBoundingClientRect()
      const line = rr.top + rr.height * 0.35
      const sr = sec.getBoundingClientRect()
      if (sr.top > line || sr.bottom < line) return
      let cur = 0
      for (let i = 0; i < pageEls.current.length; i++) {
        const el = pageEls.current[i]
        if (el && el.getBoundingClientRect().top <= line) cur = i
        else break
      }
      cbs.current.onPage(chapter.id, cur, total)
    }
    const onScroll = (): void => {
      if (!raf) raf = requestAnimationFrame(compute)
    }
    root.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      root.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [root, total, chapter.id])

  // Fin del capítulo: el marcador final entra en pantalla (sin margen).
  useEffect(() => {
    const el = endRef.current
    if (!root || !el || total === 0) return
    let fired = false
    const io = new IntersectionObserver(
      (entries) => {
        if (!fired && entries.some((e) => e.isIntersecting)) {
          fired = true
          cbs.current.onEnd(chapter.id)
        }
      },
      { root }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [root, total, chapter.id])

  return (
    <section ref={sectionRef}>
      {showTitle && <div className="chapter-sep">{chapter.name}</div>}
      {pages.isLoading && <p className="muted center-text pad">Cargando capítulo…</p>}
      {pages.error && (
        <div className="center-text pad">
          <p className="error">{(pages.error as Error).message}</p>
          <button onClick={() => void pages.refetch()}>Reintentar</button>
        </div>
      )}
      {urls?.map((url, i) => (
        <div
          key={i}
          data-page={i}
          ref={(el) => {
            pageEls.current[i] = el
          }}
          className="page"
          style={ratios[i] ? undefined : { aspectRatio: String(avg) }}
        >
          {isWanted(i) && !failed.has(i) && (
            <img
              src={attempts[i] ? `${url}?retry=${attempts[i]}` : url}
              alt={`Página ${i + 1}`}
              draggable={false}
              onLoad={(e) => {
                const { naturalWidth: w, naturalHeight: h } = e.currentTarget
                if (w && h) setRatios((r) => (r[i] ? r : { ...r, [i]: w / h }))
              }}
              onError={() => setFailed((f) => new Set(f).add(i))}
            />
          )}
          {failed.has(i) && (
            <div className="page-error">
              <p className="small">No se pudo cargar la página {i + 1}.</p>
              <button
                onClick={() => {
                  setAttempts((a) => ({ ...a, [i]: (a[i] ?? 0) + 1 }))
                  setFailed((f) => {
                    const n = new Set(f)
                    n.delete(i)
                    return n
                  })
                }}
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
      ))}
      <div ref={endRef} style={{ height: 1 }} />
    </section>
  )
}

interface Props {
  order: ChapterFieldsFragment[]
  startId: number
  widthPct: number
  speed: number
  onProgress: (chapterId: number, page: number, total: number) => void
  onFinished: (chapterId: number) => void
  onZoom: (delta: number) => void
  onChapterStep: (dir: 1 | -1) => void
}

export default function VerticalReader({
  order,
  startId,
  widthPct,
  speed,
  onProgress,
  onFinished,
  onZoom,
  onChapterStep
}: Props): React.JSX.Element {
  const [root, setRoot] = useState<HTMLDivElement | null>(null)
  const [ids, setIds] = useState<number[]>([startId])
  const autoScroll = useReaderStore((s) => s.autoScroll)
  const scrollCmd = useReaderStore((s) => s.scrollCmd)
  const wheel = useReaderStore((s) => s.wheel)
  const speedRef = useRef(speed)
  useEffect(() => {
    speedRef.current = speed
  })

  const handleEnd = (id: number): void => {
    onFinished(id)
    // En vertical, el siguiente capítulo se carga debajo sin cortes.
    if (id !== ids[ids.length - 1]) return
    const i = order.findIndex((c) => c.id === id)
    const next = order[i + 1]
    if (next) setIds((cur) => (cur.includes(next.id) ? cur : [...cur, next.id]))
  }

  // Auto-scroll: se pausa con cualquier gesto manual y sigue 2 s después.
  useEffect(() => {
    if (!autoScroll || !root) return
    let raf = 0
    let last = performance.now()
    let acc = 0
    let pausedUntil = 0
    const pause = (): void => {
      pausedUntil = performance.now() + 2000
    }
    const tick = (t: number): void => {
      const dt = Math.min((t - last) / 1000, 0.1)
      last = t
      if (t >= pausedUntil) {
        acc += speedRef.current * dt
        const whole = Math.trunc(acc)
        if (whole) {
          root.scrollTop += whole
          acc -= whole
        }
      }
      raf = requestAnimationFrame(tick)
    }
    root.addEventListener('wheel', pause, { passive: true })
    root.addEventListener('touchstart', pause, { passive: true })
    root.addEventListener('pointerdown', pause)
    window.addEventListener('keydown', pause)
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      root.removeEventListener('wheel', pause)
      root.removeEventListener('touchstart', pause)
      root.removeEventListener('pointerdown', pause)
      window.removeEventListener('keydown', pause)
    }
  }, [autoScroll, root])

  // Órdenes de scroll externas (atajos globales).
  const lastCmd = useRef(scrollCmd.n)
  useEffect(() => {
    if (scrollCmd.n === lastCmd.current) return
    lastCmd.current = scrollCmd.n
    root?.scrollBy({ top: scrollCmd.dir * root.clientHeight * 0.8, behavior: 'smooth' })
  }, [scrollCmd, root])

  // Rueda recibida desde el asa del modo fantasma.
  const lastWheel = useRef(wheel.n)
  useEffect(() => {
    if (wheel.n === lastWheel.current) return
    lastWheel.current = wheel.n
    root?.scrollBy({ top: wheel.dy })
  }, [wheel, root])

  // Zoom con Ctrl + rueda (listener nativo: React registra la rueda como pasiva).
  useEffect(() => {
    if (!root) return
    const onWheel = (e: WheelEvent): void => {
      if (!e.ctrlKey) return
      e.preventDefault()
      onZoom(e.deltaY < 0 ? 10 : -10)
    }
    root.addEventListener('wheel', onWheel, { passive: false })
    return () => root.removeEventListener('wheel', onWheel)
  }, [root, onZoom])

  // Teclado.
  useEffect(() => {
    if (!root) return
    const onKey = (e: KeyboardEvent): void => {
      const t = e.target as HTMLElement
      if (t.closest('input, select, textarea')) return
      const page = root.clientHeight * 0.9
      const by = (top: number): void => {
        e.preventDefault()
        root.scrollBy({ top, behavior: 'smooth' })
      }
      switch (e.key) {
        case 'ArrowDown':
          return by(100)
        case 'ArrowUp':
          return by(-100)
        case 'PageDown':
          return by(page)
        case 'PageUp':
          return by(-page)
        case ' ':
          return by(e.shiftKey ? -page : page)
        case 'ArrowRight':
          e.preventDefault()
          return onChapterStep(1)
        case 'ArrowLeft':
          e.preventDefault()
          return onChapterStep(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [root, onChapterStep])

  return (
    <div className="reader-scroll" ref={setRoot}>
      <div className="reader-col" style={{ width: `${widthPct}%` }}>
        {ids.map((id, n) => {
          const chapter = order.find((c) => c.id === id)
          if (!chapter) return null
          return (
            <ChapterSection
              key={id}
              chapter={chapter}
              root={root}
              resume={n === 0}
              showTitle={n > 0}
              onPage={onProgress}
              onEnd={handleEnd}
            />
          )
        })}
        {!order.some((c, i) => c.id === ids[ids.length - 1] && order[i + 1]) && (
          <p className="muted center-text pad">Has llegado al último capítulo disponible.</p>
        )}
      </div>
    </div>
  )
}
