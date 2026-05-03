import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { pingSupabase, supabase, supabaseDiagnostic } from '@/lib/supabase'
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
      // Limpiar también localStorage y sessionStorage: el token de sesión de
      // Supabase se guarda ahí y puede quedar expirado/corrupto causando timeouts.
      localStorage.clear()
      sessionStorage.clear()
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

function MissingProfileScreen() {
  const { session, signOut, refreshProfile } = useAuth()
  const [retrying, setRetrying] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Paso 1: reintentar cargar el perfil.
  // En la mayoría de los casos el perfil YA existe y el problema fue un corte
  // momentáneo de red al inicio. Esto lo resuelve sin tocar la base de datos.
  const handleRetry = async () => {
    setRetrying(true)
    setError(null)
    await refreshProfile()
    // Si refreshProfile encontró el perfil, este componente se desmonta solo.
    setRetrying(false)
  }

  // Paso 2 (fallback): crear el perfil si genuinamente no existe.
  // Usa upsert (no insert) para que no falle con "duplicate key" si el perfil ya existe.
  const createMyProfile = async () => {
    if (!session?.user) return
    setCreating(true)
    setError(null)
    const fallbackName = session.user.email?.split('@')[0] ?? 'Usuario'
    const { error: upsertErr } = await supabase.from('profiles').upsert({
      id: session.user.id,
      full_name: fallbackName,
      role: 'profesor', // por seguridad: default profesor; admin lo cambia después
      active: true
    }, { onConflict: 'id' })
    if (upsertErr) {
      setError(upsertErr.message)
      setCreating(false)
      return
    }
    // Siempre refrescamos después del upsert; si el perfil ya existía, lo carga igual.
    await refreshProfile()
    setCreating(false)
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.reload()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card-surface p-6 max-w-md w-full space-y-4 text-center">
        <img src="/logo.png" alt="PG Team" className="h-14 w-14 mx-auto rounded-full ring-2 ring-primary" />
        <h2 className="heading-display text-xl text-destructive">Tu perfil está incompleto</h2>
        <p className="text-sm text-muted-foreground">
          Iniciaste sesión correctamente con <b>{session?.user.email}</b> pero tu usuario no tiene un
          perfil asociado en la app. Esto pasa con usuarios creados antes de instalar la última versión
          del sistema.
        </p>
        <div className="space-y-2">
          {/* Primero intentar reconectar — si era un corte de red, esto alcanza */}
          <button
            onClick={handleRetry}
            disabled={retrying || creating}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 w-full disabled:opacity-50"
          >
            {retrying ? 'Reintentando…' : '↺ Reintentar conexión'}
          </button>
          {/* Si el reintento no funciona, crear el perfil como fallback */}
          <button
            onClick={createMyProfile}
            disabled={creating || retrying}
            className="border border-border px-4 py-2 rounded-md text-sm hover:bg-secondary w-full disabled:opacity-50"
          >
            {creating ? 'Creando perfil…' : 'Crear mi perfil ahora'}
          </button>
          <button
            onClick={handleSignOut}
            className="border border-border px-4 py-2 rounded-md text-sm hover:bg-secondary w-full"
          >
            Cerrar sesión
          </button>
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <p className="text-xs text-muted-foreground border-t border-border pt-3">
          Si te creás un perfil, vas a quedar como <b>profesor</b>. Para ser admin, pedile a otro admin
          que te cambie el rol desde Configuración → Profesores, o ejecutá el SQL de promoción en Supabase.
        </p>
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, profile, loading, profileLoading, loadError } = useAuth()
  if (loadError) return <DiagnosticErrorScreen message={loadError} />

  // Mostrar spinner durante carga inicial O durante recarga del perfil.
  // Así evitamos mostrar MissingProfileScreen cuando el perfil está cargando
  // (ej: justo después de un SIGNED_IN o un refreshProfile).
  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <img src="/logo.png" alt="PG Team" className="h-16 w-16 rounded-full ring-2 ring-primary animate-pulse" />
        <div className="text-muted-foreground text-sm">Conectando…</div>
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  // Sesión válida pero sin perfil en la tabla profiles → mostrar pantalla de auto-fix
  if (!profile) return <MissingProfileScreen />
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
