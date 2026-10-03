import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { gql } from '../api/client'
import {
  MangaChaptersDocument,
  MangaDetailDocument,
  UpdateChapterDocument
} from '../api/gql/graphql'
import type { ReaderMode } from '../../../shared/ipc'
import PagedReader from '../components/PagedReader'
import VerticalReader from '../components/VerticalReader'
import { useNav } from '../store/nav'
import { useReaderStore } from '../store/reader'
import { patchSettings, useSettings } from '../store/settings'
import { useWin } from '../store/win'

const HIDE_BAR_MS = 2500

export default function Reader({
  mangaId,
  chapterId
}: {
  mangaId: number
  chapterId: number
}): React.JSX.Element {
  const qc = useQueryClient()
  const { back, replace } = useNav()
  const reader = useSettings((s) => s.settings.reader)
  const mode: ReaderMode = reader.modes[String(mangaId)] ?? 'vertical'
  const autoScroll = useReaderStore((s) => s.autoScroll)
  const ghost = useWin((s) => s.ghost)

  const manga = useQuery({
    queryKey: ['manga', mangaId],
    queryFn: () => gql(MangaDetailDocument, { id: mangaId }).then((r) => r.manga)
  })
  const chapters = useQuery({
    queryKey: ['chapters', mangaId],
    queryFn: () => gql(MangaChaptersDocument, { mangaId }).then((r) => r.chapters.nodes),
    refetchOnMount: 'always'
  })
  // Hasta tener el progreso actual no se muestra nada: si no, se guardaría una página vieja.
  const fresh = chapters.isFetchedAfterMount
  // Orden de lectura: número de capítulo ascendente.
  const order = useMemo(
    () =>
      [...(chapters.data ?? [])].sort(
        (a, b) => a.chapterNumber - b.chapterNumber || b.sourceOrder - a.sourceOrder
      ),
    [chapters.data]
  )

  const [activeId, setActiveId] = useState(chapterId)
  const active = order.find((c) => c.id === activeId)
  const start = order.find((c) => c.id === chapterId)

  // --- Progreso: se guarda la última página (con debounce) y se marca como leído al final. ---
  const save = useMutation({
    mutationFn: (v: { id: number; patch: { lastPageRead?: number; isRead?: boolean } }) =>
      gql(UpdateChapterDocument, v)
  })
  const { mutate: saveChapter } = save
  const pending = useRef<{ id: number; page: number } | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const done = useRef(new Set<number>())

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const p = pending.current
    pending.current = null
    if (p) saveChapter({ id: p.id, patch: { lastPageRead: p.page } })
  }, [saveChapter])

  const onProgress = useCallback(
    (id: number, page: number) => {
      setActiveId(id)
      if (done.current.has(id)) return
      pending.current = { id, page }
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, 1000)
    },
    [flush]
  )
  const onFinished = useCallback(
    (id: number) => {
      if (done.current.has(id)) return
      done.current.add(id)
      if (pending.current?.id === id) pending.current = null
      saveChapter({ id, patch: { isRead: true } })
    },
    [saveChapter]
  )

  useEffect(
    () => () => {
      flush()
      // Refresca las pantallas que muestran el progreso.
      setTimeout(() => {
        void qc.invalidateQueries({ queryKey: ['library'] })
        void qc.invalidateQueries({ queryKey: ['chapters', mangaId] })
        void qc.invalidateQueries({ queryKey: ['manga', mangaId] })
      }, 500)
    },
    [flush, qc, mangaId]
  )

  const stepChapter = useCallback(
    (dir: 1 | -1) => {
      const i = order.findIndex((c) => c.id === activeId)
      const target = order[i + dir]
      if (!target) return
      flush()
      replace({ name: 'reader', mangaId, chapterId: target.id })
    },
    [order, activeId, flush, replace, mangaId]
  )

  const onZoom = useCallback((delta: number) => {
    const cur = useSettings.getState().settings.reader.widthPct
    patchSettings('reader', { widthPct: Math.min(300, Math.max(30, cur + delta)) })
  }, [])

  // --- Barra: se oculta sola mientras se lee. ---
  const [barVisible, setBarVisible] = useState(true)
  const hovering = useRef(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const poke = useCallback(() => {
    setBarVisible(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => {
      if (!hovering.current) setBarVisible(false)
    }, HIDE_BAR_MS)
  }, [])
  useEffect(() => {
    const t = setTimeout(poke, 0)
    return () => {
      clearTimeout(t)
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [poke])
  useEffect(() => () => useReaderStore.getState().setAutoScroll(false), [])

  const setMode = (m: ReaderMode): void =>
    patchSettings('reader', { modes: { ...reader.modes, [String(mangaId)]: m } })

  const idx = order.findIndex((c) => c.id === activeId)

  return (
    <div className="reader" onMouseMove={poke} onTouchStart={poke}>
      <div
        className={barVisible && !ghost ? 'reader-bar' : 'reader-bar hidden'}
        onMouseEnter={() => {
          hovering.current = true
          setBarVisible(true)
        }}
        onMouseLeave={() => {
          hovering.current = false
          poke()
        }}
      >
        <button className="secondary" onClick={back} title="Volver al detalle">
          ←
        </button>
        <div className="grow reader-title">
          <strong>{manga.data?.title ?? '…'}</strong>
          <div className="muted small">{active?.name ?? ''}</div>
        </div>
        <button
          className="secondary"
          disabled={idx <= 0}
          onClick={() => stepChapter(-1)}
          title="Capítulo anterior (←)"
        >
          ‹
        </button>
        <select
          value={activeId}
          onChange={(e) => {
            flush()
            replace({ name: 'reader', mangaId, chapterId: Number(e.target.value) })
          }}
          title="Capítulos"
        >
          {[...order].reverse().map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.isRead ? ' ✓' : ''}
            </option>
          ))}
        </select>
        <button
          className="secondary"
          disabled={idx < 0 || idx >= order.length - 1}
          onClick={() => stepChapter(1)}
          title="Capítulo siguiente (→)"
        >
          ›
        </button>
        <select value={mode} onChange={(e) => setMode(e.target.value as ReaderMode)} title="Modo">
          <option value="vertical">Vertical continuo</option>
          <option value="ltr">Paginado → (izq. a der.)</option>
          <option value="rtl">Paginado ← (der. a izq.)</option>
        </select>
        <button
          className={autoScroll ? '' : 'secondary'}
          disabled={mode !== 'vertical'}
          onClick={() => useReaderStore.getState().toggleAutoScroll()}
          title="Auto-scroll"
        >
          {autoScroll ? '⏸' : '▶'}
        </button>
        <input
          type="range"
          min={20}
          max={600}
          step={10}
          value={reader.speed}
          onChange={(e) => patchSettings('reader', { speed: Number(e.target.value) })}
          title={`Velocidad: ${reader.speed} px/s`}
        />
        <select
          value={reader.widthPct}
          onChange={(e) => patchSettings('reader', { widthPct: Number(e.target.value) })}
          title="Ancho (Ctrl + rueda)"
        >
          {[...new Set([30, 50, 70, 100, 120, 150, 200, 300, reader.widthPct])]
            .sort((a, b) => a - b)
            .map((w) => (
              <option key={w} value={w}>
                {w === 100 ? 'Ajustar a la ventana' : `${w}%`}
              </option>
            ))}
        </select>
      </div>

      {!fresh && !chapters.error && <p className="muted center-text pad">Cargando…</p>}
      {fresh && !start && <p className="error pad">No se encontró el capítulo.</p>}
      {fresh && start && mode === 'vertical' && (
        <VerticalReader
          order={order}
          startId={chapterId}
          widthPct={reader.widthPct}
          speed={reader.speed}
          onProgress={onProgress}
          onFinished={onFinished}
          onZoom={onZoom}
          onChapterStep={stepChapter}
        />
      )}
      {fresh && start && mode !== 'vertical' && (
        <PagedReader
          chapter={start}
          rtl={mode === 'rtl'}
          widthPct={reader.widthPct}
          onProgress={onProgress}
          onFinished={onFinished}
          onZoom={onZoom}
          onChapterStep={stepChapter}
        />
      )}
    </div>
  )
}
