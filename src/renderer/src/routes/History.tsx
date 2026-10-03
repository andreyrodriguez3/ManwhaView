import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { gql, serverAsset } from '../api/client'
import { HistoryDocument, SetInLibraryDocument } from '../api/gql/graphql'
import { useNav } from '../store/nav'
import { patchSettings, useSettings } from '../store/settings'

const DAY = 86_400_000

/** "Hoy", "Ayer", "Hace N días" (hasta una semana) o la fecha corta. */
function dayLabel(ms: number): string {
  const startOf = (d: Date): number =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const days = Math.round((startOf(new Date()) - startOf(new Date(ms))) / DAY)
  if (days <= 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  if (days < 7) return `Hace ${days} días`
  return new Date(ms).toLocaleDateString('es', {
    day: 'numeric',
    month: 'numeric',
    year: '2-digit'
  })
}

const timeLabel = (ms: number): string =>
  new Date(ms).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true })

export default function History(): React.JSX.Element {
  const qc = useQueryClient()
  const go = useNav((s) => s.go)
  const hidden = useSettings((s) => s.settings.history.hidden)
  const [text, setText] = useState('')
  const [searching, setSearching] = useState(false)

  const history = useQuery({
    queryKey: ['history'],
    queryFn: () => gql(HistoryDocument).then((r) => r.chapters.nodes),
    refetchOnMount: 'always'
  })

  const addToLibrary = useMutation({
    mutationFn: (id: number) => gql(SetInLibraryDocument, { id, inLibrary: true }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['history'] })
      void qc.invalidateQueries({ queryKey: ['library'] })
    }
  })

  const rows = history.data

  // Entradas visibles (las quitadas solo vuelven si se lee de nuevo), una por obra: la más reciente.
  const entries = useMemo(() => {
    const q = text.trim().toLowerCase()
    const seen = new Set<number>()
    const out: NonNullable<typeof rows> = []
    for (const c of rows ?? []) {
      if (Number(c.lastReadAt) <= (hidden[String(c.id)] ?? 0)) continue
      if (seen.has(c.mangaId)) continue
      seen.add(c.mangaId)
      if (q && !c.manga.title.toLowerCase().includes(q)) continue
      out.push(c)
    }
    return out
  }, [rows, hidden, text])

  const hideManga = (mangaId: number): void => {
    const next = { ...hidden }
    for (const c of history.data ?? [])
      if (c.mangaId === mangaId) next[String(c.id)] = Number(c.lastReadAt)
    patchSettings('history', { hidden: next })
  }
  const hideAll = (): void => {
    if (
      !window.confirm('¿Borrar todo el historial de esta app? Las obras y el progreso no se tocan.')
    )
      return
    const next = { ...hidden }
    for (const c of history.data ?? []) next[String(c.id)] = Number(c.lastReadAt)
    patchSettings('history', { hidden: next })
  }

  let lastDay = ''
  return (
    <div className="pad">
      <div className="toolbar">
        <h2 style={{ margin: 0 }} className="grow">
          Historial
        </h2>
        <button className="secondary" title="Buscar" onClick={() => setSearching((s) => !s)}>
          🔍
        </button>
        <button
          className="secondary"
          title="Borrar todo el historial"
          disabled={entries.length === 0}
          onClick={hideAll}
        >
          🗑
        </button>
      </div>
      {searching && (
        <input
          autoFocus
          style={{ width: '100%', marginBottom: '0.6rem' }}
          placeholder="Buscar en el historial…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )}

      {history.error && <p className="error">{(history.error as Error).message}</p>}
      {history.isLoading && <p className="muted">Cargando…</p>}
      {history.data && entries.length === 0 && (
        <p className="muted">
          {text ? 'Nada coincide con la búsqueda.' : 'Todavía no has leído nada en esta app.'}
        </p>
      )}

      <ul className="ext-list">
        {entries.map((c) => {
          const ms = Number(c.lastReadAt) * 1000
          const label = dayLabel(ms)
          const header = label !== lastDay
          lastDay = label
          return (
            <li key={c.mangaId} style={{ listStyle: 'none' }}>
              {header && <h3 className="day-label">{label}</h3>}
              <div
                className="ext clickable"
                onClick={() => go({ name: 'reader', mangaId: c.mangaId, chapterId: c.id })}
              >
                {c.manga.thumbnailUrl ? (
                  <img
                    className="hist-cover"
                    src={serverAsset(c.manga.thumbnailUrl)}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <div className="hist-cover" />
                )}
                <div className="grow">
                  <strong>{c.manga.title}</strong>
                  <div className="muted small">
                    Cap. {c.chapterNumber} - {timeLabel(ms)}
                  </div>
                </div>
                {!c.manga.inLibrary && (
                  <button
                    className="icon"
                    title="Añadir a la biblioteca"
                    onClick={(e) => {
                      e.stopPropagation()
                      addToLibrary.mutate(c.mangaId)
                    }}
                  >
                    ♡
                  </button>
                )}
                <button
                  className="icon"
                  title="Quitar del historial"
                  onClick={(e) => {
                    e.stopPropagation()
                    hideManga(c.mangaId)
                  }}
                >
                  🗑
                </button>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
