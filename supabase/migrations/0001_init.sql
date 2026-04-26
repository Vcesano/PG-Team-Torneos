-- ============================================================================
-- PG Team Tucumán — Torneos · Migración inicial
-- Schema, RLS y seeds. Ejecutar en el SQL Editor de Supabase.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Tipos
-- ----------------------------------------------------------------------------
do $$ begin create type role_t as enum ('admin', 'profesor'); exception when duplicate_object then null; end $$;
do $$ begin create type gender_t as enum ('M', 'F'); exception when duplicate_object then null; end $$;
do $$ begin create type cat_gender_t as enum ('M', 'F', 'ANY'); exception when duplicate_object then null; end $$;
do $$ begin create type event_status_t as enum ('draft', 'open', 'closed'); exception when duplicate_object then null; end $$;
do $$ begin create type fight_status_t as enum ('pending', 'completed', 'cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type fight_method_t as enum ('KO', 'TKO', 'DECISION', 'DQ'); exception when duplicate_object then null; end $$;

-- ----------------------------------------------------------------------------
-- Tablas
-- ----------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role role_t not null default 'profesor',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists belts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color_hex text not null default '#ffffff',
  order_index int not null default 0
);

create table if not exists modalities (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);

create table if not exists payment_statuses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_paid boolean not null default false,
  order_index int not null default 0
);

