import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'favicon.ico'],
      // En desarrollo NO registrar service worker. Si se registra, queda
      // cacheando assets viejos y la app aparenta estar "colgada" después
      // de reiniciar Vite. En producción (build) sí se registra normalmente.
      devOptions: { enabled: false },
      workbox: {
        // Permite precachear el bundle (incluye @react-pdf/renderer que es pesado).
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Asegura que cualquier service worker viejo sea reemplazado al actualizar.
        clientsClaim: true,
        skipWaiting: true
      },
      manifest: {
        name: 'PG Team Tucumán — Torneos',
        short_name: 'PG Torneos',
        description: 'Gestión de torneos de Kick Boxing — PG Team Tucumán',
        theme_color: '#0a0a0a',
        background_color: '#0a0a0a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
