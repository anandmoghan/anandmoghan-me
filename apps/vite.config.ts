import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  envDir: '../',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
  },
  // Vite's dep pre-bundler conflates pdfjs-dist's `build/` and `legacy/build/`
  // entries; pdf.js's fake-worker fallback then tries to dynamic-import the
  // non-legacy worker and fails. Excluding it keeps the imports raw.
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        time: resolve(__dirname, 'time/index.html'),
        wealth: resolve(__dirname, 'wealth/index.html'),
        expense: resolve(__dirname, 'expense/index.html'),
      },
    },
  },
})
