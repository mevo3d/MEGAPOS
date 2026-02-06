-- EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ORGANIZACIÓN
CREATE TABLE sucursales (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) DEFAULT 'sucursal', -- 'sucursal', 'cedis', 'virtual'
    codigo VARCHAR(20) UNIQUE NOT NULL,
    direccion TEXT,
    telefono VARCHAR(20),
    configuracion JSONB DEFAULT '{}', -- Config específica de la sucursal
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE puntos_venta (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER REFERENCES sucursales(id),
    nombre VARCHAR(50) NOT NULL, -- "Caja 1", "Ruta Norte"
    tipo VARCHAR(20) DEFAULT 'fijo', -- 'fijo', 'movil', 'telemarketing'
    mac_address VARCHAR(50), -- Para seguridad
    activa BOOLEAN DEFAULT true
);

-- 2. PERSONAL Y USUARIOS
CREATE TABLE empleados (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER REFERENCES sucursales(id),
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    telefono VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL, -- 'admin', 'gerente', 'cajero', 'vendedor', 'chofer'
    pin_acceso VARCHAR(10), -- Para acceso rápido en POS
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. PRODUCTOS E INVENTARIO
CREATE TABLE categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    padre_id INTEGER REFERENCES categorias(id),
    activa BOOLEAN DEFAULT true
);

