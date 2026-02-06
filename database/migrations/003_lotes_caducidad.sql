-- Migración: Agregar campos lote y fecha_caducidad a recepciones_detalle
-- Fecha: 2026-01-05
-- Descripción: Permite tracking de productos perecederos y gestión de lotes

-- 1. Agregar columnas a recepciones_detalle
ALTER TABLE recepciones_detalle ADD COLUMN IF NOT EXISTS lote VARCHAR(100);
ALTER TABLE recepciones_detalle ADD COLUMN IF NOT EXISTS fecha_caducidad DATE;

-- 2. Crear índice para búsqueda por caducidad
CREATE INDEX IF NOT EXISTS idx_recepciones_detalle_caducidad ON recepciones_detalle(fecha_caducidad);
CREATE INDEX IF NOT EXISTS idx_recepciones_detalle_lote ON recepciones_detalle(lote);

-- 3. Vista para productos próximos a caducar
CREATE OR REPLACE VIEW v_productos_por_caducar AS
SELECT 
    rd.producto_id,
    p.nombre as producto_nombre,
    p.sku,
    rd.lote,
    rd.fecha_caducidad,
    rd.cantidad_recibida as cantidad,
    r.sucursal_id,
    s.nombre as sucursal_nombre,
    (rd.fecha_caducidad - CURRENT_DATE) as dias_para_caducar
FROM recepciones_detalle rd
JOIN recepciones r ON rd.recepcion_id = r.id
JOIN productos p ON rd.producto_id = p.id
JOIN sucursales s ON r.sucursal_id = s.id
WHERE rd.fecha_caducidad IS NOT NULL
AND rd.fecha_caducidad >= CURRENT_DATE
ORDER BY rd.fecha_caducidad ASC;

-- 4. Crear tabla de configuración para alertas de caducidad (opcional)
CREATE TABLE IF NOT EXISTS config_caducidad (
    id SERIAL PRIMARY KEY,
    dias_alerta_temprana INTEGER DEFAULT 30,
    dias_alerta_urgente INTEGER DEFAULT 7,
    notificar_email BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar configuración por defecto
INSERT INTO config_caducidad (dias_alerta_temprana, dias_alerta_urgente)
SELECT 30, 7
WHERE NOT EXISTS (SELECT 1 FROM config_caducidad);
