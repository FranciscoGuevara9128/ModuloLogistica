-- ==============================================================================
-- MIGRACIÓN V5: Remisión y Orden de Compra
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ==============================================================================

-- 1. Agregar remision y orden_compra a movimiento_polines
ALTER TABLE movimiento_polines ADD COLUMN IF NOT EXISTS remision TEXT;
ALTER TABLE movimiento_polines ADD COLUMN IF NOT EXISTS orden_compra TEXT;

-- 2. Agregar remision a recepcion_polines
ALTER TABLE recepcion_polines ADD COLUMN IF NOT EXISTS remision TEXT;

-- === RESUMEN OK ===
SELECT 'Migración V5 Completada Exitosamente' as resultado;
