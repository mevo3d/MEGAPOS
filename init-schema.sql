-- Esquema básico para PostgreSQL
CREATE TABLE IF NOT EXISTS empleados (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'cajero',
    activo BOOLEAN DEFAULT true,
    sucursal_id INTEGER,
    caja_asignada_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sucursales (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    direccion TEXT,
    telefono VARCHAR(20),
    tipo_sucursal_id INTEGER,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS productos_catalogo (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    codigo_barras VARCHAR(50),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventario_sucursal (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER REFERENCES productos_catalogo(id),
    sucursal_id INTEGER REFERENCES sucursales(id),
    stock_actual INTEGER DEFAULT 0,
    stock_minimo INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ventas (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER REFERENCES sucursales(id),
    caja_id INTEGER,
    empleado_id INTEGER REFERENCES empleados(id),
    cliente_nombre VARCHAR(200) DEFAULT 'Publico General',
    total DECIMAL(10,2) NOT NULL,
    metodo_pago VARCHAR(20) DEFAULT 'efectivo',
    estado VARCHAR(20) DEFAULT 'completada',
    fecha_venta TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ventas_detalle (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER REFERENCES ventas(id),
    producto_id INTEGER REFERENCES productos_catalogo(id),
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    nombre_producto VARCHAR(200)
);

CREATE TABLE IF NOT EXISTS metodos_pago (
    id SERIAL PRIMARY KEY,
    venta_id INTEGER REFERENCES ventas(id),
    metodo VARCHAR(20) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    referencia VARCHAR(100)
);

-- Insertar usuario admin
INSERT INTO empleados (username, email, password_hash, nombre, rol, activo, sucursal_id)
VALUES ('superadmin', 'superadmin@mega.com', '$2b$10$ujq7xv9IsmD4vXg.wJGVHOYLOhO9XJ1h7YiQqzBBj6j.xQ2.YHZ5a', 'Super Administrador', 'admin', true, 1)
ON CONFLICT (username) DO NOTHING;

-- Insertar sucursal demo
INSERT INTO sucursales (nombre, direccion, activo)
VALUES ('Sucursal Principal', 'Dirección de prueba', true)
ON CONFLICT DO NOTHING;
