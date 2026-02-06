-- Migración para agregar tabla de importación de productos
-- Ejecutar con: psql -d megamayoreo -f 001_add_import_log.sql

-- Crear tabla de log de importaciones si no existe
CREATE TABLE IF NOT EXISTS importaciones_log (
    id SERIAL PRIMARY KEY,
    empleado_id INTEGER REFERENCES empleados(id),
    sucursal_id INTEGER REFERENCES sucursales(id),
    nombre_archivo VARCHAR(255) NOT NULL,
    total_registros INTEGER NOT NULL,
    registros_procesados INTEGER DEFAULT 0,
    registros_errores INTEGER DEFAULT 0,
    registros_duplicados INTEGER DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'procesando',
    errores_detalle JSONB DEFAULT '[]',
    fecha_inicio TIMESTAMP DEFAULT NOW(),
    fecha_fin TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_importaciones_empleado ON importaciones_log(empleado_id);
CREATE INDEX IF NOT EXISTS idx_importaciones_sucursal ON importaciones_log(sucursal_id);
CREATE INDEX IF NOT EXISTS idx_importaciones_estado ON importaciones_log(estado);
CREATE INDEX IF NOT EXISTS idx_importaciones_fecha ON importaciones_log(created_at);

-- Insertar categorías básicas si no existen
INSERT INTO categorias (nombre, descripcion) VALUES
    ('Bebidas', 'Todas las bebidas incluyendo refrescos, aguas, jugos'),
    ('Alimentos', 'Productos alimenticios y comidas preparadas'),
    ('Lácteos', 'Leche, queso, yogurt y otros productos lácteos'),
    ('Carnes', 'Carnes rojas, blancas y embutidos'),
    ('Verduras y Frutas', 'Productos frescos de la sección de frutas y verduras'),
    ('Panadería', 'Pan, pasteles y productos de panadería'),
    ('Limpieza', 'Productos de limpieza del hogar'),
    ('Aseo Personal', 'Artículos de higiene y cuidado personal'),
    ('Papelería', 'Útiles de oficina y escolares'),
    ('Mascotas', 'Alimentos y accesorios para mascotas'),
    ('Electrónica', 'Dispositivos electrónicos y accesorios'),
    ('Ropa y Accesorios', 'Prendas de vestir y complementos'),
    ('Hogar', 'Artículos para el hogar y decoración'),
    ('Salud', 'Medicamentos y productos de salud'),
    ('Juguetes', 'Juguetes y artículos para niños'),
    ('Deportes', 'Artículos deportivos y para ejercicio'),
    ('Automotriz', 'Productos y accesorios para vehículos'),
    ('Jardín', 'Herramientas y productos de jardinería'),
    ('Sin categoría', 'Productos no categorizados')
ON CONFLICT (nombre) DO NOTHING;

-- Crear función para verificar si una categoría existe por nombre
CREATE OR REPLACE FUNCTION obtener_categoria_id(nombre_categoria VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    categoria_id INTEGER;
BEGIN
    SELECT id INTO categoria_id
    FROM categorias
    WHERE LOWER(nombre) = LOWER(nombre_categoria);

    IF categoria_id IS NULL THEN
        INSERT INTO categorias (nombre, descripcion)
        VALUES (nombre_categoria, 'Categoría creada automáticamente durante importación')
        RETURNING id INTO categoria_id;
    END IF;

    RETURN categoria_id;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar updated_at en productos
CREATE OR REPLACE FUNCTION actualizar_updated_at_productos()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger si no existe
DROP TRIGGER IF EXISTS productos_updated_at_trigger ON productos;
CREATE TRIGGER productos_updated_at_trigger
    BEFORE UPDATE ON productos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_updated_at_productos();

-- Comentario sobre la migración
COMMENT ON TABLE importaciones_log IS 'Registro de todas las importaciones masivas de productos al sistema';
COMMENT ON COLUMN importaciones_log.estado IS 'Estados posibles: procesando, completado, completado_con_errores, error, cancelado';
COMMENT ON COLUMN importaciones_log.errores_detalle IS 'Array JSON con detalles de cada error durante la importación';

-- Permisos (ajustar según el usuario de la base de datos)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON importaciones_log TO megamayoreo_user;
-- GRANT USAGE, SELECT ON SEQUENCE importaciones_log_id_seq TO megamayoreo_user;