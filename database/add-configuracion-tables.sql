-- Script para agregar tablas de configuración del sistema
-- Ejecutar después de hacer backup de la BD actual

-- 11. CONFIGURACIÓN DEL SISTEMA
CREATE TABLE IF NOT EXISTS configuracion_sistema (
    id SERIAL PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT,
    tipo VARCHAR(50), -- 'texto', 'numero', 'json', 'archivo'
    descripcion TEXT,
    actualizado_por INTEGER REFERENCES empleados(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla para almacenar archivos (logos, etc)
CREATE TABLE IF NOT EXISTS archivos_sistema (
    id SERIAL PRIMARY KEY,
    nombre_original VARCHAR(255) NOT NULL,
    nombre_guardado VARCHAR(255) UNIQUE NOT NULL,
    tipo_archivo VARCHAR(50),
    ruta_archivo TEXT NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'logo', 'documento', etc
    tamaño INTEGER,
    actualizado_por INTEGER REFERENCES empleados(id),
    activo BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_configuracion_clave ON configuracion_sistema(clave);
CREATE INDEX IF NOT EXISTS idx_archivos_tipo ON archivos_sistema(tipo, activo);
CREATE INDEX IF NOT EXISTS idx_archivos_created ON archivos_sistema(created_at DESC);

-- Commit
COMMIT;
