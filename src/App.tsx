import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import LoginPage from '@/pages/LoginPage'
import EventsPage from '@/pages/EventsPage'
import EventDetailPage from '@/pages/EventDetailPage'
import StudentsPage from '@/pages/StudentsPage'
import SettingsPage from '@/pages/SettingsPage'
import ProfilePage from '@/pages/ProfilePage'
import AppShell from '@/components/layout/AppShell'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, loadError } = useAuth()

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card-surface p-6 max-w-md text-center space-y-4">
          <img src="/logo.png" alt="PG Team" className="h-16 w-16 mx-auto rounded-full ring-2 ring-primary" />
          <h2 className="heading-display text-xl text-destructive">Sin conexión</h2>
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <button
            onClick={async () => {
              if ('serviceWorker' in navigator) {
                const regs = await navigator.serviceWorker.getRegistrations()
                await Promise.all(regs.map((r) => r.unregister()))
              }
              if ('caches' in window) {
                const keys = await caches.keys()
                await Promise.all(keys.map((k) => caches.delete(k)))
              }
              window.location.reload()
            }}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90"
          >
            Limpiar caché y reintentar
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <img src="/logo.png" alt="PG Team" className="h-16 w-16 rounded-full ring-2 ring-primary animate-pulse" />
        <div className="text-muted-foreground text-sm">Conectando…</div>
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  return <AppShell>{children}</AppShell>
}

function AdminOnly({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  if (profile?.role !== 'admin') return <Navigate to="/eventos" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/eventos" replace />} />
      <Route path="/eventos" element={<ProtectedRoute><EventsPage /></ProtectedRoute>} />
      <Route path="/eventos/:eventId" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
      <Route path="/alumnos" element={<ProtectedRoute><StudentsPage /></ProtectedRoute>} />
      <Route
        path="/configuracion"
        element={<ProtectedRoute><AdminOnly><SettingsPage /></AdminOnly></ProtectedRoute>}
      />
      <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/eventos" replace />} />
    </Routes>
  )
}
