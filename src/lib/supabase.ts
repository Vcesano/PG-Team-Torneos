import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !anonKey) {
  // No tiramos error en build para permitir el primer arranque sin credenciales,
  // pero cualquier llamada real al cliente fallará con un mensaje claro.
  console.warn('[supabase] Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY no configuradas en .env')
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
