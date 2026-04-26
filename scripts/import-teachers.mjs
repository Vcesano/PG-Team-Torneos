// ============================================================
//  Carga masiva de profesores - PG Team Tucumán
//  Uso:
//    1. Asegurate de tener en .env (o exportadas) las variables:
//         VITE_SUPABASE_URL = https://xxxx.supabase.co
//         SUPABASE_SERVICE_ROLE_KEY = eyJ... (privada! Settings → API → service_role)
//    2. Desde la raíz del proyecto, ejecutá:
//         node scripts/import-teachers.mjs
//    3. Te muestra una tabla con email, password generada y el resultado.
//    4. Después de correrlo, BORRÁ la SUPABASE_SERVICE_ROLE_KEY del .env por seguridad.
// ============================================================

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Carga manual de .env (sin dependencia extra)
function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env')
    const text = readFileSync(envPath, 'utf-8')
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/i)
      if (m) process.env[m[1]] = process.env[m[1]] ?? m[2].trim()
    }
  } catch {
    // .env no existe — usamos solo variables del shell
  }
}
loadEnv()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('\n❌ Faltan variables. Necesitás:')
  console.error('   - VITE_SUPABASE_URL  (ya la tenés en .env)')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY  (Supabase → Settings → API → service_role)\n')
  process.exit(1)
}

const PROFESORES = [
  'Alberto Lechesi',
  'Cristian Jimenez',
  'Ezequiel Luque',
  'Mario Carrasco',
  'Matias Del Carril',
  'Jesus Recino',
  'Mauro Bengler',
  'Matias Pantalena',
  'Pablo Concha',
  'Carlos Diaz',
  'Diego Leal',
  'El Zorro'
]

// "Alberto Lechesi" → "alberto.lechesi"
function slugify(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .join('.')
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

console.log(`\n📥 Importando ${PROFESORES.length} profesores en ${SUPABASE_URL}\n`)

const results = []

for (const fullName of PROFESORES) {
  const slug = slugify(fullName)
  const email = `${slug}@gmail.com`
  const password = `${slug}.pgteam`

  // 1) Crear usuario en Auth
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  })

  if (createErr) {
    // Si ya existe, lo buscamos y actualizamos su perfil igual
    if (createErr.message.toLowerCase().includes('already') || createErr.status === 422) {
      const { data: list } = await supabase.auth.admin.listUsers({ perPage: 200 })
      const existing = list?.users?.find((u) => u.email === email)
      if (existing) {
        const { error: profErr } = await supabase
          .from('profiles')
          .upsert({ id: existing.id, full_name: fullName, role: 'profesor', active: true })
        results.push({
          fullName, email, password,
          status: profErr ? `❌ perfil: ${profErr.message}` : 'ya existía (perfil actualizado)'
        })
        continue
      }
    }
    results.push({ fullName, email, password, status: `❌ ${createErr.message}` })
    continue
  }

  const userId = created.user.id
  // 2) Asegurar que el perfil tenga el nombre y rol correctos (el trigger ya lo crea pero por las dudas)
  const { error: profErr } = await supabase
    .from('profiles')
    .upsert({ id: userId, full_name: fullName, role: 'profesor', active: true })

  results.push({
    fullName, email, password,
    status: profErr ? `⚠️ creado, error en perfil: ${profErr.message}` : '✅ creado'
  })
}

console.log('\nResultado:\n')
console.table(results)
console.log('\n⚠️  IMPORTANTE: borrá ahora SUPABASE_SERVICE_ROLE_KEY del .env por seguridad.\n')