CREATE TABLE productos (
    id SERIAL PRIMARY KEY,
    sku VARCHAR(50) UNIQUE NOT NULL,
    codigo_barras VARCHAR(50),
    nombre VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria_id INTEGER REFERENCES categorias(id),
    unidad_medida VARCHAR(20) DEFAULT 'pieza', -- 'pieza', 'kg', 'litro', 'caja'
    precio_base DECIMAL(10, 2) NOT NULL,
    costo_promedio DECIMAL(10, 2) DEFAULT 0,
    impuestos JSONB DEFAULT '{"iva": 0.16}',
    minimo_stock INTEGER DEFAULT 5,
    imagen_url TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Precios específicos por sucursal (si difieren del base)
CREATE TABLE productos_precios_sucursal (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER REFERENCES productos(id),
    sucursal_id INTEGER REFERENCES sucursales(id),
    precio DECIMAL(10, 2) NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(producto_id, sucursal_id)
);

-- Ubicaciones físicas
CREATE TABLE ubicaciones_fisicas (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER REFERENCES productos(id),
    sucursal_id INTEGER REFERENCES sucursales(id),
    codigo_ubicacion VARCHAR(50), -- "A-12-3"
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(producto_id, sucursal_id)
);

-- Inventario en tiempo real
CREATE TABLE inventario (
    id SERIAL PRIMARY KEY,
    producto_id INTEGER REFERENCES productos(id),
    sucursal_id INTEGER REFERENCES sucursales(id),
    stock_fisico DECIMAL(10, 3) DEFAULT 0,
    stock_reservado DECIMAL(10, 3) DEFAULT 0, -- Apartados o en carritos online
    stock_disponible DECIMAL(10, 3) GENERATED ALWAYS AS (stock_fisico - stock_reservado) STORED,
    version INTEGER DEFAULT 1, -- Optimistic locking para sync
    last_sync TIMESTAMP DEFAULT NOW(),
    UNIQUE(producto_id, sucursal_id)
);

-- 4. CLIENTES
CREATE TABLE clientes (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(200) NOT NULL,
    nombre_comercial VARCHAR(200),
    rfc VARCHAR(20),
    email VARCHAR(100),
    telefono VARCHAR(20),
    direccion TEXT,
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    tipo_precio VARCHAR(20) DEFAULT 'general', -- 'general', 'mayoreo', 'distribuidor'
    limite_credito DECIMAL(10, 2) DEFAULT 0,
    saldo_actual DECIMAL(10, 2) DEFAULT 0,
    dias_credito INTEGER DEFAULT 0,
    ruta_asignada_id INTEGER, -- FK se agrega después
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. VENTAS
CREATE TABLE ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folio_sucursal VARCHAR(50), -- Folio legible por sucursal "SUC1-0001"
    sucursal_id INTEGER REFERENCES sucursales(id),
    caja_id INTEGER REFERENCES puntos_venta(id),
    empleado_id INTEGER REFERENCES empleados(id),
    cliente_id INTEGER REFERENCES clientes(id),
    
    subtotal DECIMAL(10, 2) NOT NULL,
    impuestos DECIMAL(10, 2) NOT NULL,
    descuento DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    
    estado VARCHAR(20) DEFAULT 'completada', -- 'pendiente', 'completada', 'cancelada', 'credito'
    origen VARCHAR(20) DEFAULT 'pos', -- 'pos', 'ruta', 'ecommerce', 'telemarketing'
    
    sincronizado BOOLEAN DEFAULT false,
    fecha_venta TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ventas_detalle (
    id SERIAL PRIMARY KEY,
    venta_id UUID REFERENCES ventas(id),
    producto_id INTEGER REFERENCES productos(id),
    cantidad DECIMAL(10, 3) NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    impuesto_unitario DECIMAL(10, 2) DEFAULT 0,
    descuento_unitario DECIMAL(10, 2) DEFAULT 0,
    subtotal DECIMAL(10, 2) NOT NULL,
    nombre_producto VARCHAR(200) -- Snapshot del nombre
);

CREATE TABLE metodos_pago (
    id SERIAL PRIMARY KEY,
    venta_id UUID REFERENCES ventas(id),
    metodo VARCHAR(50) NOT NULL, -- 'efectivo', 'tarjeta', 'transferencia', 'credito'
    monto DECIMAL(10, 2) NOT NULL,
    referencia VARCHAR(100) -- Baucher, folio transferencia
);

-- 6. CAJAS Y CORTES
CREATE TABLE cierres_caja (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER REFERENCES sucursales(id),
    caja_id INTEGER REFERENCES puntos_venta(id),
    empleado_id INTEGER REFERENCES empleados(id),
    
    fecha_apertura TIMESTAMP NOT NULL,
    fecha_cierre TIMESTAMP,
    
    monto_inicial DECIMAL(10, 2) NOT NULL,
    ventas_efectivo DECIMAL(10, 2) DEFAULT 0,
    ventas_tarjeta DECIMAL(10, 2) DEFAULT 0,
    otros_ingresos DECIMAL(10, 2) DEFAULT 0,
    retiros DECIMAL(10, 2) DEFAULT 0,
    
    total_sistema DECIMAL(10, 2) GENERATED ALWAYS AS (monto_inicial + ventas_efectivo + otros_ingresos - retiros) STORED,
    total_fisico DECIMAL(10, 2), -- Lo que cuenta el cajero
    diferencia DECIMAL(10, 2),
    
    estado VARCHAR(20) DEFAULT 'abierta', -- 'abierta', 'cerrada', 'auditada'
    observaciones TEXT
);

CREATE TABLE movimientos_caja (
    id SERIAL PRIMARY KEY,
    cierre_id INTEGER REFERENCES cierres_caja(id),
    tipo VARCHAR(20) NOT NULL, -- 'ingreso', 'retiro'
    monto DECIMAL(10, 2) NOT NULL,
    concepto VARCHAR(200),
    usuario_autorizo INTEGER REFERENCES empleados(id),
    fecha TIMESTAMP DEFAULT NOW()
);

-- 7. ASISTENCIA Y RRHH
CREATE TABLE asistencias (
    id SERIAL PRIMARY KEY,
    empleado_id INTEGER REFERENCES empleados(id),
    sucursal_id INTEGER REFERENCES sucursales(id),
    entrada TIMESTAMP NOT NULL,
    salida TIMESTAMP,
    metodo_registro VARCHAR(50) DEFAULT 'manual', -- 'wifi', 'gps', 'manual', 'biometrico'
    lat_entrada DECIMAL(10, 8),
    lng_entrada DECIMAL(11, 8),
    estado VARCHAR(20) DEFAULT 'presente', -- 'presente', 'retardo', 'falta'
    observaciones TEXT
);

CREATE TABLE eventualidades (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER REFERENCES sucursales(id),
    empleado_id INTEGER REFERENCES empleados(id),
    tipo VARCHAR(50) NOT NULL, -- 'falla_sistema', 'robo', 'accidente', 'otro'
    descripcion TEXT NOT NULL,
    prioridad VARCHAR(20) DEFAULT 'media',
    estado VARCHAR(20) DEFAULT 'abierta', -- 'abierta', 'en_proceso', 'resuelta'
    fecha_reporte TIMESTAMP DEFAULT NOW()
);

-- 8. RUTAS Y LOGÍSTICA
CREATE TABLE rutas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    vendedor_id INTEGER REFERENCES empleados(id),
    dia_semana INTEGER, -- 1=Lunes, 7=Domingo
    activa BOOLEAN DEFAULT true
);

-- Actualizar FK circular de clientes
ALTER TABLE clientes ADD CONSTRAINT fk_ruta FOREIGN KEY (ruta_asignada_id) REFERENCES rutas(id);

CREATE TABLE visitas_ruta (
    id SERIAL PRIMARY KEY,
    ruta_id INTEGER REFERENCES rutas(id),
    cliente_id INTEGER REFERENCES clientes(id),
    empleado_id INTEGER REFERENCES empleados(id),
    fecha TIMESTAMP DEFAULT NOW(),
    lat DECIMAL(10, 8),
    lng DECIMAL(11, 8),
    resultado VARCHAR(50), -- 'venta', 'no_estaba', 'no_compro', 'cobranza'
    observaciones TEXT
);

-- 9. SISTEMA Y SYNC
CREATE TABLE sync_log (
    id SERIAL PRIMARY KEY,
    sucursal_id INTEGER REFERENCES sucursales(id),
    entidad VARCHAR(50), -- 'ventas', 'inventario', 'clientes'
    operacion VARCHAR(20), -- 'push', 'pull'
    estado VARCHAR(20), -- 'exito', 'error'
    registros_afectados INTEGER,
    mensaje_error TEXT,
    fecha TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notificaciones (
    id SERIAL PRIMARY KEY,
    empleado_id INTEGER REFERENCES empleados(id),
    titulo VARCHAR(100) NOT NULL,
    mensaje TEXT NOT NULL,
    tipo VARCHAR(50), -- 'alerta_stock', 'asistencia', 'sistema'
    leida BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 10. IMPORTACIÓN DE PRODUCTOS
CREATE TABLE importaciones_log (
    id SERIAL PRIMARY KEY,
    empleado_id INTEGER REFERENCES empleados(id),
    sucursal_id INTEGER REFERENCES sucursales(id),
    nombre_archivo VARCHAR(255) NOT NULL,
    total_registros INTEGER NOT NULL,
    registros_procesados INTEGER DEFAULT 0,
    registros_errores INTEGER DEFAULT 0,
    registros_duplicados INTEGER DEFAULT 0,
    estado VARCHAR(20) DEFAULT 'procesando', -- 'procesando', 'completado', 'error', 'cancelado'
    errores_detalle JSONB DEFAULT '[]', -- Array de errores con detalles
    fecha_inicio TIMESTAMP DEFAULT NOW(),
    fecha_fin TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 11. CONFIGURACIÓN DEL SISTEMA
CREATE TABLE configuracion_sistema (
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
CREATE TABLE archivos_sistema (
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
