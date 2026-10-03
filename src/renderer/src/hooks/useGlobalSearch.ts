import { useEffect, useReducer } from 'react'
import { gql } from '../api/client'
import { FetchSourceMangaDocument, type MangaCardFragment } from '../api/gql/graphql'

export type RowState =
  | { status: 'loading' }
  | { status: 'done'; mangas: MangaCardFragment[] }
  | { status: 'error'; message: string }

const MAX_PARALLEL = 3

type Action = { id: string; row: RowState } | { reset: string[] }

function reducer(state: Record<string, RowState>, a: Action): Record<string, RowState> {
  if ('reset' in a) return Object.fromEntries(a.reset.map((id) => [id, { status: 'loading' }]))
  return { ...state, [a.id]: a.row }
}

/**
 * Busca `query` en cada fuente, como mucho MAX_PARALLEL a la vez. Cada fuente informa de su
 * propio resultado o error sin bloquear a las demás.
 */
export function useGlobalSearch(query: string, sourceIds: string[]): Record<string, RowState> {
  const [rows, dispatch] = useReducer(reducer, {})
  const key = sourceIds.join(',')

  useEffect(() => {
    const ids = key ? key.split(',') : []
    let cancelled = false
    dispatch({ reset: ids })
    const queue = [...ids]
    const worker = async (): Promise<void> => {
      for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
        try {
          const r = await gql(FetchSourceMangaDocument, {
            source: id,
            type: 'SEARCH',
            page: 1,
            query
          })
          if (!r.fetchSourceManga) throw new Error('La fuente no devolvió resultados')
          if (!cancelled)
            dispatch({ id, row: { status: 'done', mangas: r.fetchSourceManga.mangas } })
        } catch (e) {
          if (!cancelled) dispatch({ id, row: { status: 'error', message: (e as Error).message } })
        }
      }
    }
    for (let i = 0; i < Math.min(MAX_PARALLEL, ids.length); i++) void worker()
    return () => {
      cancelled = true
      queue.length = 0
    }
  }, [query, key])

  return rows
}
