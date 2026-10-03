import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { gql } from '../api/client'
import {
  CategoriesDocument,
  LibraryMangaDocument,
  LibraryUpdateStatusDocument,
  UpdateLibraryDocument
} from '../api/gql/graphql'
import MangaCard from '../components/MangaCard'
import { useNav } from '../store/nav'

type Sort = 'recent' | 'unread' | 'az'

export default function Library(): React.JSX.Element {
  const qc = useQueryClient()
  const go = useNav((s) => s.go)
  const [category, setCategory] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [sort, setSort] = useState<Sort>('recent')

  const library = useQuery({
    queryKey: ['library'],
    queryFn: () => gql(LibraryMangaDocument).then((r) => r.mangas.nodes)
  })
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () =>
      gql(CategoriesDocument).then((r) => r.categories.nodes.filter((c) => !c.isDefaultCategory))
  })

  const start = useMutation({ mutationFn: () => gql(UpdateLibraryDocument) })
  // La clave incluye el instante del envío: cada actualización consulta un estado nuevo.
  const status = useQuery({
    queryKey: ['libraryUpdateStatus', start.submittedAt],
    queryFn: async () => {
      const info = await gql(LibraryUpdateStatusDocument).then(
        (r) => r.libraryUpdateStatus.jobsInfo
      )
      if (!info.isRunning) void qc.invalidateQueries({ queryKey: ['library'] })
      return info
    },
    enabled: start.isSuccess,
    refetchInterval: (q) => (q.state.data?.isRunning === false ? false : 1500),
    gcTime: 0
  })
  const info = status.data
  const updating = start.isPending || (start.isSuccess && info?.isRunning !== false)

  const shown = useMemo(() => {
    const q = text.trim().toLowerCase()
    const items = (library.data ?? []).filter(
      (m) =>
        (!q || m.title.toLowerCase().includes(q)) &&
        (category === null || m.categories.nodes.some((c) => c.id === category))
    )
    const lastRead = (m: (typeof items)[number]): number =>
      Number(m.lastReadChapter?.lastReadAt ?? 0)
    items.sort((a, b) => {
      if (sort === 'az') return a.title.localeCompare(b.title, 'es')
      if (sort === 'unread')
        return b.unreadCount - a.unreadCount || a.title.localeCompare(b.title, 'es')
      return lastRead(b) - lastRead(a) || a.title.localeCompare(b.title, 'es')
    })
    return items
  }, [library.data, text, category, sort])

  const error = (library.error ?? categories.error ?? start.error) as Error | null
  const catList = categories.data ?? []

  return (
    <div className="pad">
      <div className="toolbar">
        <input
          placeholder="Filtrar la biblioteca…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
          <option value="recent">Última lectura</option>
          <option value="unread">Sin leer</option>
          <option value="az">A-Z</option>
        </select>
        <button onClick={() => start.mutate()} disabled={updating || start.isPending}>
          {updating
            ? `Buscando… ${info ? `${info.finishedJobs}/${info.totalJobs}` : ''}`
            : '↻ Buscar capítulos nuevos'}
        </button>
      </div>

      {catList.length > 0 && (
        <div className="toolbar">
          <button
            className={category === null ? 'tab active' : 'tab'}
            onClick={() => setCategory(null)}
          >
            Todas
          </button>
          {catList.map((c) => (
            <button
              key={c.id}
              className={category === c.id ? 'tab active' : 'tab'}
              onClick={() => setCategory(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {error && <p className="error">{error.message}</p>}
      {library.isLoading && <p className="muted">Cargando…</p>}
      {library.data && library.data.length === 0 && (
        <p className="muted">
          La biblioteca está vacía. Busca un manhwa en Explorar y pulsa “Añadir a la biblioteca”, o
          importa una copia de Mihon en Ajustes.
        </p>
      )}
      {library.data && library.data.length > 0 && shown.length === 0 && (
        <p className="muted">Nada coincide con el filtro.</p>
      )}

      <div className="grid">
        {shown.map((m) => {
          const next = m.firstUnreadChapter?.id
          return (
            <MangaCard
              key={m.id}
              title={m.title}
              thumbnailUrl={m.thumbnailUrl}
              unread={m.unreadCount}
              onOpen={() => go({ name: 'manga', mangaId: m.id })}
              onContinue={
                next !== undefined
                  ? () => go({ name: 'reader', mangaId: m.id, chapterId: next })
                  : undefined
              }
            />
          )
        })}
      </div>
    </div>
  )
}
