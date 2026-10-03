export type Lang = 'es-en' | 'es' | 'en' | 'all'

export const LANGS: Record<Lang, { label: string; match: (l: string) => boolean }> = {
  'es-en': {
    label: 'Español + Inglés',
    match: (l) => ['es', 'en', 'all'].includes(l) || l.startsWith('es-') || l.startsWith('en-')
  },
  es: { label: 'Español', match: (l) => l === 'es' || l.startsWith('es-') },
  en: { label: 'Inglés', match: (l) => l === 'en' || l.startsWith('en-') },
  all: { label: 'Todos los idiomas', match: () => true }
}
