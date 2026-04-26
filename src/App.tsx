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
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Cargando…</div>
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
