/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// The production build is served from https://<user>.github.io/revamp/, so it
// needs a base path. Change '/revamp/' if you rename the repository.
const REPOSITORY_BASE = '/revamp/'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? REPOSITORY_BASE : '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': new URL('./src', import.meta.url).pathname },
  },
  build: {
    // Recharts and React are the bulk of the bundle and neither changes often;
    // splitting them keeps the app chunk small enough to cache well.
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory')) return 'charts'
          if (id.includes('/react') || id.includes('/scheduler')) return 'react'
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
}))
