import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { gql } from '../api/client'
import { SourcesDocument } from '../api/gql/graphql'
import MangaCard from '../components/MangaCard'
import { useGlobalSearch } from '../hooks/useGlobalSearch'
import { useNav } from '../store/nav'

const STORAGE_KEY = 'search.sources'

function loadSelection(): string[] | null {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : null
  } catch {
    return null
  }
}

const isDefaultLang = (l: string): boolean =>
  l === 'all' || l === 'es' || l === 'en' || l.startsWith('es-') || l.startsWith('en-')

export default function Search({ query }: { query: string }): React.JSX.Element {
  const go = useNav((s) => s.go)
  const [picked, setPicked] = useState<string[] | null>(loadSelection)
  const [pickerOpen, setPickerOpen] = useState(false)
  const sources = useQuery({ queryKey: ['sources'], queryFn: () => gql(SourcesDocument) })

  const all = useMemo(
    () => (sources.data?.sources.nodes ?? []).filter((s) => s.id !== '0'),
    [sources.data]
  )
  // Por defecto: las fuentes instaladas en español e inglés.
  const selected = useMemo(
    () =>
      picked ? all.filter((s) => picked.includes(s.id)) : all.filter((s) => isDefaultLang(s.lang)),
    [all, picked]
  )
  const rows = useGlobalSearch(
    query,
    selected.map((s) => s.id)
  )

  const toggle = (id: string): void => {
    const current = picked ?? selected.map((s) => s.id)
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    setPicked(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* sin almacenamiento: la selección dura solo esta sesión */
    }
  }

  return (
    <div className="pad">
      <h2>Resultados para “{query}”</h2>
      <div className="toolbar">
        <button className="secondary" onClick={() => setPickerOpen((o) => !o)}>
          Fuentes ({selected.length}/{all.length}) {pickerOpen ? '▲' : '▼'}
        </button>
      </div>
      {pickerOpen && (
        <div className="chips picker">
          {all.map((s) => (
            <label key={s.id} className="chip">
              <input
                type="checkbox"
                checked={selected.some((x) => x.id === s.id)}
                onChange={() => toggle(s.id)}
              />{' '}
              {s.displayName} <small>{s.lang}</small>
            </label>
          ))}
        </div>
      )}
      {sources.isLoading && <p className="muted">Cargando fuentes…</p>}
      {all.length > 0 && selected.length === 0 && (
        <p className="muted">No hay fuentes marcadas para buscar.</p>
      )}

      {selected.map((s) => {
        const row = rows[s.id] ?? { status: 'loading' as const }
        return (
          <section key={s.id} className="result-row">
            <h3>
              {s.displayName} <small className="muted">{s.lang}</small>
            </h3>
            {row.status === 'loading' && <p className="muted small">Buscando…</p>}
            {row.status === 'error' && <p className="error small">{row.message}</p>}
            {row.status === 'done' && row.mangas.length === 0 && (
              <p className="muted small">Sin resultados.</p>
            )}
            {row.status === 'done' && row.mangas.length > 0 && (
              <div className="hrow">
                {row.mangas.map((m) => (
                  <MangaCard
                    key={m.id}
                    title={m.title}
                    thumbnailUrl={m.thumbnailUrl}
                    inLibrary={m.inLibrary}
                    onOpen={() => go({ name: 'manga', mangaId: m.id })}
                  />
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
