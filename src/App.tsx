import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { pingSupabase, supabaseDiagnostic } from '@/lib/supabase'
import LoginPage from '@/pages/LoginPage'
import EventsPage from '@/pages/EventsPage'
import EventDetailPage from '@/pages/EventDetailPage'
import StudentsPage from '@/pages/StudentsPage'
import SettingsPage from '@/pages/SettingsPage'
import ProfilePage from '@/pages/ProfilePage'
import AppShell from '@/components/layout/AppShell'

function DiagnosticErrorScreen({ message }: { message: string }) {
  const [pinging, setPinging] = useState(false)
  const [pingResult, setPingResult] = useState<string | null>(null)

  const runPing = async () => {
    setPinging(true)
    const r = await pingSupabase()
    setPingResult(
      r.ok
        ? `✅ Supabase responde (HTTP ${r.status}). El problema es local del navegador.`
        : `❌ Supabase NO responde. ${r.error ?? `HTTP ${r.status}`}. Verificá las env vars en Vercel o el estado del proyecto.`
    )
    setPinging(false)
  }

  useEffect(() => { runPing() }, [])

  const diagText = `--- DIAGNÓSTICO PG TEAM ---
Mensaje: ${message}
URL configurada: ${supabaseDiagnostic.urlPreview}
URL length: ${supabaseDiagnostic.urlLength}
Key configurada: ${supabaseDiagnostic.keyPreview}
Key length: ${supabaseDiagnostic.keyLength}
Build: ${supabaseDiagnostic.buildTime}
Ping: ${pingResult ?? '(corriendo)'}
User agent: ${navigator.userAgent}
URL actual: ${window.location.href}`

  const copyDiag = () => {
    navigator.clipboard.writeText(diagText).catch(() => {})
  }

  const hardReload = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map((r) => r.unregister()))
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      }
    } catch {}
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="card-surface p-6 max-w-xl w-full space-y-4">
        <div className="flex items-center gap-3 border-b border-border pb-3">
          <img src="/logo.png" alt="PG Team" className="h-12 w-12 rounded-full ring-2 ring-primary" />
          <div>
            <h2 className="heading-display text-xl text-destructive">No se puede conectar</h2>
            <p className="text-xs text-muted-foreground">PG Team Tucumán — Diagnóstico</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{message}</p>

        <div className="bg-zinc-950 border border-border rounded p-3 font-mono text-[11px] space-y-1">
          <div><span className="text-muted-foreground">URL Supabase:</span> <span className="text-foreground">{supabaseDiagnostic.urlPreview}</span></div>
          <div><span className="text-muted-foreground">Largo URL:</span> <span className="text-foreground">{supabaseDiagnostic.urlLength}</span></div>
          <div><span className="text-muted-foreground">API Key:</span> <span className="text-foreground">{supabaseDiagnostic.keyPreview}</span></div>
          <div><span className="text-muted-foreground">Largo Key:</span> <span className="text-foreground">{supabaseDiagnostic.keyLength}</span></div>
          <div className={pingResult?.startsWith('✅') ? 'text-emerald-400' : pingResult?.startsWith('❌') ? 'text-destructive' : 'text-amber-400'}>
            <span className="text-muted-foreground">Ping a Supabase:</span> {pinging ? 'corriendo...' : (pingResult ?? '—')}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={runPing} disabled={pinging}
            className="border border-border px-3 py-2 rounded text-sm hover:bg-secondary disabled:opacity-50">
            {pinging ? 'Probando...' : 'Reintentar ping'}
          </button>
          <button onClick={copyDiag}
            className="border border-border px-3 py-2 rounded text-sm hover:bg-secondary">
            Copiar diagnóstico
          </button>
          <button onClick={hardReload}
            className="bg-primary text-primary-foreground px-3 py-2 rounded text-sm hover:bg-primary/90 ml-auto">
            Limpiar caché y reintentar
          </button>
        </div>

        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          Si el ping responde ✅ pero la app sigue sin entrar, hay caché del navegador. Tocá "Limpiar caché y reintentar".<br/>
          Si el ping responde ❌, el problema es de configuración del servidor (env vars en Vercel). Tocá "Copiar diagnóstico" y mandalo al admin.
        </p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading, loadError } = useAuth()
  if (loadError) return <DiagnosticErrorScreen message={loadError} />

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
