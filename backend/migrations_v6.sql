-- ==============================================================================
-- MIGRACIÓN V6: Múltiples entidades por usuario
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ==============================================================================

-- 1. Crear tablas relacionales
CREATE TABLE IF NOT EXISTS rel_usuario_cliente_directo (
    usuario_id UUID REFERENCES usuario(id) ON DELETE CASCADE,
    cliente_directo_id UUID REFERENCES cliente_directo(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, cliente_directo_id)
);

CREATE TABLE IF NOT EXISTS rel_usuario_cliente_final (
    usuario_id UUID REFERENCES usuario(id) ON DELETE CASCADE,
    cliente_final_id UUID REFERENCES cliente_final(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, cliente_final_id)
);

-- 2. Migrar los datos existentes (de las columnas viejas a las nuevas tablas)
INSERT INTO rel_usuario_cliente_directo (usuario_id, cliente_directo_id)
SELECT id, cliente_directo_id FROM usuario WHERE cliente_directo_id IS NOT NULL
ON CONFLICT DO NOTHING;

INSERT INTO rel_usuario_cliente_final (usuario_id, cliente_final_id)
SELECT id, cliente_final_id FROM usuario WHERE cliente_final_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- === RESUMEN OK ===
SELECT 'Migración V6 Completada Exitosamente' as resultado;
