-- Migración 005: Sistema de Coordinación de Pedidos
-- Fecha: 2026-01-06
-- Descripción: Tablas para gestión de pedidos, asignación a ruteros y tracking de entregas

-- 1. Tabla principal de pedidos (diferente a ventas, es la solicitud antes de la entrega)
CREATE TABLE IF NOT EXISTS pedidos_coordinacion (
    id SERIAL PRIMARY KEY,
    folio VARCHAR(20) UNIQUE NOT NULL, -- PED-2026-0001
    
    -- Origen
    sucursal_origen_id INTEGER REFERENCES sucursales(id),
    empleado_solicitante_id INTEGER REFERENCES empleados(id),
    cliente_id INTEGER REFERENCES clientes(id),
    
    -- Destino
    direccion_entrega TEXT,
    lat_entrega DECIMAL(10, 8),
    lng_entrega DECIMAL(11, 8),
    referencia_entrega TEXT,
    contacto_entrega VARCHAR(100),
    telefono_entrega VARCHAR(20),
    
    -- Montos
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    impuestos DECIMAL(10, 2) NOT NULL DEFAULT 0,
    costo_envio DECIMAL(10, 2) DEFAULT 0,
    descuento DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    
    -- Estado del pedido
    estado VARCHAR(30) DEFAULT 'pendiente', -- 'pendiente', 'aprobado', 'preparando', 'listo', 'en_ruta', 'entregado', 'cancelado'
    prioridad VARCHAR(20) DEFAULT 'normal', -- 'baja', 'normal', 'alta', 'urgente'
    
    -- Asignación
    rutero_asignado_id INTEGER REFERENCES empleados(id),
    ruta_asignada_id INTEGER REFERENCES rutas(id),
    fecha_asignacion TIMESTAMP,
    
    -- Aprobación
    aprobado_por_id INTEGER REFERENCES empleados(id),
    fecha_aprobacion TIMESTAMP,
    motivo_rechazo TEXT,
    
    -- Entrega
    fecha_entrega_estimada TIMESTAMP,
    fecha_entrega_real TIMESTAMP,
    firma_recepcion TEXT, -- Base64 de firma digital
    foto_entrega TEXT, -- URL de foto de comprobante
    notas_entrega TEXT,
    
    -- Pago
    metodo_pago VARCHAR(30), -- 'efectivo', 'transferencia', 'credito', 'mercadopago'
    estado_pago VARCHAR(30) DEFAULT 'pendiente', -- 'pendiente', 'parcial', 'pagado'
    
    -- Metadata
    origen VARCHAR(30) DEFAULT 'telemarketing', -- 'telemarketing', 'sucursal', 'ecommerce', 'rutero'
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Detalle de pedidos
CREATE TABLE IF NOT EXISTS pedidos_coordinacion_detalle (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos_coordinacion(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id),
    cantidad DECIMAL(10, 3) NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    descuento_unitario DECIMAL(10, 2) DEFAULT 0,
    subtotal DECIMAL(10, 2) NOT NULL,
    nombre_producto VARCHAR(200), -- Snapshot
    sku VARCHAR(50),
    preparado BOOLEAN DEFAULT false, -- Para picking
    notas TEXT
);

-- 3. Historial de estados del pedido
CREATE TABLE IF NOT EXISTS pedidos_historial (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos_coordinacion(id) ON DELETE CASCADE,
    estado_anterior VARCHAR(30),
    estado_nuevo VARCHAR(30) NOT NULL,
    empleado_id INTEGER REFERENCES empleados(id),
    notas TEXT,
    ubicacion_lat DECIMAL(10, 8),
    ubicacion_lng DECIMAL(11, 8),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Tracking de entregas en tiempo real
CREATE TABLE IF NOT EXISTS tracking_entregas (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos_coordinacion(id) ON DELETE CASCADE,
    rutero_id INTEGER REFERENCES empleados(id),
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    velocidad DECIMAL(5, 2), -- km/h
    rumbo INTEGER, -- grados 0-360
    precision_gps DECIMAL(5, 2), -- metros
    bateria INTEGER, -- porcentaje
    evento VARCHAR(50), -- 'ubicacion', 'inicio_ruta', 'llegada', 'entrega', 'problema'
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Tabla para posición actual de ruteros (se actualiza constantemente)
CREATE TABLE IF NOT EXISTS ruteros_ubicacion (
    id SERIAL PRIMARY KEY,
    rutero_id INTEGER REFERENCES empleados(id) UNIQUE,
    lat DECIMAL(10, 8) NOT NULL,
    lng DECIMAL(11, 8) NOT NULL,
    velocidad DECIMAL(5, 2),
    rumbo INTEGER,
    precision_gps DECIMAL(5, 2),
    bateria INTEGER,
    estado VARCHAR(30) DEFAULT 'inactivo', -- 'inactivo', 'disponible', 'en_ruta', 'ocupado'
    pedido_actual_id INTEGER REFERENCES pedidos_coordinacion(id),
    ultima_actualizacion TIMESTAMP DEFAULT NOW()
);

-- 6. Secuencia para folios de pedidos
CREATE SEQUENCE IF NOT EXISTS seq_pedido_folio START 1;

-- 7. Función para generar folio automático
CREATE OR REPLACE FUNCTION generar_folio_pedido()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.folio IS NULL THEN
        NEW.folio := 'PED-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(NEXTVAL('seq_pedido_folio')::TEXT, 5, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Trigger para auto-generar folio
DROP TRIGGER IF EXISTS trigger_generar_folio_pedido ON pedidos_coordinacion;
CREATE TRIGGER trigger_generar_folio_pedido
    BEFORE INSERT ON pedidos_coordinacion
    FOR EACH ROW
    EXECUTE FUNCTION generar_folio_pedido();

-- 9. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_pedido_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pedido_timestamp ON pedidos_coordinacion;
CREATE TRIGGER trigger_update_pedido_timestamp
    BEFORE UPDATE ON pedidos_coordinacion
    FOR EACH ROW
    EXECUTE FUNCTION update_pedido_timestamp();

-- 10. Índices para optimización
CREATE INDEX IF NOT EXISTS idx_pedidos_coord_estado ON pedidos_coordinacion(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_coord_rutero ON pedidos_coordinacion(rutero_asignado_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_coord_cliente ON pedidos_coordinacion(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_coord_sucursal ON pedidos_coordinacion(sucursal_origen_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_coord_fecha ON pedidos_coordinacion(created_at);
CREATE INDEX IF NOT EXISTS idx_tracking_pedido ON tracking_entregas(pedido_id);
CREATE INDEX IF NOT EXISTS idx_tracking_fecha ON tracking_entregas(created_at);
CREATE INDEX IF NOT EXISTS idx_ruteros_ubicacion ON ruteros_ubicacion(rutero_id);

-- 11. Vista para pedidos con información completa
CREATE OR REPLACE VIEW v_pedidos_completos AS
SELECT 
    p.*,
    c.nombre as cliente_nombre,
    c.telefono as cliente_telefono,
    c.direccion as cliente_direccion,
    s.nombre as sucursal_nombre,
    e_sol.nombre as solicitante_nombre,
    e_rut.nombre as rutero_nombre,
    r.nombre as ruta_nombre,
    e_apr.nombre as aprobador_nombre,
    (SELECT COUNT(*) FROM pedidos_coordinacion_detalle WHERE pedido_id = p.id) as total_items
FROM pedidos_coordinacion p
LEFT JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN sucursales s ON p.sucursal_origen_id = s.id
LEFT JOIN empleados e_sol ON p.empleado_solicitante_id = e_sol.id
LEFT JOIN empleados e_rut ON p.rutero_asignado_id = e_rut.id
LEFT JOIN rutas r ON p.ruta_asignada_id = r.id
LEFT JOIN empleados e_apr ON p.aprobado_por_id = e_apr.id;

-- 12. Vista para dashboard de entregas
CREATE OR REPLACE VIEW v_dashboard_entregas AS
SELECT 
    DATE(created_at) as fecha,
    estado,
    COUNT(*) as cantidad,
    SUM(total) as monto_total
FROM pedidos_coordinacion
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at), estado
ORDER BY fecha DESC, estado;
