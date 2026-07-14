-- ─────────────────────────────────────────────────────────────
-- migrations_v10.sql — Actualizar CHECK constraint en movimiento_polines
-- ─────────────────────────────────────────────────────────────
-- IMPORTANTE: Ejecutar en Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────

-- 1. Eliminar el check constraint antiguo que rechazaba 'SINIESTRO'
ALTER TABLE movimiento_polines DROP CONSTRAINT IF EXISTS chk_estado_uso;

-- 2. Re-agregar el check constraint incluyendo 'SINIESTRO'
ALTER TABLE movimiento_polines 
  ADD CONSTRAINT chk_estado_uso CHECK (estado_uso IN ('ALMACENAMIENTO', 'TRANSPORTE', 'PULL_FIJO', 'SINIESTRO'));
