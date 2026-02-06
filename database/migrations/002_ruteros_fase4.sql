-- ============================================
-- MIGRACIÓN: Fase 4 Ruteros - Completar funcionalidades
-- Fecha: 2026-01-02
-- ============================================

-- 1. Agregar calificación a visitas_ruteros
ALTER TABLE visitas_ruteros ADD COLUMN IF NOT EXISTS calificacion INTEGER CHECK (calificacion >= 1 AND calificacion <= 5);
ALTER TABLE visitas_ruteros ADD COLUMN IF NOT EXISTS feedback_cliente TEXT;

-- 2. Crear tabla de zonas de precio si no existe
CREATE TABLE IF NOT EXISTS zonas_precio (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    distancia_min_km DECIMAL(10,2) DEFAULT 0,
    distancia_max_km DECIMAL(10,2),
    porcentaje_incremento DECIMAL(5,2) DEFAULT 0, -- Ej: 10 = 10% sobre precio base
    monto_fijo_extra DECIMAL(10,2) DEFAULT 0,     -- Cargo fijo adicional
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Agregar zona a clientes
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS zona_precio_id INTEGER REFERENCES zonas_precio(id);

-- 4. Tabla para pagos de Mercado Pago
CREATE TABLE IF NOT EXISTS pagos_mercadopago (
    id SERIAL PRIMARY KEY,
    venta_id UUID REFERENCES ventas(id),
    preference_id VARCHAR(100),           -- ID preferencia de MP
    external_reference VARCHAR(100),      -- Referencia nuestra
    payment_id VARCHAR(100),              -- ID del pago en MP
    status VARCHAR(50),                   -- pending, approved, rejected
    status_detail VARCHAR(100),
    monto DECIMAL(10,2) NOT NULL,
    link_pago TEXT,                       -- URL del checkout
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    fecha_pago TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

-- 5. Tabla historial de links enviados por WhatsApp
CREATE TABLE IF NOT EXISTS links_pago_enviados (
    id SERIAL PRIMARY KEY,
    pago_mercadopago_id INTEGER REFERENCES pagos_mercadopago(id),
    cliente_id INTEGER REFERENCES clientes(id),
    telefono VARCHAR(20) NOT NULL,
    empleado_id INTEGER REFERENCES empleados(id),
    fecha_envio TIMESTAMP DEFAULT NOW(),
    canal VARCHAR(20) DEFAULT 'whatsapp' -- 'whatsapp', 'sms', 'email'
);

-- 6. Insertar zonas de ejemplo
INSERT INTO zonas_precio (nombre, descripcion, distancia_min_km, distancia_max_km, porcentaje_incremento, monto_fijo_extra)
VALUES 
    ('Local', 'Dentro de la ciudad', 0, 10, 0, 0),
    ('Suburbano', 'Alrededores de la ciudad', 10, 30, 5, 20),
    ('Foráneo Cercano', 'Municipios cercanos', 30, 60, 10, 50),
    ('Foráneo Lejano', 'Municipios lejanos', 60, 100, 15, 100),
    ('Especial', 'Más de 100km', 100, 999, 20, 150)
ON CONFLICT DO NOTHING;

-- 7. Agregar campos de inventario_ruta si no existen
ALTER TABLE inventario_ruta ADD COLUMN IF NOT EXISTS precio_zona DECIMAL(10,2);
ALTER TABLE inventario_ruta ADD COLUMN IF NOT EXISTS fecha_carga DATE DEFAULT CURRENT_DATE;

-- 8. Índices para performance
CREATE INDEX IF NOT EXISTS idx_visitas_ruteros_fecha ON visitas_ruteros(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_visitas_ruteros_ruta ON visitas_ruteros(ruta_id);
CREATE INDEX IF NOT EXISTS idx_pagos_mp_venta ON pagos_mercadopago(venta_id);
CREATE INDEX IF NOT EXISTS idx_pagos_mp_status ON pagos_mercadopago(status);
