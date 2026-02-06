-- Migración 005: Sistema de Coordinación de Pedidos (SQLite)
-- Fecha: 2026-01-06
-- Descripción: Tablas para gestión de pedidos, asignación a ruteros y tracking de entregas

-- 1. Tabla principal de pedidos
CREATE TABLE IF NOT EXISTS pedidos_coordinacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folio TEXT UNIQUE NOT NULL,
    
    -- Origen
    sucursal_origen_id INTEGER REFERENCES sucursales(id),
    empleado_solicitante_id INTEGER REFERENCES empleados(id),
    cliente_id INTEGER REFERENCES clientes(id),
    
    -- Destino
    direccion_entrega TEXT,
    lat_entrega REAL,
    lng_entrega REAL,
    referencia_entrega TEXT,
    contacto_entrega TEXT,
    telefono_entrega TEXT,
    
    -- Montos
    subtotal REAL NOT NULL DEFAULT 0,
    impuestos REAL NOT NULL DEFAULT 0,
    costo_envio REAL DEFAULT 0,
    descuento REAL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    
    -- Estado del pedido
    estado TEXT DEFAULT 'pendiente',
    prioridad TEXT DEFAULT 'normal',
    
    -- Asignación
    rutero_asignado_id INTEGER REFERENCES empleados(id),
    ruta_asignada_id INTEGER REFERENCES rutas(id),
    fecha_asignacion TEXT,
    
    -- Aprobación
    aprobado_por_id INTEGER REFERENCES empleados(id),
    fecha_aprobacion TEXT,
    motivo_rechazo TEXT,
    
    -- Entrega
    fecha_entrega_estimada TEXT,
    fecha_entrega_real TEXT,
    firma_recepcion TEXT,
    foto_entrega TEXT,
    notas_entrega TEXT,
    
    -- Pago
    metodo_pago TEXT,
    estado_pago TEXT DEFAULT 'pendiente',
    
    -- Metadata
    origen TEXT DEFAULT 'telemarketing',
    notas TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 2. Detalle de pedidos
CREATE TABLE IF NOT EXISTS pedidos_coordinacion_detalle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER REFERENCES pedidos_coordinacion(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id),
    cantidad REAL NOT NULL,
    precio_unitario REAL NOT NULL,
    descuento_unitario REAL DEFAULT 0,
    subtotal REAL NOT NULL,
    nombre_producto TEXT,
    sku TEXT,
    preparado INTEGER DEFAULT 0,
    notas TEXT
);

-- 3. Historial de estados del pedido
CREATE TABLE IF NOT EXISTS pedidos_historial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER REFERENCES pedidos_coordinacion(id) ON DELETE CASCADE,
    estado_anterior TEXT,
    estado_nuevo TEXT NOT NULL,
    empleado_id INTEGER REFERENCES empleados(id),
    notas TEXT,
    ubicacion_lat REAL,
    ubicacion_lng REAL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tracking de entregas en tiempo real
CREATE TABLE IF NOT EXISTS tracking_entregas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER REFERENCES pedidos_coordinacion(id) ON DELETE CASCADE,
    rutero_id INTEGER REFERENCES empleados(id),
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    velocidad REAL,
    rumbo INTEGER,
    precision_gps REAL,
    bateria INTEGER,
    evento TEXT,
    notas TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla para posición actual de ruteros
CREATE TABLE IF NOT EXISTS ruteros_ubicacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rutero_id INTEGER UNIQUE REFERENCES empleados(id),
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    velocidad REAL,
    rumbo INTEGER,
    precision_gps REAL,
    bateria INTEGER,
    estado TEXT DEFAULT 'inactivo',
    pedido_actual_id INTEGER REFERENCES pedidos_coordinacion(id),
    ultima_actualizacion TEXT DEFAULT CURRENT_TIMESTAMP
);

-- 6. Índices para optimización
CREATE INDEX IF NOT EXISTS idx_pedidos_coord_estado ON pedidos_coordinacion(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_coord_rutero ON pedidos_coordinacion(rutero_asignado_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_coord_cliente ON pedidos_coordinacion(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_coord_sucursal ON pedidos_coordinacion(sucursal_origen_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_coord_fecha ON pedidos_coordinacion(created_at);
CREATE INDEX IF NOT EXISTS idx_tracking_pedido ON tracking_entregas(pedido_id);
CREATE INDEX IF NOT EXISTS idx_tracking_fecha ON tracking_entregas(created_at);