create table if not exists weight_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_kg numeric(5,2) not null,
  max_kg numeric(5,2) not null,
  gender cat_gender_t not null default 'ANY',
  age_min int not null default 0,
  age_max int not null default 99,
  check (max_kg > min_kg),
  check (age_max >= age_min)
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  event_date date not null,
  location text,
  status event_status_t not null default 'open',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  profesor_id uuid not null references profiles(id) on delete restrict,
  full_name text not null,
  dni text not null unique,
  birth_date date not null,
  gender gender_t not null,
  phone text,
  email text,
  current_belt_id uuid references belts(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists students_profesor_idx on students(profesor_id);

create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  weight_kg numeric(5,2) not null,
  fight_count int not null default 0,
  belt_id uuid not null references belts(id),
  modality_id uuid not null references modalities(id),
  weight_category_id uuid references weight_categories(id) on delete set null,
  payment_status_id uuid not null references payment_statuses(id),
  amount_paid numeric(10,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  unique (event_id, student_id)
);
create index if not exists registrations_event_idx on registrations(event_id);

create table if not exists fights (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events(id) on delete cascade,
  fight_number int not null,
  red_registration_id uuid not null references registrations(id) on delete cascade,
  blue_registration_id uuid not null references registrations(id) on delete cascade,
  modality_id uuid not null references modalities(id),
  weight_category_id uuid references weight_categories(id) on delete set null,
  status fight_status_t not null default 'pending',
  winner_registration_id uuid references registrations(id) on delete set null,
  method fight_method_t,
  round int,
  notes text,
  created_at timestamptz not null default now(),
  check (red_registration_id <> blue_registration_id)
);
create index if not exists fights_event_idx on fights(event_id);

-- ----------------------------------------------------------------------------
-- Helpers
-- ----------------------------------------------------------------------------
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin' and active);
$$;

create or replace function student_owner(student_uuid uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select profesor_id from students where id = student_uuid;
$$;

-- Trigger: al crearse un usuario en auth.users, crear perfil placeholder.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'profesor')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- Row-Level Security
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;
alter table belts enable row level security;
alter table modalities enable row level security;
alter table payment_statuses enable row level security;
alter table weight_categories enable row level security;
alter table events enable row level security;
alter table students enable row level security;
alter table registrations enable row level security;
alter table fights enable row level security;

-- profiles: lectura para autenticados, escritura solo admin
create policy profiles_select on profiles for select to authenticated using (true);
create policy profiles_admin_write on profiles for all to authenticated
  using (is_admin()) with check (is_admin());

-- catálogos (lectura libre autenticada, escritura admin)
do $$ declare t text; begin
  for t in select unnest(array['belts','modalities','payment_statuses','weight_categories','events']) loop
    execute format('create policy %1$I_select on %1$I for select to authenticated using (true)', t);
    execute format('create policy %1$I_admin_write on %1$I for all to authenticated using (is_admin()) with check (is_admin())', t);
  end loop;
end $$;

-- students: lectura libre autenticada; escritura por dueño o admin
create policy students_select on students for select to authenticated using (true);
create policy students_owner_insert on students for insert to authenticated
  with check (is_admin() or profesor_id = auth.uid());
create policy students_owner_update on students for update to authenticated
  using (is_admin() or profesor_id = auth.uid())
  with check (is_admin() or profesor_id = auth.uid());
create policy students_owner_delete on students for delete to authenticated
  using (is_admin() or profesor_id = auth.uid());

-- registrations: lectura libre autenticada; escritura por dueño del alumno o admin
create policy registrations_select on registrations for select to authenticated using (true);
create policy registrations_owner_insert on registrations for insert to authenticated
  with check (is_admin() or student_owner(student_id) = auth.uid());
create policy registrations_owner_update on registrations for update to authenticated
  using (is_admin() or student_owner(student_id) = auth.uid())
  with check (is_admin() or student_owner(student_id) = auth.uid());
create policy registrations_owner_delete on registrations for delete to authenticated
  using (is_admin() or student_owner(student_id) = auth.uid());

-- fights: lectura libre autenticada; escritura solo admin
create policy fights_select on fights for select to authenticated using (true);
create policy fights_admin_write on fights for all to authenticated
  using (is_admin()) with check (is_admin());

-- ----------------------------------------------------------------------------
-- Seeds (catálogos por defecto)
-- ----------------------------------------------------------------------------
insert into belts (name, color_hex, order_index) values
  ('Blanco', '#ffffff', 1),
  ('Amarillo', '#facc15', 2),
  ('Naranja', '#fb923c', 3),
  ('Verde', '#22c55e', 4),
  ('Azul', '#3b82f6', 5),
  ('Marrón', '#92400e', 6),
  ('Negro', '#0f172a', 7)
on conflict do nothing;

insert into modalities (name) values
  ('Light Contact'), ('Semi Contact'), ('Full Contact'),
  ('K1'), ('Low Kick'), ('Muay Thai')
on conflict (name) do nothing;

insert into payment_statuses (name, is_paid, order_index) values
  ('Pendiente', false, 1),
  ('Parcial', false, 2),
  ('Pagado', true, 3)
on conflict (name) do nothing;

-- Categorías de peso de muestra (Adulto). El admin debería ajustarlas.
insert into weight_categories (name, min_kg, max_kg, gender, age_min, age_max) values
  ('-60 kg Adulto M', 0, 60, 'M', 18, 35),
  ('-65 kg Adulto M', 60.01, 65, 'M', 18, 35),
  ('-70 kg Adulto M', 65.01, 70, 'M', 18, 35),
  ('-75 kg Adulto M', 70.01, 75, 'M', 18, 35),
  ('-80 kg Adulto M', 75.01, 80, 'M', 18, 35),
  ('-86 kg Adulto M', 80.01, 86, 'M', 18, 35),
  ('+86 kg Adulto M', 86.01, 200, 'M', 18, 35),
  ('-55 kg Adulto F', 0, 55, 'F', 18, 35),
  ('-60 kg Adulto F', 55.01, 60, 'F', 18, 35),
  ('-65 kg Adulto F', 60.01, 65, 'F', 18, 35),
  ('+65 kg Adulto F', 65.01, 200, 'F', 18, 35)
on conflict do nothing;

-- ============================================================================
-- IMPORTANTE: tras correr esta migración:
--   1) Crear los usuarios Admin (desarrollador) y Pablo Gimenez en
--      Auth → Users (Supabase Dashboard).
--   2) Marcar su perfil como admin con:
--        update profiles set role = 'admin', full_name = '...'
--          where id = '<uuid del usuario>';
-- ============================================================================
