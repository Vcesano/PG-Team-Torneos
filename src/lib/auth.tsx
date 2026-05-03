import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { pingSupabase, supabase, supabaseDiagnostic } from './supabase'
import type { Profile } from './database.types'

interface AuthContextValue {
  session: Session | null
  profile: Profile | null
  loading: boolean
  loadError: string | null
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const SESSION_TIMEOUT_MS = 8000 // 8 segundos para detectar conexión muerta

function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout: ${label} demoró más de ${ms}ms`)), ms)
    Promise.resolve(p).then(
      (v) => { clearTimeout(t); resolve(v) },
      (e) => { clearTimeout(t); reject(e) }
    )
  })
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadProfile = useCallback(async (userId: string) => {
    // Reintenta hasta 3 veces con 2s de espera entre intentos.
    // Así un corte momentáneo de red no termina en pantalla "perfil incompleto".
    const MAX_ATTEMPTS = 3
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[auth] reintentando cargar perfil (intento ${attempt + 1}/${MAX_ATTEMPTS})`)
          await new Promise(r => setTimeout(r, 2000 * attempt))
        }
        // maybeSingle() devuelve { data: null, error: null } si no hay fila,
        // en vez de un error PGRST116 como single(). Más seguro.
        const result = await withTimeout<{ data: Profile | null; error: { message: string } | null }>(
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle() as unknown as PromiseLike<{ data: Profile | null; error: { message: string } | null }>,
          SESSION_TIMEOUT_MS,
          'cargar perfil'
        )
        const { data, error } = result
        if (error) {
          console.error(`[auth] error cargando perfil (intento ${attempt + 1})`, error)
          continue // reintenta
        }
        setProfile(data) // null = genuinamente sin perfil
        return
      } catch (e) {
        console.error(`[auth] excepción al cargar perfil (intento ${attempt + 1})`, e)
        // sigue al siguiente intento
      }
    }
    // Todos los intentos fallaron
    console.error('[auth] no se pudo cargar el perfil tras', MAX_ATTEMPTS, 'intentos')
    setProfile(null)
  }, [])

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        // Verificación temprana: si las env vars no están configuradas, fallar al toque
        if (!supabaseDiagnostic.urlConfigured || !supabaseDiagnostic.keyConfigured) {
          throw new Error(
            'Las variables de entorno de Supabase no están configuradas en este deploy. ' +
              'Verificá que VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY estén aplicadas a Production en Vercel ' +
              'y forzá un nuevo deploy.'
          )
        }

        // Health check rápido: ping al endpoint público de Supabase. Si esto falla,
        // sabemos que el problema es de red o env vars (no de auth).
        const health = await pingSupabase(5000)
        if (!health.ok) {
          throw new Error(
            `No se puede contactar a Supabase (${health.error ?? `HTTP ${health.status}`}). ` +
              'Causas más comunes: env vars de Vercel con typo o apuntando a otro proyecto, ' +
              'proyecto Supabase pausado, o bloqueo de red/firewall.'
          )
        }

        const { data } = await withTimeout(
          supabase.auth.getSession(),
          SESSION_TIMEOUT_MS,
          'leer sesión'
        )
        if (!mounted) return
        setSession(data.session)
        if (data.session?.user) await loadProfile(data.session.user.id)
        setLoadError(null)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.error('[auth] init falló:', msg)
        if (!mounted) return
        setLoadError(msg)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, newSession) => {
      if (!mounted) return
      setSession(newSession)
      if (newSession?.user) await loadProfile(newSession.user.id)
      else setProfile(null)
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id)
  }, [session, loadProfile])

  const value = useMemo<AuthContextValue>(
    () => ({ session, profile, loading, loadError, signIn, signOut, refreshProfile }),
    [session, profile, loading, loadError, signIn, signOut, refreshProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
