import { useSettings } from '../store/settings'

/** Géneros que las fuentes usan para marcar contenido para adultos (en minúsculas). */
const ADULT_GENRES = [
  'adult',
  'hentai',
  'smut',
  'erotica',
  'erotic',
  'pornographic',
  'porn',
  '+18',
  '18+',
  'adulto',
  'erótico',
  'erotico'
]

export const isAdultManga = (genres: readonly string[]): boolean =>
  genres.some((g) => ADULT_GENRES.includes(g.trim().toLowerCase()))

/** Verdadero si el ajuste "Ocultar contenido +18" está activo. */
export const useHideAdult = (): boolean => useSettings((s) => s.settings.content.hideAdult)

/** Verdadero si una fuente o extensión con esa advertencia debe ocultarse según los ajustes. */
export function useIsBlocked(): (warning: string) => boolean {
  const { hideAdult, hideMixed } = useSettings((s) => s.settings.content)
  return (warning) => hideAdult && (warning === 'NSFW' || (hideMixed && warning === 'MIXED'))
}
