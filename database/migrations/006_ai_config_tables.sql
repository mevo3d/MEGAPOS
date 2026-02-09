-- Tabla para configuraciones del sistema (API Keys, Switches, etc)
CREATE TABLE IF NOT EXISTS configuraciones (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    descripcion TEXT,
    grupo TEXT DEFAULT 'general', -- 'api', 'sistema', 'ui'
    is_secret BOOLEAN DEFAULT false, -- Para ocultar valores en el UI
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed inicial de OpenAI (Oculto)
INSERT INTO configuraciones (key, value, descripcion, grupo, is_secret) 
VALUES ('openai_api_key', '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', 'Clave API para Servicios de IA (OpenAI)', 'api', true)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Tabla para el aprendizaje del sistema de importación
CREATE TABLE IF NOT EXISTS productos_aprendizaje (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER REFERENCES sucursales(id),
    nombre_proveedor_factura TEXT NOT NULL, -- Lo que dice la factura (ej: "COCA 600ML")
    sku_proveedor_factura TEXT,             -- SKU detectado en factura
    producto_interno_id INTEGER REFERENCES productos(id), -- A qué producto corresponde en tu sistema
    factor_empaque INTEGER DEFAULT 1,       -- Cuántas piezas trae esta presentación (ej: 12)
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aprendizaje_match ON productos_aprendizaje(nombre_proveedor_factura, sku_proveedor_factura);
