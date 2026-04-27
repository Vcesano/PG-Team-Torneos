import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// PWA / Service Worker DESACTIVADO a propósito.
// Los service workers cacheaban bundles viejos y causaban hangs intermitentes
// muy difíciles de diagnosticar (la app "se quedaba cargando", "no aparecían
// alumnos", etc). La app sigue funcionando perfectamente como web app pero
// SIN cache offline. Para volver a habilitarlo en el futuro, cambiar
// ENABLE_PWA a true cuando todos los bugs estén controlados.
const ENABLE_PWA = false

export default defineConfig({
  plugins: [
    react(),
    ...(ENABLE_PWA
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['logo.png', 'favicon.ico'],
            devOptions: { enabled: false },
            workbox: {
              maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
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
        ]
      : [])
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
