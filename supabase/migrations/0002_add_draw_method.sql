-- ============================================================================
-- Migración 0002: Agregar 'DRAW' (empate) al enum de método de pelea.
-- Ejecutar UNA VEZ en el SQL Editor de Supabase.
-- ============================================================================

-- Agrega el valor 'DRAW' al enum si todavía no existe
alter type fight_method_t add value if not exists 'DRAW';
