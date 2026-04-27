import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { AuthProvider } from '@/lib/auth'
import { ToastProvider } from '@/components/ui/toast'
import './index.css'

// Limpieza preventiva: desregistra service workers viejos y borra caches.
// Esto destraba navegadores que se quedaron con SW de versiones anteriores
// que cacheaban bundles obsoletos y causaban hangs.
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister().catch(() => {}))
    }).catch(() => {})
  }
  if ('caches' in window) {
    caches.keys().then((keys) => keys.forEach((k) => caches.delete(k).catch(() => {}))).catch(() => {})
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000, // 10s — datos "frescos"; pasado eso re-pide al servidor
      gcTime: 5 * 60_000, // 5 min en cache antes de descartar
      refetchOnWindowFocus: true, // si volvés a la app, refresca
      refetchOnReconnect: true, // si se cae el wifi y vuelve, refresca
      refetchOnMount: true,
      retry: 2, // ante error transitorio, reintenta 2 veces
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000)
    },
    mutations: {
      retry: 1
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
)
