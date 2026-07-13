-- ─────────────────────────────────────────────────────────────
-- migrations_v9.sql — Creación de tabla solicitud_polines
--                     + Modificación de enum estado_uso
-- ─────────────────────────────────────────────────────────────
-- IMPORTANTE: Ejecutar en Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────

-- 1. Agregar 'SINIESTRO' al enum estado_uso para evitar errores de tipo
ALTER TYPE estado_uso ADD VALUE IF NOT EXISTS 'SINIESTRO';

-- 2. Crear tabla de solicitudes
CREATE TABLE IF NOT EXISTS solicitud_polines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_directo_id UUID REFERENCES cliente_directo(id) ON DELETE CASCADE,
  tipo_solicitud TEXT NOT NULL CHECK (tipo_solicitud IN ('PULL_FIJO', 'TRANSITO')),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  fecha DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'ACEPTADA', 'RECHAZADA')),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
