import { createClient } from '@supabase/supabase-js'

// Trim y limpieza de las env vars para evitar que un espacio extra al final
// (cosa que pasa al copiar/pegar en el dashboard de Vercel) rompa la conexión.
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/$/, '')
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

// Diagnóstico exportado: lo usa la pantalla de error para mostrar info real
// al usuario sin filtrar la clave completa.
export const supabaseDiagnostic = {
  urlConfigured: !!url,
  urlPreview: url ? `${url.slice(0, 30)}...` : '(vacía)',
  urlLength: url?.length ?? 0,
  keyConfigured: !!anonKey,
  keyPreview: anonKey ? `${anonKey.slice(0, 12)}...${anonKey.slice(-4)}` : '(vacía)',
  keyLength: anonKey?.length ?? 0,
  buildTime: new Date().toISOString()
}

if (!url || !anonKey) {
  console.error('[supabase] Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY NO configuradas')
} else {
  console.log('[supabase] Configurado:', { url: supabaseDiagnostic.urlPreview, keyLen: anonKey.length })
}

/**
 * Health check directo al endpoint de Supabase. Devuelve true si responde HTTP 200.
 * Esto confirma que la URL es alcanzable y la anon key es válida ANTES de que
 * el cliente intente nada complejo. Si esto falla, sabemos que las env vars están mal.
 */
export async function pingSupabase(timeoutMs = 5000): Promise<{ ok: boolean; status?: number; error?: string }> {
  if (!url || !anonKey) return { ok: false, error: 'env vars no configuradas' }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      method: 'GET',
      headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      signal: controller.signal
    })
    clearTimeout(timer)
    return { ok: res.ok, status: res.status }
  } catch (e) {
    clearTimeout(timer)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

// Nota: dejamos el cliente sin el generic <Database> a propósito.
// El tipado fuerte de Supabase v2.45 con definiciones manuales es muy estricto
// y rompe los inserts. Mantenemos los tipos de filas (Profile, Event, etc.) en
// database.types.ts para usarlos en los componentes; las queries quedan tipadas
// como `any` lo cual es aceptable en este proyecto.
export const supabase = createClient(url ?? 'http://invalid', anonKey ?? 'invalid', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
})
