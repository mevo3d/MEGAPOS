-- Migración 007: Nómina y Recursos Humanos (SQLite)

-- 1. Agregar vendedor_id a ventas (SQLite no soporta FK en ALTER TABLE fácilmente, pero lo agregamos)
ALTER TABLE ventas ADD COLUMN vendedor_id INTEGER REFERENCES empleados(id);

-- 2. Detalles extendidos del empleado (Expediente RRHH)
CREATE TABLE IF NOT EXISTS empleados_detalle (
    empleado_id INTEGER PRIMARY KEY,
    rfc TEXT UNIQUE,
    curp TEXT UNIQUE,
    nss TEXT,
    direccion TEXT,
    fecha_ingreso DATE DEFAULT CURRENT_DATE,
    fecha_nacimiento DATE,
    contacto_emergencia TEXT,
    banco TEXT,
    clabe TEXT,
    salario_diario_integrado DECIMAL(10, 2) DEFAULT 0,
    periodicidad_pago TEXT DEFAULT 'semanal',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(empleado_id) REFERENCES empleados(id)
);

-- 3. Documentos digitales del empleado
CREATE TABLE IF NOT EXISTS empleados_documentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empleado_id INTEGER,
    nombre_documento TEXT NOT NULL,
    tipo_archivo TEXT,
    ruta_archivo TEXT NOT NULL,
    fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(empleado_id) REFERENCES empleados(id)
);

-- 4. Configuración de comisiones por empleado
CREATE TABLE IF NOT EXISTS configuracion_comisiones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empleado_id INTEGER UNIQUE,
    porcentaje_comision DECIMAL(5, 2) DEFAULT 0,
    activo INTEGER DEFAULT 1,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(empleado_id) REFERENCES empleados(id)
);

-- 5. Registro de comisiones generadas por venta
CREATE TABLE IF NOT EXISTS comisiones_generadas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id TEXT, -- UUID como TEXT en SQLite
    vendedor_id INTEGER,
    monto_venta DECIMAL(10, 2) NOT NULL,
    porcentaje_aplicado DECIMAL(5, 2) NOT NULL,
    monto_comision DECIMAL(10, 2) NOT NULL,
    estado TEXT DEFAULT 'pendiente',
    fecha_generacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    periodo_nomina_id INTEGER,
    FOREIGN KEY(venta_id) REFERENCES ventas(id),
    FOREIGN KEY(vendedor_id) REFERENCES empleados(id)
);

-- 6. Historial de puestos y movimientos
CREATE TABLE IF NOT EXISTS empleados_historial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    empleado_id INTEGER,
    tipo_movimiento TEXT,
    descripcion TEXT,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    usuario_registro_id INTEGER,
    FOREIGN KEY(empleado_id) REFERENCES empleados(id),
    FOREIGN KEY(usuario_registro_id) REFERENCES empleados(id)
);
