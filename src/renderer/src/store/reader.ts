import { create } from 'zustand'

interface ReaderStore {
  autoScroll: boolean
  /** Contador de órdenes de scroll (atajos globales): signo = dirección. */
  scrollCmd: { n: number; dir: 1 | -1 }
  setAutoScroll: (v: boolean) => void
  toggleAutoScroll: () => void
  scrollBy: (dir: 1 | -1) => void
}

export const useReaderStore = create<ReaderStore>((set) => ({
  autoScroll: false,
  scrollCmd: { n: 0, dir: 1 },
  setAutoScroll: (autoScroll) => set({ autoScroll }),
  toggleAutoScroll: () => set((s) => ({ autoScroll: !s.autoScroll })),
  scrollBy: (dir) => set((s) => ({ scrollCmd: { n: s.scrollCmd.n + 1, dir } }))
}))
