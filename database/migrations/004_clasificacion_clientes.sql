-- Migración 004: Clasificación de Clientes
-- Fecha: 2026-01-06
-- Descripción: Agregar sistema de clasificación y categorización de clientes para CRM

-- 1. Tabla de tipos/categorías de clientes
CREATE TABLE IF NOT EXISTS tipos_cliente (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL UNIQUE,
    descripcion TEXT,
    color VARCHAR(20) DEFAULT '#6366f1', -- Color para badges en UI
    icono VARCHAR(50) DEFAULT 'user', -- Nombre del icono
    prioridad INTEGER DEFAULT 0, -- Para ordenar (mayor = más importante)
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Agregar campo de tipo/categoría a clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tipo_cliente_id INTEGER REFERENCES tipos_cliente(id);
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS potencial_compra VARCHAR(20) DEFAULT 'medio'; -- 'bajo', 'medio', 'alto', 'premium'
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS frecuencia_compra VARCHAR(20) DEFAULT 'ocasional'; -- 'nuevo', 'ocasional', 'regular', 'frecuente', 'vip'
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS ultima_compra TIMESTAMP;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS total_compras DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS cantidad_compras INTEGER DEFAULT 0;
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS notas_crm TEXT; -- Notas del telemarketing

-- 3. Tabla de etiquetas/tags para clientes
CREATE TABLE IF NOT EXISTS etiquetas_cliente (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(20) DEFAULT '#8b5cf6',
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Relación muchos a muchos: clientes <-> etiquetas
CREATE TABLE IF NOT EXISTS clientes_etiquetas (
    id SERIAL PRIMARY KEY,
    cliente_id INTEGER REFERENCES clientes(id) ON DELETE CASCADE,
    etiqueta_id INTEGER REFERENCES etiquetas_cliente(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(cliente_id, etiqueta_id)
);

-- 5. Insertar tipos de cliente predeterminados
INSERT INTO tipos_cliente (nombre, descripcion, color, icono, prioridad) VALUES
    ('Prospecto', 'Cliente potencial sin compras previas', '#94a3b8', 'user-plus', 1),
    ('Ocasional', 'Cliente con compras esporádicas', '#60a5fa', 'shopping-cart', 2),
    ('Regular', 'Cliente con compras recurrentes', '#34d399', 'repeat', 3),
    ('Frecuente', 'Cliente con alta frecuencia de compra', '#fbbf24', 'star', 4),
    ('VIP', 'Cliente premium con beneficios especiales', '#f472b6', 'crown', 5),
    ('Mayorista', 'Cliente de compras al mayoreo', '#a78bfa', 'building', 4),
    ('Distribuidor', 'Distribuidor autorizado', '#22d3d8', 'truck', 5),
    ('Inactivo', 'Cliente sin compras recientes', '#6b7280', 'user-x', 0)
ON CONFLICT (nombre) DO NOTHING;

-- 6. Insertar etiquetas predeterminadas
INSERT INTO etiquetas_cliente (nombre, color) VALUES
    ('Pago puntual', '#22c55e'),
    ('Requiere seguimiento', '#f59e0b'),
    ('Alto ticket', '#8b5cf6'),
    ('Nuevo', '#3b82f6'),
    ('Reactivar', '#ef4444'),
    ('Referido', '#06b6d4'),
    ('Crédito aprobado', '#10b981'),
    ('Zona norte', '#6366f1'),
    ('Zona sur', '#ec4899'),
    ('Zona centro', '#f97316')
ON CONFLICT (nombre) DO NOTHING;

-- 7. Índices para optimización
CREATE INDEX IF NOT EXISTS idx_clientes_tipo_cliente ON clientes(tipo_cliente_id);
CREATE INDEX IF NOT EXISTS idx_clientes_potencial ON clientes(potencial_compra);
CREATE INDEX IF NOT EXISTS idx_clientes_frecuencia ON clientes(frecuencia_compra);
CREATE INDEX IF NOT EXISTS idx_clientes_ultima_compra ON clientes(ultima_compra);
CREATE INDEX IF NOT EXISTS idx_clientes_etiquetas_cliente ON clientes_etiquetas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_clientes_etiquetas_etiqueta ON clientes_etiquetas(etiqueta_id);

-- 8. Función para actualizar estadísticas de cliente automáticamente
CREATE OR REPLACE FUNCTION actualizar_estadisticas_cliente()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar estadísticas del cliente
    UPDATE clientes 
    SET 
        ultima_compra = NOW(),
        total_compras = COALESCE(total_compras, 0) + NEW.total,
        cantidad_compras = COALESCE(cantidad_compras, 0) + 1,
        -- Actualizar frecuencia automáticamente
        frecuencia_compra = CASE
            WHEN COALESCE(cantidad_compras, 0) + 1 >= 20 THEN 'vip'
            WHEN COALESCE(cantidad_compras, 0) + 1 >= 10 THEN 'frecuente'
            WHEN COALESCE(cantidad_compras, 0) + 1 >= 5 THEN 'regular'
            WHEN COALESCE(cantidad_compras, 0) + 1 >= 1 THEN 'ocasional'
            ELSE 'nuevo'
        END
    WHERE id = NEW.cliente_id AND NEW.cliente_id IS NOT NULL;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Trigger para actualizar estadísticas cuando se completa una venta
DROP TRIGGER IF EXISTS trigger_actualizar_estadisticas_cliente ON ventas;
CREATE TRIGGER trigger_actualizar_estadisticas_cliente
    AFTER INSERT ON ventas
    FOR EACH ROW
    WHEN (NEW.estado = 'completada' AND NEW.cliente_id IS NOT NULL)
    EXECUTE FUNCTION actualizar_estadisticas_cliente();
