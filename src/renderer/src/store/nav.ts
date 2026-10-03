import { create } from 'zustand'

export type View =
  | { name: 'library' }
  | { name: 'history' }
  | { name: 'browse' }
  | { name: 'search'; query: string }
  | { name: 'source'; sourceId: string; sourceName: string; supportsLatest: boolean }
  | { name: 'manga'; mangaId: number }
  | { name: 'reader'; mangaId: number; chapterId: number }
  | { name: 'extensions' }
  | { name: 'settings' }

/** Pestañas de primer nivel: al cambiar de una a otra se reinicia el historial. */
export type TabName = 'library' | 'history' | 'browse' | 'extensions' | 'settings'

interface Nav {
  stack: View[]
  view: View
  go: (v: View) => void
  replace: (v: View) => void
  back: () => void
  tab: (t: TabName) => void
}

export const useNav = create<Nav>((set) => ({
  stack: [{ name: 'library' }],
  view: { name: 'library' },
  go: (v) => set((s) => ({ stack: [...s.stack, v], view: v })),
  replace: (v) => set((s) => ({ stack: [...s.stack.slice(0, -1), v], view: v })),
  back: () =>
    set((s) => {
      if (s.stack.length < 2) return s
      const stack = s.stack.slice(0, -1)
      return { stack, view: stack[stack.length - 1] }
    }),
  tab: (t) => set({ stack: [{ name: t }], view: { name: t } })
}))

/** Pestaña de primer nivel a la que pertenece la vista actual (la base del historial). */
export const baseTab = (stack: View[]): TabName => {
  const n = stack[0].name
  return n === 'library' ||
    n === 'history' ||
    n === 'browse' ||
    n === 'extensions' ||
    n === 'settings'
    ? n
    : 'library'
}
