import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { gql, serverAsset } from '../api/client'
import {
  FetchMangaAndChaptersDocument,
  MangaChaptersDocument,
  MangaDetailDocument,
  SetInLibraryDocument,
  UpdateChapterDocument,
  type ChapterFieldsFragment,
  type MangaStatus
} from '../api/gql/graphql'
import TrackingPanel from '../components/TrackingPanel'
import { useNav } from '../store/nav'

const STATUS: Record<MangaStatus, string> = {
  UNKNOWN: 'Desconocido',
  ONGOING: 'En emisión',
  COMPLETED: 'Completado',
  LICENSED: 'Licenciado',
  PUBLISHING_FINISHED: 'Publicación finalizada',
  CANCELLED: 'Cancelado',
  ON_HIATUS: 'En pausa'
}

const fmtDate = (ms: string): string => {
  const n = Number(ms)
  return n > 0 ? new Date(n).toLocaleDateString('es') : ''
}

export default function Manga({ mangaId }: { mangaId: number }): React.JSX.Element {
  const qc = useQueryClient()
  const go = useNav((s) => s.go)
  const [newestFirst, setNewestFirst] = useState(true)

  const detail = useQuery({
    queryKey: ['manga', mangaId],
    queryFn: () => gql(MangaDetailDocument, { id: mangaId }).then((r) => r.manga)
  })
  const chapters = useQuery({
    queryKey: ['chapters', mangaId],
    queryFn: () => gql(MangaChaptersDocument, { mangaId }).then((r) => r.chapters.nodes)
  })

  // Al abrir el detalle se piden a la fuente los datos y capítulos actualizados.
  const refresh = useMutation({
    mutationFn: () => gql(FetchMangaAndChaptersDocument, { id: mangaId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['manga', mangaId] })
      void qc.invalidateQueries({ queryKey: ['chapters', mangaId] })
    }
  })
  const { mutate: refreshNow } = refresh
  useEffect(() => {
    refreshNow()
  }, [mangaId, refreshNow])

  const toggleLibrary = useMutation({
    mutationFn: (inLibrary: boolean) => gql(SetInLibraryDocument, { id: mangaId, inLibrary }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['manga', mangaId] })
      void qc.invalidateQueries({ queryKey: ['library'] })
    }
  })
  const markRead = useMutation({
    mutationFn: (v: { id: number; isRead: boolean }) =>
      gql(UpdateChapterDocument, { id: v.id, patch: { isRead: v.isRead } }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['chapters', mangaId] })
      void qc.invalidateQueries({ queryKey: ['manga', mangaId] })
      void qc.invalidateQueries({ queryKey: ['library'] })
    }
  })

  const list = useMemo(() => {
    const items = [...(chapters.data ?? [])]
    items.sort(
      (a, b) =>
        (newestFirst ? -1 : 1) *
        (a.chapterNumber - b.chapterNumber || b.sourceOrder - a.sourceOrder)
    )
    return items
  }, [chapters.data, newestFirst])

  const m = detail.data
  if (detail.isLoading) return <p className="muted pad">Cargando…</p>
  if (detail.error || !m)
    return <p className="error pad">{(detail.error as Error | null)?.message ?? 'No encontrado'}</p>

  // "Siguiente" = primer capítulo sin leer en orden de lectura (número ascendente).
  const inReadingOrder = [...list].sort(
    (a, b) => a.chapterNumber - b.chapterNumber || b.sourceOrder - a.sourceOrder
  )
  const next: ChapterFieldsFragment | undefined =
    inReadingOrder.find((c) => !c.isRead) ?? inReadingOrder[0]
  const started = inReadingOrder.some((c) => c.isRead || c.lastPageRead > 0)
  const read = (c: ChapterFieldsFragment): void => go({ name: 'reader', mangaId, chapterId: c.id })

  return (
    <div className="pad">
      <div className="detail">
        {m.thumbnailUrl && (
          <img className="detail-cover" src={serverAsset(m.thumbnailUrl)} alt="" />
        )}
        <div className="grow">
          <h2 style={{ marginTop: 0 }}>{m.title}</h2>
          <div className="muted small">
            {[m.author, m.artist !== m.author ? m.artist : null].filter(Boolean).join(' · ')}
          </div>
          <div className="muted small">
            {STATUS[m.status]}
            {m.source ? ` · ${m.source.displayName}` : ''}
          </div>
          <div className="chips genres">
            {m.genre.map((g) => (
              <span className="chip small" key={g}>
                {g}
              </span>
            ))}
          </div>
          <div className="row" style={{ marginTop: '0.6rem' }}>
            <button disabled={!next} onClick={() => next && read(next)}>
              {started ? '▶ Continuar' : '▶ Empezar'}
            </button>
            <button
              className="secondary"
              disabled={toggleLibrary.isPending}
              onClick={() => toggleLibrary.mutate(!m.inLibrary)}
            >
              {m.inLibrary ? '✓ En la biblioteca (quitar)' : '＋ Añadir a la biblioteca'}
            </button>
            {m.realUrl && (
              <button className="secondary" onClick={() => window.open(m.realUrl!)}>
                Abrir en el navegador
              </button>
            )}
          </div>
        </div>
      </div>

      {m.description && <p className="desc">{m.description}</p>}

      <TrackingPanel mangaId={mangaId} title={m.title} />

      <div className="toolbar" style={{ marginTop: '1rem' }}>
        <h3 style={{ margin: 0 }} className="grow">
          Capítulos ({list.length})
          {refresh.isPending && <small className="muted"> · actualizando…</small>}
        </h3>
        <button className="secondary" onClick={() => setNewestFirst((v) => !v)}>
          {newestFirst ? 'Más recientes primero ↓' : 'Más antiguos primero ↑'}
        </button>
      </div>
      {refresh.error && <p className="error">{(refresh.error as Error).message}</p>}
      {chapters.isLoading && <p className="muted">Cargando capítulos…</p>}
      {chapters.data && list.length === 0 && !refresh.isPending && (
        <p className="muted">La fuente no devolvió capítulos.</p>
      )}
      <ul className="ext-list">
        {list.map((c) => (
          <li
            key={c.id}
            className={c.isRead ? 'ext chapter read clickable' : 'ext chapter clickable'}
            onClick={() => read(c)}
          >
            <div className="grow">
              <div>{c.name}</div>
              <div className="muted small">
                {[fmtDate(c.uploadDate), c.scanlator].filter(Boolean).join(' · ')}
                {!c.isRead && c.lastPageRead > 0 ? ` · página ${c.lastPageRead + 1}` : ''}
              </div>
            </div>
            <button
              className="secondary"
              title={c.isRead ? 'Marcar como no leído' : 'Marcar como leído'}
              onClick={(e) => {
                e.stopPropagation()
                markRead.mutate({ id: c.id, isRead: !c.isRead })
              }}
            >
              {c.isRead ? '✓ Leído' : 'No leído'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
