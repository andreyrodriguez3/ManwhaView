import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { gql, serverAsset } from '../api/client'
import { FetchChapterPagesDocument, type ChapterFieldsFragment } from '../api/gql/graphql'

/** Páginas (URLs absolutas) de un capítulo, pedidas a la fuente a través del motor. */
export function usePages(
  chapterId: number
): UseQueryResult<{ urls: string[]; chapter: ChapterFieldsFragment }> {
  return useQuery({
    queryKey: ['pages', chapterId],
    queryFn: async () => {
      const r = await gql(FetchChapterPagesDocument, { chapterId })
      if (!r.fetchChapterPages) throw new Error('La fuente no devolvió páginas')
      return {
        urls: r.fetchChapterPages.pages.map(serverAsset),
        chapter: r.fetchChapterPages.chapter
      }
    },
    staleTime: 10 * 60_000
  })
}
