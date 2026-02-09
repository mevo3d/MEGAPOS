const sqlite3 = require('sqlite3').verbose();
const logger = require('./logger');
const path = require('path');

// Usar SQLite como base de datos temporal mientras se instala PostgreSQL
const dbPath = path.join(__dirname, '../../data', 'megamayoreo.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        logger.error('Error abriendo base de datos SQLite:', err.message);
    } else {
        logger.info('✅ Conectado a SQLite (base de datos temporal)');

        // Crear tablas básicas si no existen
        db.serialize(() => {
            // Tabla de sucursales
            db.run(`
                CREATE TABLE IF NOT EXISTS sucursales (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT NOT NULL,
                    tipo TEXT DEFAULT 'sucursal',
                    codigo TEXT UNIQUE,
                    direccion TEXT,
                    activo INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Insertar sucursal por defecto si no existe
            db.run(`
                INSERT OR IGNORE INTO sucursales (id, nombre, tipo, codigo) 
                VALUES (1, 'Sucursal Principal', 'sucursal', 'SUC01')
            `);

            // Tabla de empleados (usuarios)
            db.run(`
                CREATE TABLE IF NOT EXISTS empleados (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sucursal_id INTEGER DEFAULT 1,
                    nombre TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    username TEXT UNIQUE,
                    password_hash TEXT NOT NULL,
                    rol TEXT DEFAULT 'cajero',
                    pin_acceso TEXT,
                    activo INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
                )
            `);

            // Crear usuario admin por defecto (password: admin123)
            // Hash generado con bcrypt para 'admin123'
            const adminHash = '$2b$10$zriYiKRBLSyppn240lsBu.NQWR4egiu8M7vsjaLCXWDWkZzxGT4i.';
            db.run(`
                INSERT OR IGNORE INTO empleados (id, nombre, email, username, password_hash, rol, activo, sucursal_id) 
                VALUES (1, 'Administrador', 'admin@megamayoreo.com', 'admin', '${adminHash}', 'admin', 1, 1)
            `);

            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            db.run(`
                CREATE TABLE IF NOT EXISTS products (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    price DECIMAL(10,2) NOT NULL,
                    stock INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Tabla de tipos de sucursal/tienda
            db.run(`
                CREATE TABLE IF NOT EXISTS tipos_sucursal (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    nombre TEXT UNIQUE NOT NULL,
                    descripcion TEXT,
                    color TEXT DEFAULT '#3B82F6',
                    icono TEXT DEFAULT 'Store',
                    activo INTEGER DEFAULT 1,
                    orden INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Insertar tipos de sucursal por defecto
            db.run(`INSERT OR IGNORE INTO tipos_sucursal (id, nombre, descripcion, color, icono, orden) VALUES (1, 'CEDIS', 'Centro de Distribución', '#10B981', 'Warehouse', 1)`);
            db.run(`INSERT OR IGNORE INTO tipos_sucursal (id, nombre, descripcion, color, icono, orden) VALUES (2, 'Sucursal', 'Sucursal de venta al público', '#3B82F6', 'Store', 2)`);
            db.run(`INSERT OR IGNORE INTO tipos_sucursal (id, nombre, descripcion, color, icono, orden) VALUES (3, 'Telemarketing', 'Ventas por teléfono', '#8B5CF6', 'Phone', 3)`);
            db.run(`INSERT OR IGNORE INTO tipos_sucursal (id, nombre, descripcion, color, icono, orden) VALUES (4, 'Rutas', 'Ventas en ruta/móvil', '#F59E0B', 'Truck', 4)`);

            // Tabla de puntos de venta (cajas)
            db.run(`
                CREATE TABLE IF NOT EXISTS puntos_venta (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sucursal_id INTEGER NOT NULL,
                    nombre TEXT NOT NULL,
                    tipo TEXT DEFAULT 'caja_cobro', -- caja_cobro, preparacion
                    estado TEXT DEFAULT 'cerrada', -- cerrada, abierta
                    activo INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id)
                )
            `);

            // Tabla de productos completa (EXTENDIDA con campos de facturas)
            db.run(`
                CREATE TABLE IF NOT EXISTS productos_catalogo (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    codigo TEXT UNIQUE,
                    sku TEXT,
                    codigo_barras TEXT,
                    nombre TEXT NOT NULL,
                    descripcion TEXT,
                    descripcion_corta TEXT,
                    categoria TEXT,
                    subcategoria TEXT,
                    marca TEXT,
                    modelo TEXT,
                    -- Precios
                    precio_compra DECIMAL(10,2) DEFAULT 0,
                    precio_venta DECIMAL(10,2) NOT NULL,
                    precio_1 DECIMAL(10,2) DEFAULT 0,
                    precio_2 DECIMAL(10,2) DEFAULT 0,
                    precio_3 DECIMAL(10,2) DEFAULT 0,
                    precio_4 DECIMAL(10,2) DEFAULT 0,
                    precio_5 DECIMAL(10,2) DEFAULT 0,
                    -- Códigos SAT/Fiscales
                    clave_sat TEXT,
                    unidad_sat TEXT,
                    -- Códigos del Proveedor
                    sku_proveedor TEXT,
                    nombre_proveedor TEXT,
                    clave_proveedor TEXT,
                    -- Dimensiones físicas
                    peso_kg DECIMAL(10,3),
                    ancho_cm DECIMAL(10,2),
                    largo_cm DECIMAL(10,2),
                    alto_cm DECIMAL(10,2),
                    volumen_cm3 DECIMAL(12,2),
                    -- Para papelería
                    gramaje TEXT,
                    -- Empaque
                    unidad_medida TEXT DEFAULT 'PIEZA',
                    tipo_empaque TEXT,
                    piezas_por_caja INTEGER,
                    cajas_por_tarima INTEGER,
                    -- SEO/Web
                    descripcion_seo TEXT,
                    palabras_clave TEXT,
                    -- Control
                    tiene_inventario INTEGER DEFAULT 1,
                    activo INTEGER DEFAULT 1,
                    procesado_ia INTEGER DEFAULT 0,
                    usuario_captura_id INTEGER,
                    capturado_desde TEXT,
                    fecha_llegada DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Migración para 5 Precios (Si la tabla ya existía)
            db.run("ALTER TABLE productos_catalogo ADD COLUMN precio_1 DECIMAL(10,2) DEFAULT 0", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN precio_2 DECIMAL(10,2) DEFAULT 0", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN precio_3 DECIMAL(10,2) DEFAULT 0", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN precio_4 DECIMAL(10,2) DEFAULT 0", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN precio_5 DECIMAL(10,2) DEFAULT 0", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN usuario_captura_id INTEGER", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN capturado_desde TEXT", (err) => { });
            // Migraciones para campos extendidos de productos (si tabla ya existe)
            db.run("ALTER TABLE productos_catalogo ADD COLUMN sku TEXT", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN codigo_barras TEXT", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN subcategoria TEXT", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN modelo TEXT", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN clave_sat TEXT", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN unidad_sat TEXT", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN clave_proveedor TEXT", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN peso_kg DECIMAL(10,3)", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN ancho_cm DECIMAL(10,2)", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN largo_cm DECIMAL(10,2)", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN alto_cm DECIMAL(10,2)", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN volumen_cm3 DECIMAL(12,2)", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN gramaje TEXT", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN unidad_medida TEXT DEFAULT 'PIEZA'", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN tipo_empaque TEXT", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN piezas_por_caja INTEGER", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN cajas_por_tarima INTEGER", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN fecha_llegada DATETIME", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => { });

            // Migraciones para campos extendidos de proveedores (si tabla ya existe)
            db.run("ALTER TABLE proveedores ADD COLUMN nombre_comercial TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN regimen_fiscal TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN colonia TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN ciudad TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN estado TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN codigo_postal TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN pais TEXT DEFAULT 'México'", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN telefono_2 TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN fax TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN email_2 TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN pagina_web TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN banco TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN cuenta_bancaria TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN clabe TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN condiciones_pago TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN limite_credito DECIMAL(12,2)", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN descuento_pronto_pago DECIMAL(5,2)", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN vendedor_asignado TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN vendedor_telefono TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN vendedor_email TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN tiempo_entrega_dias INTEGER", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN zona_entrega TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN categoria TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN tipo TEXT DEFAULT 'producto'", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN calificacion INTEGER DEFAULT 0", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN notas TEXT", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN fecha_alta DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN fecha_ultima_compra DATETIME", (err) => { });
            db.run("ALTER TABLE proveedores ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => { });

            // Tabla de Facturas Importadas (historial completo de compras)
            db.run(`
                CREATE TABLE IF NOT EXISTS facturas_importadas (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    proveedor_id INTEGER,
                    -- Datos del documento
                    tipo_documento TEXT DEFAULT 'factura', -- factura, nota, cotizacion, remision
                    numero_factura TEXT,
                    uuid TEXT,
                    folio_fiscal TEXT,
                    fecha_emision DATETIME,
                    fecha_llegada DATETIME DEFAULT CURRENT_TIMESTAMP,
                    -- Datos fiscales
                    forma_pago TEXT,
                    metodo_pago TEXT,
                    uso_cfdi TEXT,
                    moneda TEXT DEFAULT 'MXN',
                    tipo_cambio DECIMAL(10,4) DEFAULT 1,
                    regimen_fiscal_emisor TEXT,
                    -- Totales
                    subtotal DECIMAL(12,2),
                    descuento_total DECIMAL(12,2) DEFAULT 0,
                    iva DECIMAL(12,2),
                    isr_retenido DECIMAL(12,2) DEFAULT 0,
                    iva_retenido DECIMAL(12,2) DEFAULT 0,
                    total DECIMAL(12,2),
                    -- Condiciones
                    condiciones_pago TEXT,
                    orden_compra_ref TEXT,
                    anticipo DECIMAL(12,2) DEFAULT 0,
                    -- Logística
                    vendedor TEXT,
                    via_embarque TEXT,
                    condiciones_embarque TEXT,
                    -- Archivos
                    archivo_imagen TEXT,
                    archivo_xml TEXT,
                    archivo_pdf TEXT,
                    -- Control
                    estado TEXT DEFAULT 'procesada', -- procesada, verificada, cancelada
                    importado_por_id INTEGER,
                    sucursal_destino_id INTEGER,
                    notas TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(proveedor_id) REFERENCES proveedores(id),
                    FOREIGN KEY(importado_por_id) REFERENCES empleados(id),
                    FOREIGN KEY(sucursal_destino_id) REFERENCES sucursales(id)
                )
            `);

            // Detalle de productos de factura importada
            db.run(`
                CREATE TABLE IF NOT EXISTS facturas_importadas_detalle (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    factura_id INTEGER NOT NULL,
                    producto_id INTEGER,
                    -- Datos del producto en factura
                    clave_producto TEXT,
                    codigo_barras TEXT,
                    descripcion TEXT,
                    cantidad DECIMAL(10,3),
                    unidad TEXT,
                    -- Precios
                    precio_unitario DECIMAL(12,4),
                    descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
                    descuento_monto DECIMAL(12,2) DEFAULT 0,
                    importe DECIMAL(12,2),
                    iva_porcentaje DECIMAL(5,2) DEFAULT 16,
                    iva_monto DECIMAL(12,2),
                    total_linea DECIMAL(12,2),
                    -- Códigos SAT
                    clave_sat TEXT,
                    unidad_sat TEXT,
                    -- Dimensiones (opcionales)
                    peso_kg DECIMAL(10,3),
                    ancho_cm DECIMAL(10,2),
                    largo_cm DECIMAL(10,2),
                    alto_cm DECIMAL(10,2),
                    -- Página de origen (para multi-imagen)
                    pagina_origen INTEGER DEFAULT 1,
                    -- Control
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY(factura_id) REFERENCES facturas_importadas(id) ON DELETE CASCADE,
                    FOREIGN KEY(producto_id) REFERENCES productos_catalogo(id)
                )
            `);

            // ========================================
            // TABLA DE MAPEO: SKU Proveedor ↔ Producto Interno
            // Permite reconocer productos automáticamente por SKU del proveedor
            // mientras se mantiene un nombre comercial propio en el catálogo
            // ========================================
            db.run(`
                CREATE TABLE IF NOT EXISTS productos_proveedor_mapeo (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    producto_id INTEGER NOT NULL,
                    proveedor_id INTEGER NOT NULL,
                    -- Identificadores del proveedor
                    sku_proveedor TEXT NOT NULL,
                    codigo_barras_proveedor TEXT,
                    -- Descripción ORIGINAL de la factura (NO modifica tu nombre comercial)
                    descripcion_proveedor TEXT,
                    -- Unidad y conversión
                    unidad_proveedor TEXT,
                    factor_conversion DECIMAL(10,4) DEFAULT 1,
                    -- Precios históricos
                    ultimo_precio_compra DECIMAL(12,4),
                    fecha_ultimo_precio DATETIME,
                    -- Control
                    notas TEXT,
                    activo INTEGER DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    -- Restricciones
                    UNIQUE(proveedor_id, sku_proveedor),
                    FOREIGN KEY(producto_id) REFERENCES productos_catalogo(id) ON DELETE CASCADE,
                    FOREIGN KEY(proveedor_id) REFERENCES proveedores(id) ON DELETE CASCADE
                )
            `);

            // Índices para búsqueda rápida de mapeo
            db.run(`CREATE INDEX IF NOT EXISTS idx_mapeo_sku ON productos_proveedor_mapeo(sku_proveedor)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_mapeo_proveedor ON productos_proveedor_mapeo(proveedor_id)`);
            db.run(`CREATE INDEX IF NOT EXISTS idx_mapeo_producto ON productos_proveedor_mapeo(producto_id)`);

            // Tabla de imágenes de productos
            db.run(`
                CREATE TABLE IF NOT EXISTS productos_imagenes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    producto_id INTEGER NOT NULL,
                    nombre_archivo TEXT NOT NULL,
                    ruta_original TEXT,
                    ruta_procesada TEXT,
                    es_principal INTEGER DEFAULT 0,
                    orden INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (producto_id) REFERENCES productos_catalogo(id) ON DELETE CASCADE
                )
            `);

            // Tabla de inventario por sucursal
            db.run(`
                CREATE TABLE IF NOT EXISTS inventario_sucursal (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sucursal_id INTEGER NOT NULL,
                    producto_id INTEGER NOT NULL,
                    stock_actual INTEGER DEFAULT 0,
                    stock_minimo INTEGER DEFAULT 5,
                    ubicacion TEXT,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id),
                    FOREIGN KEY (producto_id) REFERENCES productos_catalogo(id),
                    UNIQUE(sucursal_id, producto_id)
                )
            `);

            // Tabla de movimientos de inventario (kardex)
            db.run(`
                CREATE TABLE IF NOT EXISTS movimientos_inventario (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    sucursal_id INTEGER NOT NULL,
                    producto_id INTEGER NOT NULL,
                    tipo_movimiento TEXT NOT NULL, -- entrada, salida, ajuste, venta, devolucion
                    cantidad INTEGER NOT NULL,
                    stock_anterior INTEGER,
                    stock_nuevo INTEGER,
                    referencia_id INTEGER, -- ID de venta, pedido, etc.
                    usuario_id INTEGER,
                    observaciones TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);



            // Tabla de Transferencias de Inventario (Dispersión y Solicitudes)
            db.run(`
                CREATE TABLE IF NOT EXISTS transferencias_inventario(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sucursal_origen_id INTEGER NOT NULL,
                sucursal_destino_id INTEGER NOT NULL,
                usuario_id INTEGER, --Quien creó la solicitud / envío
                    tipo TEXT DEFAULT 'envio', --envio(push), solicitud(pull)
                    estado TEXT DEFAULT 'pendiente', --pendiente(solicitud), en_transito(enviado), completada(recibido), cancelada
                    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_envio DATETIME,
                fecha_recepcion DATETIME,
                observaciones TEXT,
                FOREIGN KEY(sucursal_origen_id) REFERENCES sucursales(id),
                FOREIGN KEY(sucursal_destino_id) REFERENCES sucursales(id)
            )
            `);

            db.run(`
                CREATE TABLE IF NOT EXISTS transferencias_detalles(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                transferencia_id INTEGER NOT NULL,
                producto_id INTEGER NOT NULL,
                cantidad_solicitada INTEGER DEFAULT 0,
                cantidad_enviada INTEGER DEFAULT 0,
                cantidad_recibida INTEGER DEFAULT 0,
                FOREIGN KEY(transferencia_id) REFERENCES transferencias_inventario(id) ON DELETE CASCADE,
                FOREIGN KEY(producto_id) REFERENCES productos_catalogo(id)
            )
            `);

            // Tabla de pedidos (preparación)
            db.run(`
                CREATE TABLE IF NOT EXISTS pedidos(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sucursal_id INTEGER NOT NULL,
                punto_venta_origen_id INTEGER, --Donde se creó el pedido de preparación
                    empleado_id INTEGER,
                cliente_nombre TEXT DEFAULT 'Publico General',
                estado TEXT DEFAULT 'preparando', --preparando, enviado_caja, cobrado, cancelado
                    total DECIMAL(10, 2) DEFAULT 0,
                notas TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            `);

            // Items del pedido
            db.run(`
                CREATE TABLE IF NOT EXISTS pedidos_items(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pedido_id INTEGER NOT NULL,
                producto_id INTEGER NOT NULL,
                cantidad INTEGER NOT NULL,
                precio_unitario DECIMAL(10, 2) NOT NULL,
                subtotal DECIMAL(10, 2) NOT NULL,
                FOREIGN KEY(pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
            )
            `);

            // Tabla de cierres de caja (sesiones)
            db.run(`
                CREATE TABLE IF NOT EXISTS cierres_caja(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sucursal_id INTEGER NOT NULL,
                caja_id INTEGER NOT NULL,
                empleado_id INTEGER NOT NULL,
                fecha_apertura DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_cierre DATETIME,
                monto_inicial DECIMAL(10, 2) DEFAULT 0,
                ventas_efectivo DECIMAL(10, 2) DEFAULT 0,
                ventas_tarjeta DECIMAL(10, 2) DEFAULT 0,
                ventas_transferencia DECIMAL(10, 2) DEFAULT 0,
                otros_ingresos DECIMAL(10, 2) DEFAULT 0,
                retiros DECIMAL(10, 2) DEFAULT 0,
                total_sistema DECIMAL(10, 2) DEFAULT 0,
                total_fisico DECIMAL(10, 2) DEFAULT 0,
                diferencia DECIMAL(10, 2) DEFAULT 0,
                observaciones TEXT,
                estado TEXT DEFAULT 'abierta' -- abierta, cerrada
            )
            `);

            // Movimientos de dinero en caja
            db.run(`
                CREATE TABLE IF NOT EXISTS movimientos_caja(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cierre_id INTEGER NOT NULL,
                tipo TEXT NOT NULL, --ingreso, retiro
                    monto DECIMAL(10, 2) NOT NULL,
                concepto TEXT,
                usuario_autorizo INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(cierre_id) REFERENCES cierres_caja(id)
            )
            `);

            // Tabla de ventas (tickets finales)
            db.run(`
                CREATE TABLE IF NOT EXISTS ventas(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sucursal_id INTEGER NOT NULL,
                caja_id INTEGER,
                pedido_id INTEGER, --Referencia al pedido origen
                    empleado_id INTEGER,
                cliente_nombre TEXT DEFAULT 'Publico General',
                total DECIMAL(10, 2) NOT NULL,
                metodo_pago TEXT DEFAULT 'efectivo', --efectivo, tarjeta, mixto
                    efectivo_recibido DECIMAL(10, 2),
                cambio DECIMAL(10, 2),
                fecha_venta DATETIME DEFAULT CURRENT_TIMESTAMP,
                estado TEXT DEFAULT 'completada' -- completada, devuelta, cancelada
            )
            `);

            // Tabla de detalles de venta
            db.run(`
                CREATE TABLE IF NOT EXISTS ventas_detalle(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                venta_id INTEGER NOT NULL,
                producto_id INTEGER NOT NULL,
                cantidad INTEGER NOT NULL,
                precio_unitario DECIMAL(10, 2) NOT NULL,
                subtotal DECIMAL(10, 2) NOT NULL,
                nombre_producto TEXT,
                FOREIGN KEY(venta_id) REFERENCES ventas(id),
                FOREIGN KEY(producto_id) REFERENCES productos_catalogo(id)
            )
            `);

            // Tabla de métodos de pago
            db.run(`
                CREATE TABLE IF NOT EXISTS metodos_pago(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                venta_id INTEGER NOT NULL,
                metodo TEXT NOT NULL,
                monto DECIMAL(10, 2) NOT NULL,
                referencia TEXT,
                FOREIGN KEY(venta_id) REFERENCES ventas(id)
            )
            `);

            // --- FASE 1: COMPRAS Y CEDIS ---

            // Tabla de Proveedores (EXTENDIDA con todos los campos de facturas)
            db.run(`
                CREATE TABLE IF NOT EXISTS proveedores(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                nombre_comercial TEXT,
                rfc TEXT,
                regimen_fiscal TEXT,
                direccion TEXT,
                colonia TEXT,
                ciudad TEXT,
                estado TEXT,
                codigo_postal TEXT,
                pais TEXT DEFAULT 'México',
                contacto_nombre TEXT,
                telefono TEXT,
                telefono_2 TEXT,
                fax TEXT,
                email TEXT,
                email_2 TEXT,
                pagina_web TEXT,
                -- Datos Bancarios
                banco TEXT,
                cuenta_bancaria TEXT,
                clabe TEXT,
                -- Condiciones Comerciales
                dias_credito INTEGER DEFAULT 0,
                condiciones_pago TEXT,
                limite_credito DECIMAL(12,2),
                descuento_pronto_pago DECIMAL(5,2),
                -- Vendedor/Agente asignado
                vendedor_asignado TEXT,
                vendedor_telefono TEXT,
                vendedor_email TEXT,
                -- Logística
                tiempo_entrega_dias INTEGER,
                zona_entrega TEXT,
                -- Clasificación
                categoria TEXT,
                tipo TEXT DEFAULT 'producto', -- producto, servicio, mixto
                calificacion INTEGER DEFAULT 0, -- 1-5 estrellas
                notas TEXT,
                -- Control
                activo INTEGER DEFAULT 1,
                fecha_alta DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_ultima_compra DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            `);

            // Tabla de Órdenes de Compra (Cabecera)
            db.run(`
                CREATE TABLE IF NOT EXISTS ordenes_compra(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                proveedor_id INTEGER NOT NULL,
                sucursal_destino_id INTEGER NOT NULL,
                usuario_creador_id INTEGER,
                fecha_emision DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_estimada_entrega DATETIME,
                estado TEXT DEFAULT 'borrador', --borrador, emitida, recibida_parcial, recibida_total, cancelada
                    total_estimado DECIMAL(10, 2) DEFAULT 0,
                observaciones TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(proveedor_id) REFERENCES proveedores(id),
                FOREIGN KEY(sucursal_destino_id) REFERENCES sucursales(id)
            )
            `);

            // Detalles de Orden de Compra
            db.run(`
                CREATE TABLE IF NOT EXISTS ordenes_compra_detalles(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                orden_id INTEGER NOT NULL,
                producto_id INTEGER NOT NULL,
                cantidad_solicitada INTEGER NOT NULL,
                cantidad_recibida INTEGER DEFAULT 0,
                costo_unitario DECIMAL(10, 2) DEFAULT 0,
                subtotal DECIMAL(10, 2) DEFAULT 0,
                FOREIGN KEY(orden_id) REFERENCES ordenes_compra(id) ON DELETE CASCADE,
                FOREIGN KEY(producto_id) REFERENCES productos_catalogo(id)
            )
            `);

            // Recepciones de Mercancía (Cabecera)
            db.run(`
                CREATE TABLE IF NOT EXISTS recepciones(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                orden_compra_id INTEGER,
                sucursal_id INTEGER NOT NULL,
                usuario_recibio_id INTEGER,
                fecha_recepcion DATETIME DEFAULT CURRENT_TIMESTAMP,
                factura_proveedor TEXT, --Referencia de factura física / XML
                    estado TEXT DEFAULT 'finalizada', --en_proceso, finalizada
                    observaciones TEXT,
                FOREIGN KEY(orden_compra_id) REFERENCES ordenes_compra(id)
            )
            `);

            // Detalles de Recepción (Qué llegó realmente)
            db.run(`
                CREATE TABLE IF NOT EXISTS recepciones_detalles(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recepcion_id INTEGER NOT NULL,
                producto_id INTEGER NOT NULL,
                cantidad_recibida INTEGER NOT NULL,
                lote TEXT,
                fecha_caducidad DATE,
                FOREIGN KEY(recepcion_id) REFERENCES recepciones(id) ON DELETE CASCADE,
                FOREIGN KEY(producto_id) REFERENCES productos_catalogo(id)
            )
            `);

            // Ubicaciones en Bodega (Mapa del CEDIS/Sucursal)
            db.run(`
                CREATE TABLE IF NOT EXISTS ubicaciones_bodega(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sucursal_id INTEGER NOT NULL,
                nombre TEXT NOT NULL, --Ej: Pasillo A, Rack 1
                    tipo TEXT DEFAULT 'general', --general, picking, cuarentena, merma
                    codigo_barras TEXT UNIQUE,
                activo INTEGER DEFAULT 1,
                FOREIGN KEY(sucursal_id) REFERENCES sucursales(id)
            )
            `);

            // Alias para ubicaciones (compatibilidad)
            db.run(`
                CREATE TABLE IF NOT EXISTS ubicaciones(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sucursal_id INTEGER NOT NULL,
                codigo TEXT NOT NULL,
                tipo TEXT DEFAULT 'general',
                notas TEXT,
                activo INTEGER DEFAULT 1,
                FOREIGN KEY(sucursal_id) REFERENCES sucursales(id)
            )
            `);

            // Tabla de productos en ubicaciones
            db.run(`
                CREATE TABLE IF NOT EXISTS producto_ubicaciones(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ubicacion_id INTEGER NOT NULL,
                producto_id INTEGER NOT NULL,
                cantidad INTEGER DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(ubicacion_id) REFERENCES ubicaciones(id),
                FOREIGN KEY(producto_id) REFERENCES productos_catalogo(id),
                UNIQUE(ubicacion_id, producto_id)
            )
            `);

            // === MÓDULO FALTANTES ===
            // Tabla de solicitudes de productos faltantes (sucursales -> CEDIS)
            db.run(`
                CREATE TABLE IF NOT EXISTS solicitudes_faltantes(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sucursal_id INTEGER NOT NULL,
                producto_id INTEGER NOT NULL,
                cantidad_solicitada INTEGER NOT NULL,
                cantidad_aprobada INTEGER DEFAULT 0,
                tipo TEXT DEFAULT 'manual', -- 'auto' (detectado por sistema) | 'manual' (solicitado por usuario)
                urgencia TEXT DEFAULT 'normal', -- 'baja' | 'normal' | 'alta' | 'urgente'
                estado TEXT DEFAULT 'pendiente', -- 'pendiente' | 'aprobada' | 'rechazada' | 'despachada' | 'cancelada'
                notas TEXT,
                usuario_solicitante_id INTEGER,
                usuario_aprobador_id INTEGER,
                fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_respuesta DATETIME,
                traspaso_id INTEGER, -- Se llena cuando se genera el traspaso
                FOREIGN KEY(sucursal_id) REFERENCES sucursales(id),
                FOREIGN KEY(producto_id) REFERENCES productos_catalogo(id),
                FOREIGN KEY(usuario_solicitante_id) REFERENCES empleados(id),
                FOREIGN KEY(usuario_aprobador_id) REFERENCES empleados(id),
                FOREIGN KEY(traspaso_id) REFERENCES traspasos(id)
            )
            `);

            // Tabla de rutas para ruteros
            db.run(`
                CREATE TABLE IF NOT EXISTS rutas(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                sucursal_id INTEGER NOT NULL,
                rutero_id INTEGER,
                activo INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(sucursal_id) REFERENCES sucursales(id),
                FOREIGN KEY(rutero_id) REFERENCES empleados(id)
            )
            `);

            // Inventario de ruteros
            db.run(`
                CREATE TABLE IF NOT EXISTS inventario_ruta(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ruta_id INTEGER NOT NULL,
                producto_id INTEGER NOT NULL,
                cantidad INTEGER DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(ruta_id) REFERENCES rutas(id),
                FOREIGN KEY(producto_id) REFERENCES productos_catalogo(id),
                UNIQUE(ruta_id, producto_id)
            )
            `);


            // --- FASE 2: EXPANSIÓN COMERCIAL (CRM, Telemarketing) ---

            // Listas de Precios
            db.run(`
                CREATE TABLE IF NOT EXISTS listas_precios(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL, --Publico, Mayoreo, Distribuidor
                    descripcion TEXT,
                porcentaje_descuento DECIMAL(5, 2) DEFAULT 0, --Descuento base sobre precio público
                    activo INTEGER DEFAULT 1
            )
            `);
            // Seed Listas
            db.run(`INSERT OR IGNORE INTO listas_precios(id, nombre, porcentaje_descuento) VALUES(1, 'Público General', 0)`);
            db.run(`INSERT OR IGNORE INTO listas_precios(id, nombre, porcentaje_descuento) VALUES(2, 'Mayoreo', 10)`);
            db.run(`INSERT OR IGNORE INTO listas_precios(id, nombre, porcentaje_descuento) VALUES(3, 'Distribuidor', 20)`);

            // Tabla de Clientes
            db.run(`
                CREATE TABLE IF NOT EXISTS clientes(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                rfc TEXT,
                email TEXT,
                telefono TEXT,
                direccion TEXT,
                ciudad TEXT,
                codigo_postal TEXT,
                lista_precio_id INTEGER DEFAULT 1,
                dias_credito INTEGER DEFAULT 0,
                limite_credito DECIMAL(10, 2) DEFAULT 0,
                saldo_actual DECIMAL(10, 2) DEFAULT 0,
                vendedor_asignado_id INTEGER,
                activo INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(lista_precio_id) REFERENCES listas_precios(id)
            )
            `);

            // Seed Cliente General
            db.run(`INSERT OR IGNORE INTO clientes(id, nombre, lista_precio_id) VALUES(1, 'Público en General', 1)`);

            // Notas CRM / Seguimiento
            db.run(`
                CREATE TABLE IF NOT EXISTS crm_notas(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_id INTEGER NOT NULL,
                usuario_id INTEGER NOT NULL,
                nota TEXT NOT NULL,
                tipo_accion TEXT DEFAULT 'nota', --llamada, visita, mensaje, nota
                    fecha_contacto DATETIME DEFAULT CURRENT_TIMESTAMP,
                fecha_proximo_contacto DATETIME,
                completado INTEGER DEFAULT 1,
                FOREIGN KEY(cliente_id) REFERENCES clientes(id),
                FOREIGN KEY(usuario_id) REFERENCES empleados(id)
            )
            `);


            // Tabla de Transacciones de Pago (Raw)
            db.run(`
                CREATE TABLE IF NOT EXISTS pagos_transacciones(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                proveedor TEXT NOT NULL, --spei, mercadopago, efectivo
                    external_id TEXT, --ID de rastreo banco / MP ID
                    monto DECIMAL(10, 2) NOT NULL,
                referencia_interna TEXT, --Order ID or unique Ref
                    metadata TEXT, --JSON Payload
                    estado TEXT DEFAULT 'pending', --pending, approved, rejected
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            `);

            // Tabla de Auditoría (Logs críticos)
            db.run(`
                CREATE TABLE IF NOT EXISTS audit_logs(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                entity_type TEXT NOT NULL, --pedido, pago, inventario
                    entity_id INTEGER NOT NULL,
                action TEXT NOT NULL, --STATUS_CHANGE, CONFIRMATION, etc.
                    user_id INTEGER,
                details TEXT, --JSON or text
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            `);

            // Migraciones/Updates de tablas existentes
            db.run("ALTER TABLE pedidos ADD COLUMN cliente_id INTEGER REFERENCES clientes(id)", (err) => { });
            db.run("ALTER TABLE ventas ADD COLUMN cliente_id INTEGER REFERENCES clientes(id)", (err) => { });

            // Migration for Payment Module
            db.run("ALTER TABLE pedidos ADD COLUMN estado_pago TEXT DEFAULT 'pendiente'", (err) => {
                if (!err) logger.info('✅ Columna estado_pago agregada a pedidos');
            });

            // Migración para sucursales (campos faltantes)
            db.run("ALTER TABLE sucursales ADD COLUMN telefono TEXT", (err) => { });
            db.run("ALTER TABLE sucursales ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => { });

            // Tabla de Configuración del Sistema
            db.run(`
                CREATE TABLE IF NOT EXISTS configuracion_sistema(
                clave TEXT PRIMARY KEY,
                valor TEXT NOT NULL,
                descripcion TEXT,
                actualizado_por INTEGER,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            `);

            // Tabla de Archivos del Sistema (Logos, etc.)
            db.run(`
                CREATE TABLE IF NOT EXISTS archivos_sistema(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre_original TEXT NOT NULL,
                nombre_guardado TEXT NOT NULL,
                tipo_archivo TEXT,
                ruta_archivo TEXT,
                tipo TEXT, --logo, etc.
                    tamaño INTEGER,
                activo INTEGER DEFAULT 1,
                actualizado_por INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            `);

            // Pagos de Clientes (Cuentas por Cobrar)
            db.run(`
                CREATE TABLE IF NOT EXISTS pagos_clientes(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_id INTEGER NOT NULL,
                usuario_id INTEGER NOT NULL,
                monto DECIMAL(10, 2) NOT NULL,
                metodo_pago TEXT DEFAULT 'efectivo', --efectivo, transferencia, etc.
                    referencia TEXT,
                fecha_pago DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(cliente_id) REFERENCES clientes(id)
            )
            `);

            // Puntos de Lealtad del Cliente
            db.run(`
                CREATE TABLE IF NOT EXISTS puntos_cliente(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_id INTEGER NOT NULL UNIQUE,
                puntos_actuales INTEGER DEFAULT 0,
                total_acumulados INTEGER DEFAULT 0,
                total_canjeados INTEGER DEFAULT 0,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(cliente_id) REFERENCES clientes(id)
            )
            `);

            // --- CLASIFICACIÓN DE CLIENTES (CRM AVANZADO) ---

            // Tabla de tipos/categorías de clientes
            db.run(`
                CREATE TABLE IF NOT EXISTS tipos_cliente(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT UNIQUE NOT NULL,
                descripcion TEXT,
                color TEXT DEFAULT '#6366f1',
                icono TEXT DEFAULT 'user',
                prioridad INTEGER DEFAULT 0,
                activo INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            `);

            // Insertar tipos de cliente predeterminados
            db.run(`INSERT OR IGNORE INTO tipos_cliente(id, nombre, descripcion, color, icono, prioridad) VALUES(1, 'Prospecto', 'Cliente potencial sin compras previas', '#94a3b8', 'user-plus', 1)`);
            db.run(`INSERT OR IGNORE INTO tipos_cliente(id, nombre, descripcion, color, icono, prioridad) VALUES(2, 'Ocasional', 'Cliente con compras esporádicas', '#60a5fa', 'shopping-cart', 2)`);
            db.run(`INSERT OR IGNORE INTO tipos_cliente(id, nombre, descripcion, color, icono, prioridad) VALUES(3, 'Regular', 'Cliente con compras recurrentes', '#34d399', 'repeat', 3)`);
            db.run(`INSERT OR IGNORE INTO tipos_cliente(id, nombre, descripcion, color, icono, prioridad) VALUES(4, 'Frecuente', 'Cliente con alta frecuencia de compra', '#fbbf24', 'star', 4)`);
            db.run(`INSERT OR IGNORE INTO tipos_cliente(id, nombre, descripcion, color, icono, prioridad) VALUES(5, 'VIP', 'Cliente premium con beneficios especiales', '#f472b6', 'crown', 5)`);
            db.run(`INSERT OR IGNORE INTO tipos_cliente(id, nombre, descripcion, color, icono, prioridad) VALUES(6, 'Mayorista', 'Cliente de compras al mayoreo', '#a78bfa', 'building', 4)`);
            db.run(`INSERT OR IGNORE INTO tipos_cliente(id, nombre, descripcion, color, icono, prioridad) VALUES(7, 'Distribuidor', 'Distribuidor autorizado', '#22d3d8', 'truck', 5)`);
            db.run(`INSERT OR IGNORE INTO tipos_cliente(id, nombre, descripcion, color, icono, prioridad) VALUES(8, 'Inactivo', 'Cliente sin compras recientes', '#6b7280', 'user-x', 0)`);

            // Tabla de etiquetas para clientes
            db.run(`
                CREATE TABLE IF NOT EXISTS etiquetas_cliente(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT UNIQUE NOT NULL,
                color TEXT DEFAULT '#8b5cf6',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            `);

            // Insertar etiquetas predeterminadas
            db.run(`INSERT OR IGNORE INTO etiquetas_cliente(id, nombre, color) VALUES(1, 'Pago puntual', '#22c55e')`);
            db.run(`INSERT OR IGNORE INTO etiquetas_cliente(id, nombre, color) VALUES(2, 'Requiere seguimiento', '#f59e0b')`);
            db.run(`INSERT OR IGNORE INTO etiquetas_cliente(id, nombre, color) VALUES(3, 'Alto ticket', '#8b5cf6')`);
            db.run(`INSERT OR IGNORE INTO etiquetas_cliente(id, nombre, color) VALUES(4, 'Nuevo', '#3b82f6')`);
            db.run(`INSERT OR IGNORE INTO etiquetas_cliente(id, nombre, color) VALUES(5, 'Reactivar', '#ef4444')`);
            db.run(`INSERT OR IGNORE INTO etiquetas_cliente(id, nombre, color) VALUES(6, 'Referido', '#06b6d4')`);
            db.run(`INSERT OR IGNORE INTO etiquetas_cliente(id, nombre, color) VALUES(7, 'Crédito aprobado', '#10b981')`);
            db.run(`INSERT OR IGNORE INTO etiquetas_cliente(id, nombre, color) VALUES(8, 'Zona norte', '#6366f1')`);
            db.run(`INSERT OR IGNORE INTO etiquetas_cliente(id, nombre, color) VALUES(9, 'Zona sur', '#ec4899')`);
            db.run(`INSERT OR IGNORE INTO etiquetas_cliente(id, nombre, color) VALUES(10, 'Zona centro', '#f97316')`);

            // Relación clientes <-> etiquetas
            db.run(`
                CREATE TABLE IF NOT EXISTS clientes_etiquetas(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cliente_id INTEGER NOT NULL,
                etiqueta_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
                FOREIGN KEY(etiqueta_id) REFERENCES etiquetas_cliente(id) ON DELETE CASCADE,
                UNIQUE(cliente_id, etiqueta_id)
            )
            `);

            // Agregar campos de clasificación a clientes
            db.run("ALTER TABLE clientes ADD COLUMN tipo_cliente_id INTEGER REFERENCES tipos_cliente(id)", (err) => { });
            db.run("ALTER TABLE clientes ADD COLUMN potencial_compra TEXT DEFAULT 'medio'", (err) => { });
            db.run("ALTER TABLE clientes ADD COLUMN frecuencia_compra TEXT DEFAULT 'ocasional'", (err) => { });
            db.run("ALTER TABLE clientes ADD COLUMN ultima_compra DATETIME", (err) => { });
            db.run("ALTER TABLE clientes ADD COLUMN total_compras DECIMAL(12,2) DEFAULT 0", (err) => { });
            db.run("ALTER TABLE clientes ADD COLUMN cantidad_compras INTEGER DEFAULT 0", (err) => { });
            db.run("ALTER TABLE clientes ADD COLUMN notas_crm TEXT", (err) => { });

            logger.info('🏷️ Tablas de Clasificación de Clientes creadas/verificadas');

            // --- FASE 6: COORDINACIÓN DE PEDIDOS ---

            // Tabla principal de pedidos de coordinación
            db.run(`
                CREATE TABLE IF NOT EXISTS pedidos_coordinacion(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                folio TEXT UNIQUE NOT NULL,
                sucursal_origen_id INTEGER REFERENCES sucursales(id),
                empleado_solicitante_id INTEGER REFERENCES empleados(id),
                cliente_id INTEGER REFERENCES clientes(id),
                direccion_entrega TEXT,
                lat_entrega REAL,
                lng_entrega REAL,
                referencia_entrega TEXT,
                contacto_entrega TEXT,
                telefono_entrega TEXT,
                subtotal REAL NOT NULL DEFAULT 0,
                impuestos REAL NOT NULL DEFAULT 0,
                costo_envio REAL DEFAULT 0,
                descuento REAL DEFAULT 0,
                total REAL NOT NULL DEFAULT 0,
                estado TEXT DEFAULT 'pendiente',
                prioridad TEXT DEFAULT 'normal',
                rutero_asignado_id INTEGER REFERENCES empleados(id),
                ruta_asignada_id INTEGER,
                fecha_asignacion TEXT,
                aprobado_por_id INTEGER REFERENCES empleados(id),
                fecha_aprobacion TEXT,
                motivo_rechazo TEXT,
                fecha_entrega_estimada TEXT,
                fecha_entrega_real TEXT,
                firma_recepcion TEXT,
                foto_entrega TEXT,
                notas_entrega TEXT,
                metodo_pago TEXT,
                estado_pago TEXT DEFAULT 'pendiente',
                origen TEXT DEFAULT 'telemarketing',
                notas TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            `);

            // Detalle de pedidos de coordinación
            db.run(`
                CREATE TABLE IF NOT EXISTS pedidos_coordinacion_detalle(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pedido_id INTEGER REFERENCES pedidos_coordinacion(id) ON DELETE CASCADE,
                producto_id INTEGER REFERENCES productos_catalogo(id),
                cantidad REAL NOT NULL,
                precio_unitario REAL NOT NULL,
                descuento_unitario REAL DEFAULT 0,
                subtotal REAL NOT NULL,
                nombre_producto TEXT,
                sku TEXT,
                preparado INTEGER DEFAULT 0,
                notas TEXT
            )
            `);

            // Historial de estados del pedido
            db.run(`
                CREATE TABLE IF NOT EXISTS pedidos_historial(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pedido_id INTEGER REFERENCES pedidos_coordinacion(id) ON DELETE CASCADE,
                estado_anterior TEXT,
                estado_nuevo TEXT NOT NULL,
                empleado_id INTEGER REFERENCES empleados(id),
                notas TEXT,
                ubicacion_lat REAL,
                ubicacion_lng REAL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
            `);

            // Tracking de entregas en tiempo real
            db.run(`
                CREATE TABLE IF NOT EXISTS tracking_entregas(
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
            )
            `);

            // Ubicación actual de ruteros
            db.run(`
                CREATE TABLE IF NOT EXISTS ruteros_ubicacion(
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
            )
            `);

            // Índices para coordinación
            db.run('CREATE INDEX IF NOT EXISTS idx_pedidos_coord_estado ON pedidos_coordinacion(estado)');
            db.run('CREATE INDEX IF NOT EXISTS idx_pedidos_coord_rutero ON pedidos_coordinacion(rutero_asignado_id)');
            db.run('CREATE INDEX IF NOT EXISTS idx_pedidos_coord_cliente ON pedidos_coordinacion(cliente_id)');

            db.run("ALTER TABLE puntos_venta ADD COLUMN es_maestra INTEGER DEFAULT 1", (err) => { });
            db.run("ALTER TABLE empleados ADD COLUMN caja_asignada_id INTEGER REFERENCES puntos_venta(id)", (err) => { });

            // ========= MIGRACIONES PARA MÓDULO DE COMPRAS =========

            // Tabla de Órdenes de Compra
            db.run(`
                CREATE TABLE IF NOT EXISTS ordenes_compra (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    proveedor_id INTEGER REFERENCES proveedores(id),
                    sucursal_destino_id INTEGER REFERENCES sucursales(id),
                    estado TEXT DEFAULT 'borrador', -- borrador, emitida, enviada, recibida_parcial, recibida, cancelada
                    folio TEXT,
                    fecha_emision DATETIME,
                    fecha_estimada_llegada DATETIME,
                    fecha_recepcion DATETIME,
                    subtotal DECIMAL(12,2) DEFAULT 0,
                    impuestos DECIMAL(12,2) DEFAULT 0,
                    descuento DECIMAL(12,2) DEFAULT 0,
                    total_estimado DECIMAL(12,2) DEFAULT 0,
                    total_recibido DECIMAL(12,2) DEFAULT 0,
                    notas TEXT,
                    creado_por_id INTEGER REFERENCES empleados(id),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Detalle de Órdenes de Compra
            db.run(`
                CREATE TABLE IF NOT EXISTS ordenes_compra_detalle (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    orden_id INTEGER REFERENCES ordenes_compra(id) ON DELETE CASCADE,
                    producto_id INTEGER REFERENCES productos_catalogo(id),
                    cantidad_solicitada INTEGER DEFAULT 0,
                    cantidad_recibida INTEGER DEFAULT 0,
                    precio_unitario DECIMAL(10,2) DEFAULT 0,
                    subtotal DECIMAL(12,2) DEFAULT 0,
                    nombre_producto TEXT,
                    sku TEXT
                )
            `);

            // Migraciones para columnas faltantes en productos_catalogo
            db.run("ALTER TABLE productos_catalogo ADD COLUMN punto_reorden INTEGER DEFAULT 10", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN stock_minimo INTEGER DEFAULT 5", (err) => { });
            db.run("ALTER TABLE productos_catalogo ADD COLUMN stock_maximo INTEGER DEFAULT 100", (err) => { });

            // Migraciones para columnas faltantes en transferencias_inventario
            db.run("ALTER TABLE transferencias_inventario ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => { });
            db.run("ALTER TABLE transferencias_inventario ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP", (err) => { });
            db.run("ALTER TABLE transferencias_inventario ADD COLUMN solicitado_por_id INTEGER REFERENCES empleados(id)", (err) => { });

            // Migraciones para facturas_importadas
            db.run("ALTER TABLE facturas_importadas ADD COLUMN estado TEXT DEFAULT 'procesada'", (err) => { });

            logger.info('📦 Tablas de Coordinación de Pedidos creadas/verificadas');
            logger.info('🛒 Tablas de Órdenes de Compra creadas/verificadas');

            logger.info('📊 Tablas básicas creadas/verificadas');
            logger.info('👤 Usuario admin creado: admin@megamayoreo.com / admin123');
            logger.info('🏪 Tipos de sucursal inicializados: CEDIS, Sucursal, Telemarketing, Rutas');
            logger.info('📦 Tablas operativas (Cajas, Inventario, Pedidos) listas');
            logger.info('Truck Tablas Fase 1 (Compras, Proveedores, CEDIS) listas');
        });
    }
});

const connectDB = async () => {
    return new Promise((resolve, reject) => {
        if (db) {
            logger.info('✅ Base de datos SQLite lista');
            resolve(db);
        } else {
            reject(new Error('No se pudo conectar a SQLite'));
        }
    });
};

// Simular la interfaz de PostgreSQL para compatibilidad
const query = (text, params = []) => {
    return new Promise((resolve, reject) => {
        let sql = text;
        const sqliteParams = [];

        if (sql.includes('?') && !sql.includes('$')) {
            sqliteParams.push(...params);
        } else {
            sql = sql.replace(/\$(\d+)/g, (match, number) => {
                const index = parseInt(number) - 1;
                // SQLite expects parameters in order of appearance
                if (index >= 0 && index < params.length) {
                    sqliteParams.push(params[index]);
                } else {
                    sqliteParams.push(null); // Or undefined, to match behavior
                }
                return '?';
            });
        }

        // Ejecutar consulta
        const execute = (cb) => {
            if (sql.trim().toLowerCase().startsWith('select') || sql.trim().toLowerCase().includes('returning')) {
                db.all(sql, sqliteParams, (err, rows) => {
                    if (err) {
                        logger.error('Error en consulta SQLite:', err.message);
                        reject(err);
                    } else {
                        resolve({ rows: rows || [] });
                    }
                });
            } else {
                db.run(sql, sqliteParams, function (err) {
                    if (err) {
                        logger.error('Error en consulta SQLite:', err.message);
                        reject(err);
                    } else {
                        resolve({
                            rows: [],
                            rowCount: this.changes || 0,
                            id: this.lastID
                        });
                    }
                });
            }
        };

        execute();
    });
};

// Crear objeto pool compatible con PostgreSQL
const pool = {
    query: query,
    connect: async () => {
        // SQLite no necesita conexiones, retornamos un cliente mock
        return {
            query: query,
            release: () => { }
        };
    }
};

module.exports = db;  // Exportar db directamente para compatibilidad con dbAdapter
module.exports.connectDB = connectDB;
module.exports.query = query;
module.exports.pool = pool;  // Exportar pool para compatibilidad con código existente

