import { useEffect, useRef, useState } from 'react'
import type { ChapterFieldsFragment } from '../api/gql/graphql'
import { usePages } from '../hooks/usePages'
import { useReaderStore } from '../store/reader'

const PRELOAD_AHEAD = 3

interface Props {
  chapter: ChapterFieldsFragment
  rtl: boolean
  widthPct: number
  onProgress: (chapterId: number, page: number, total: number) => void
  onFinished: (chapterId: number) => void
  onZoom: (delta: number) => void
  onChapterStep: (dir: 1 | -1) => void
}

/** Modo paginado: una página a la vez, de izquierda a derecha o de derecha a izquierda. */
export default function PagedReader({
  chapter,
  rtl,
  widthPct,
  onProgress,
  onFinished,
  onZoom,
  onChapterStep
}: Props): React.JSX.Element {
  const pages = usePages(chapter.id)
  const urls = pages.data?.urls
  const total = urls?.length ?? 0
  const [picked, setPicked] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const scrollCmd = useReaderStore((s) => s.scrollCmd)

  const initial = chapter.isRead ? 0 : Math.min(chapter.lastPageRead, Math.max(total - 1, 0))
  const page = Math.min(picked ?? initial, Math.max(total - 1, 0))

  const go = (delta: 1 | -1): void => {
    const target = page + delta
    if (target < 0 || target >= total) return onChapterStep(delta)
    setPicked(target)
    box.current?.scrollTo({ top: 0 })
  }
  const goRef = useRef(go)
  useEffect(() => {
    goRef.current = go
  })

  useEffect(() => {
    if (total === 0) return
    onProgress(chapter.id, page, total)
    if (page === total - 1) onFinished(chapter.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, total, chapter.id])

  // Precarga de las páginas siguientes.
  useEffect(() => {
    if (!urls) return
    for (let k = page + 1; k <= page + PRELOAD_AHEAD && k < urls.length; k++)
      new Image().src = urls[k]
  }, [page, urls])

  // Órdenes de scroll externas (atajos globales): pasan de página.
  const lastCmd = useRef(scrollCmd.n)
  useEffect(() => {
    if (scrollCmd.n === lastCmd.current) return
    lastCmd.current = scrollCmd.n
    goRef.current(scrollCmd.dir)
  }, [scrollCmd])

  useEffect(() => {
    const el = box.current
    if (!el) return
    let last = 0
    const onWheel = (e: WheelEvent): void => {
      if (e.ctrlKey) {
        e.preventDefault()
        return onZoom(e.deltaY < 0 ? 10 : -10)
      }
      // Si la página cabe entera, la rueda pasa de página.
      if (el.scrollHeight > el.clientHeight + 1) return
      const now = performance.now()
      if (now - last < 250) return
      last = now
      goRef.current(e.deltaY > 0 ? 1 : -1)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [onZoom])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.target as HTMLElement).closest('input, select, textarea')) return
      const step = (d: 1 | -1): void => {
        e.preventDefault()
        goRef.current(d)
      }
      switch (e.key) {
        case 'ArrowRight':
          return step(rtl ? -1 : 1)
        case 'ArrowLeft':
          return step(rtl ? 1 : -1)
        case 'PageDown':
        case 'ArrowDown':
          return step(1)
        case 'PageUp':
        case 'ArrowUp':
          return step(-1)
        case ' ':
          return step(e.shiftKey ? -1 : 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [rtl])

  const fit = widthPct === 100
  return (
    <div
      className="paged"
      ref={box}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect()
        const left = e.clientX - r.left < r.width / 2
        go(left === rtl ? 1 : -1)
      }}
    >
      {pages.isLoading && <p className="muted center-text pad">Cargando capítulo…</p>}
      {pages.error && (
        <div className="center-text pad">
          <p className="error">{(pages.error as Error).message}</p>
          <button onClick={() => void pages.refetch()}>Reintentar</button>
        </div>
      )}
      {urls && urls[page] && (
        <img
          key={urls[page]}
          src={urls[page]}
          alt={`Página ${page + 1}`}
          draggable={false}
          style={
            fit
              ? { maxWidth: '100%', maxHeight: '100%' }
              : { width: `${widthPct}%`, maxWidth: 'none', maxHeight: 'none' }
          }
        />
      )}
      {total > 0 && (
        <span className="page-counter">
          {page + 1} / {total}
        </span>
      )}
    </div>
  )
}
