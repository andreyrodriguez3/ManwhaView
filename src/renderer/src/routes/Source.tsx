import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { gql } from '../api/client'
import { FetchSourceMangaDocument } from '../api/gql/graphql'
import MangaCard from '../components/MangaCard'
import { useSentinel } from '../hooks/useSentinel'
import { useNav } from '../store/nav'

type Mode = 'POPULAR' | 'LATEST' | 'SEARCH'

export default function Source({
  sourceId,
  sourceName,
  supportsLatest
}: {
  sourceId: string
  sourceName: string
  supportsLatest: boolean
}): React.JSX.Element {
  const go = useNav((s) => s.go)
  const [mode, setMode] = useState<Mode>('POPULAR')
  const [text, setText] = useState('')
  const [query, setQuery] = useState('')

  const list = useInfiniteQuery({
    queryKey: ['source', sourceId, mode, mode === 'SEARCH' ? query : ''],
    initialPageParam: 1,
    enabled: mode !== 'SEARCH' || query.length > 0,
    queryFn: ({ pageParam }) =>
      gql(FetchSourceMangaDocument, {
        source: sourceId,
        type: mode,
        page: pageParam,
        query: mode === 'SEARCH' ? query : null
      }).then((r) => {
        if (!r.fetchSourceManga) throw new Error('La fuente no devolvió resultados')
        return r.fetchSourceManga
      }),
    getNextPageParam: (last, all) => (last.hasNextPage ? all.length + 1 : undefined),
    staleTime: 5 * 60_000
  })

  const sentinel = useSentinel(
    () => void list.fetchNextPage(),
    !!list.hasNextPage && !list.isFetchingNextPage
  )

  // Una misma obra puede repetirse entre páginas: se quita por id.
  const seen = new Set<number>()
  const mangas = (list.data?.pages ?? [])
    .flatMap((p) => p.mangas)
    .filter((m) => !seen.has(m.id) && !!seen.add(m.id))

  const tabs: [Mode, string][] = [['POPULAR', 'Populares']]
  if (supportsLatest) tabs.push(['LATEST', 'Recientes'])

  return (
    <div className="pad">
      <h2>{sourceName}</h2>
      <div className="toolbar">
        {tabs.map(([m, label]) => (
          <button key={m} className={mode === m ? '' : 'secondary'} onClick={() => setMode(m)}>
            {label}
          </button>
        ))}
        <form
          className="row grow"
          onSubmit={(e) => {
            e.preventDefault()
            if (text.trim()) {
              setQuery(text.trim())
              setMode('SEARCH')
            }
          }}
        >
          <input
            className="grow"
            placeholder={`Buscar en ${sourceName}…`}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button type="submit">Buscar</button>
        </form>
      </div>

      {list.error && (
        <p className="error">
          {(list.error as Error).message}{' '}
          <button className="secondary" onClick={() => void list.refetch()}>
            Reintentar
          </button>
        </p>
      )}
      {list.isLoading && <p className="muted">Cargando…</p>}
      {list.data && mangas.length === 0 && <p className="muted">Sin resultados.</p>}

      <div className="grid">
        {mangas.map((m) => (
          <MangaCard
            key={m.id}
            title={m.title}
            thumbnailUrl={m.thumbnailUrl}
            inLibrary={m.inLibrary}
            onOpen={() => go({ name: 'manga', mangaId: m.id })}
          />
        ))}
      </div>
      <div ref={sentinel} style={{ height: 1 }} />
      {list.isFetchingNextPage && <p className="muted center-text">Cargando más…</p>}
    </div>
  )
}
