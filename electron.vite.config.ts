import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // electron-store es solo ESM: se empaqueta junto al código del proceso principal.
  main: { build: { externalizeDeps: { exclude: ['electron-store'] } } },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
