import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { gql, serverAsset } from '../api/client'
import {
  BindTrackDocument,
  MangaTrackRecordsDocument,
  SearchTrackerDocument,
  TrackProgressDocument,
  TrackersDocument,
  UnbindTrackDocument,
  UpdateTrackDocument,
  type TrackerFieldsFragment
} from '../api/gql/graphql'

/** Seguimiento de una obra: vincular con AniList/MAL, estado y progreso. */
export default function TrackingPanel({
  mangaId,
  title
}: {
  mangaId: number
  title: string
}): React.JSX.Element | null {
  const qc = useQueryClient()
  const trackers = useQuery({ queryKey: ['trackers'], queryFn: () => gql(TrackersDocument) })
  const records = useQuery({
    queryKey: ['trackRecords', mangaId],
    queryFn: () =>
      gql(MangaTrackRecordsDocument, { mangaId }).then((r) => r.manga.trackRecords.nodes)
  })
  const [binding, setBinding] = useState<TrackerFieldsFragment | null>(null)

  const refresh = (): void => void qc.invalidateQueries({ queryKey: ['trackRecords', mangaId] })
  const unbind = useMutation({
    mutationFn: (recordId: number) => gql(UnbindTrackDocument, { recordId }),
    onSuccess: refresh
  })
  const setStatus = useMutation({
    mutationFn: (v: { recordId: number; status: number }) => gql(UpdateTrackDocument, v),
    onSuccess: refresh
  })
  const sync = useMutation({
    mutationFn: () => gql(TrackProgressDocument, { mangaId }),
    onSuccess: refresh
  })

  const active = (trackers.data?.trackers.nodes ?? []).filter((t) => t.isLoggedIn)
  if (trackers.isLoading || active.length === 0) return null

  const error = (records.error ?? unbind.error ?? setStatus.error ?? sync.error) as Error | null

  return (
    <section>
      <div className="toolbar" style={{ marginTop: '1rem' }}>
        <h3 style={{ margin: 0 }} className="grow">
          Seguimiento
        </h3>
        {(records.data?.length ?? 0) > 0 && (
          <button className="secondary" onClick={() => sync.mutate()} disabled={sync.isPending}>
            {sync.isPending ? 'Sincronizando…' : '↻ Sincronizar progreso'}
          </button>
        )}
      </div>
      {error && <p className="error">{error.message}</p>}
      <ul className="ext-list">
        {active.map((t) => {
          const rec = records.data?.find((r) => r.trackerId === t.id)
          return (
            <li className="ext" key={t.id} style={{ flexWrap: 'wrap' }}>
              <img src={serverAsset(t.icon)} alt="" width={28} height={28} />
              <div className="grow">
                <strong>{t.name}</strong>
                {rec ? (
                  <div className="muted small">
                    <a href={rec.remoteUrl} target="_blank" rel="noreferrer">
                      {rec.title}
                    </a>{' '}
                    · capítulo {rec.lastChapterRead}
                    {rec.totalChapters ? ` de ${rec.totalChapters}` : ''}
                    {rec.displayScore ? ` · nota ${rec.displayScore}` : ''}
                  </div>
                ) : (
                  <div className="muted small">Sin vincular</div>
                )}
              </div>
              {rec ? (
                <>
                  <select
                    value={rec.status}
                    onChange={(e) =>
                      setStatus.mutate({ recordId: rec.id, status: Number(e.target.value) })
                    }
                  >
                    {t.statuses.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <button className="secondary" onClick={() => unbind.mutate(rec.id)}>
                    Desvincular
                  </button>
                </>
              ) : (
                <button onClick={() => setBinding(binding?.id === t.id ? null : t)}>
                  Vincular
                </button>
              )}
              {binding?.id === t.id && (
                <BindSearch
                  mangaId={mangaId}
                  tracker={t}
                  initial={title}
                  onDone={() => {
                    setBinding(null)
                    refresh()
                  }}
                />
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function BindSearch({
  mangaId,
  tracker,
  initial,
  onDone
}: {
  mangaId: number
  tracker: TrackerFieldsFragment
  initial: string
  onDone: () => void
}): React.JSX.Element {
  const [text, setText] = useState(initial)
  const [query, setQuery] = useState(initial)
  const results = useQuery({
    queryKey: ['trackerSearch', tracker.id, query],
    queryFn: () =>
      gql(SearchTrackerDocument, { trackerId: tracker.id, query }).then(
        (r) => r.searchTracker.trackSearches
      )
  })
  const bind = useMutation({
    mutationFn: (remoteId: string) =>
      gql(BindTrackDocument, { mangaId, trackerId: tracker.id, remoteId }),
    onSuccess: onDone
  })

  return (
    <div style={{ width: '100%' }}>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          setQuery(text.trim())
        }}
      >
        <input className="grow" value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit">Buscar</button>
      </form>
      {results.isLoading && <p className="muted small">Buscando…</p>}
      {(results.error || bind.error) && (
        <p className="error small">{((results.error ?? bind.error) as Error).message}</p>
      )}
      {results.data?.length === 0 && <p className="muted small">Sin resultados.</p>}
      <ul className="ext-list" style={{ marginTop: '0.4rem' }}>
        {(results.data ?? []).map((r) => (
          <li
            className="ext clickable"
            key={r.remoteId}
            onClick={() => !bind.isPending && bind.mutate(r.remoteId)}
          >
            {r.coverUrl && <img src={r.coverUrl} alt="" width={36} height={50} />}
            <div className="grow">
              <strong>{r.title}</strong>
              <div className="muted small">
                {[
                  r.publishingType,
                  r.publishingStatus,
                  r.totalChapters ? `${r.totalChapters} cap.` : ''
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
