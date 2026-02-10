-- Migración 007: Nómina y Recursos Humanos (PostgreSQL)

-- 1. Agregar vendedor_id a ventas para rastrear quién gana la comisión
ALTER TABLE ventas ADD COLUMN vendedor_id INTEGER REFERENCES empleados(id);

-- 2. Detalles extendidos del empleado (Expediente RRHH)
CREATE TABLE empleados_detalle (
    empleado_id INTEGER PRIMARY KEY REFERENCES empleados(id),
    rfc VARCHAR(13) UNIQUE,
    curp VARCHAR(18) UNIQUE,
    nss VARCHAR(11), -- Número de Seguro Social
    direccion TEXT,
    fecha_ingreso DATE DEFAULT CURRENT_DATE,
    fecha_nacimiento DATE,
    contacto_emergencia TEXT,
    banco VARCHAR(50),
    clabe VARCHAR(18),
    salario_diario_integrado DECIMAL(10, 2) DEFAULT 0,
    periodicidad_pago VARCHAR(20) DEFAULT 'semanal', -- 'semanal', 'quincenal', 'mensual'
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Documentos digitales del empleado (PDF, Imágenes)
CREATE TABLE empleados_documentos (
    id SERIAL PRIMARY KEY,
    empleado_id INTEGER REFERENCES empleados(id),
    nombre_documento VARCHAR(100) NOT NULL, -- "CURP", "RFC", "Comprobante Domicilio"
    tipo_archivo VARCHAR(50),
    ruta_archivo TEXT NOT NULL,
    fecha_subida TIMESTAMP DEFAULT NOW()
);

-- 4. Configuración de comisiones por empleado
CREATE TABLE configuracion_comisiones (
    id SERIAL PRIMARY KEY,
    empleado_id INTEGER REFERENCES empleados(id) UNIQUE,
    porcentaje_comision DECIMAL(5, 2) DEFAULT 0, -- Ejemplo: 5.00 para 5%
    activo BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Registro de comisiones generadas por venta
CREATE TABLE comisiones_generadas (
    id SERIAL PRIMARY KEY,
    venta_id UUID REFERENCES ventas(id),
    vendedor_id INTEGER REFERENCES empleados(id),
    monto_venta DECIMAL(10, 2) NOT NULL,
    porcentaje_aplicado DECIMAL(5, 2) NOT NULL,
    monto_comision DECIMAL(10, 2) NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente', -- 'pendiente', 'pagado', 'cancelado'
    fecha_generacion TIMESTAMP DEFAULT NOW(),
    periodo_nomina_id INTEGER -- Para ligar a un cierre de nómina futuro
);

-- 6. Historial de puestos y movimientos
CREATE TABLE empleados_historial (
    id SERIAL PRIMARY KEY,
    empleado_id INTEGER REFERENCES empleados(id),
    tipo_movimiento VARCHAR(50), -- 'alta', 'baja', 'cambio_puesto', 'cambio_salario'
    descripcion TEXT,
    fecha TIMESTAMP DEFAULT NOW(),
    usuario_registro_id INTEGER REFERENCES empleados(id)
);
