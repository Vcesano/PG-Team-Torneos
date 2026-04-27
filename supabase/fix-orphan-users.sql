-- ============================================================================
-- Arregla usuarios "huérfanos": usuarios que existen en auth.users pero
-- no tienen fila en public.profiles. Esto pasa con cuentas creadas antes
-- de instalar el trigger handle_new_user.
--
-- Crea un perfil 'profesor' por default para cada huérfano. Después podés
-- promoverlos a admin con el segundo bloque.
-- ============================================================================

-- 1) Crear profile faltante para todos los huérfanos
insert into public.profiles (id, full_name, role, active)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  'profesor'::role_t,
  true
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- 2) Promover usuarios específicos a admin (CAMBIA los emails)
update public.profiles
set role = 'admin', full_name = 'Valentin Cesano (Admin)'
where id = (select id from auth.users where email = 'valentincesano@gmail.com');

-- Si tenés otro admin, agregá líneas similares:
-- update public.profiles
-- set role = 'admin', full_name = 'Pablo Gimenez'
-- where id = (select id from auth.users where email = 'pablo@pgteam.com');

-- 3) Verificación
select
  u.email,
  p.full_name,
  p.role,
  p.active,
  case when p.id is null then '⚠️ HUÉRFANO' else '✅ OK' end as status
from auth.users u
left join public.profiles p on p.id = u.id
order by p.role nulls first, p.full_name;
