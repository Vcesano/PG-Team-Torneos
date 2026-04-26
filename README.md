# PG Team Tucumán — Torneos

App de gestión de torneos de Kick Boxing para la escuela **Kick Boxing PG Team Tucumán**.

## Funcionalidades

- Login por email/contraseña.
- Roles: **admin** (control total) y **profesor** (gestiona sus alumnos).
- Catálogo persistente de **alumnos** (DNI, fecha de nacimiento, género, contacto, cinturón).
- **Eventos** (torneos identificados por nombre + fecha) con estado abierto/cerrado.
- **Inscripciones** por evento (peso, peleas previas, cinturón, modalidad, estado de pago, monto).
- **Fixture** auto-generado agrupando por modalidad / categoría de peso / género / edad / cinturón, con edición manual (drag & drop, reordenar, borrar peleas).
- **Resultados** por pelea: ganador, método (KO / TKO / Decisión / DQ), round.
- **Reportes PDF**: cartelera del evento y resumen por profesor.
- Panel de **configuración** para admin: profesores, modalidades, cinturones, estados de pago, categorías de peso (todo configurable).
- Tema oscuro con acentos rojos al estilo del logo.
- Responsive (PC + mobile) e instalable como **PWA**.

## Stack

- React + TypeScript + Vite + TailwindCSS
- Supabase (Auth + Postgres + RLS)
- TanStack Query, Radix UI primitives, dnd-kit, @react-pdf/renderer
- vite-plugin-pwa

## Setup

### 1. Dependencias

```bash
npm install
```

### 2. Supabase

1. Creá un proyecto en https://supabase.com (free tier).
2. En **SQL Editor** corré el contenido de `supabase/migrations/0001_init.sql`.
3. En **Authentication → Providers → Email**: deshabilitá "Confirm email" si querés que los profesores entren sin verificación.
4. Creá los usuarios iniciales en **Authentication → Users → Add user**:
   - `admin@pgteam.com` (desarrollador)
   - `pablo@pgteam.com` (Pablo Gimenez)
5. Promovelos a admin con SQL:

   ```sql
   update profiles set role = 'admin', full_name = 'Admin'
     where id = (select id from auth.users where email = 'admin@pgteam.com');
   update profiles set role = 'admin', full_name = 'Pablo Gimenez'
     where id = (select id from auth.users where email = 'pablo@pgteam.com');
   ```

### 3. Variables de entorno

Copiá `.env.example` a `.env` y completá con las credenciales del proyecto Supabase (Project URL + anon public key, en *Project Settings → API*).

### 4. Logo

Reemplazá `public/logo.png.txt` por el archivo real `public/logo.png` (PNG 512x512 — el logo de la escuela).

### 5. Desarrollo

```bash
npm run dev
```

Abrí http://localhost:5173 y entrá con uno de los usuarios admin.

### 6. Build / preview / tests

```bash
npm run build
npm run preview
npm test
```

## Verificación end-to-end

1. Login con admin → crear un evento.
2. Crear un profesor en *Configuración → Profesores* (la cuenta se crea con un email + password inicial).
3. Logout → login con el profesor → ir a *Alumnos* → crear 4-6 alumnos con distintos pesos/géneros/edades.
4. Volver con admin (o seguir con el profesor) → entrar al evento → *Inscripciones* → inscribir alumnos.
5. Pestaña *Fixture* (admin) → "Generar fixture" → reordenar manualmente → guardar.
6. Pestaña *Resultados* (admin) → marcar ganador y método.
7. Pestaña *Reportes* → descargar cartelera PDF y resumen por profesor.
8. Probar en celular: instalar como PWA desde el menú del navegador.

## Arquitectura

- `src/lib/` — cliente Supabase, auth, permisos, algoritmo de fixture, util de edad.
- `src/components/ui/` — primitives estilo shadcn (button, dialog, select, tabs, toast…).
- `src/components/layout/AppShell.tsx` — sidebar desktop + bottom nav mobile.
- `src/pages/` — Login, Eventos, Detalle de evento (4 tabs), Alumnos, Configuración, Perfil.
- `src/pdf/` — plantillas `@react-pdf/renderer`.
- `supabase/migrations/0001_init.sql` — schema completo + políticas RLS + seeds.

## Permisos

- **Admin**: lectura/escritura total en todo. Único que puede crear eventos, fixture, resultados y administrar profesores y catálogos.
- **Profesor**: lectura de todo. Solo puede crear/editar/borrar SUS alumnos e inscripciones de SUS alumnos. Las políticas RLS de Supabase fuerzan esto del lado del servidor.
