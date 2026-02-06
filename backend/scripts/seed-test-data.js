/**
 * Script para crear datos de prueba en SQLite
 * Ejecutar con: node scripts/seed-test-data.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/megamayoreo.db');

console.log('🌱 Iniciando seed de datos de prueba...\n');
console.log('📂 Base de datos:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error conectando a SQLite:', err.message);
        process.exit(1);
    }
    console.log('✅ Conectado a SQLite\n');
    seedData();
});

function seedData() {
    const hash = '$2b$10$zriYiKRBLSyppn240lsBu.NQWR4egiu8M7vsjaLCXWDWkZzxGT4i.'; // 123456

    db.serialize(() => {
        // 1. Sucursales adicionales
        console.log('📍 Creando sucursales...');
        db.run(`INSERT OR IGNORE INTO sucursales (id, nombre, tipo, codigo, direccion, activo) 
            VALUES (2, 'CEDIS Central', 'cedis', 'CED01', 'Av. Vallarta 1234, Guadalajara', 1)`);
        db.run(`INSERT OR IGNORE INTO sucursales (id, nombre, tipo, codigo, direccion, activo) 
            VALUES (3, 'Sucursal Zapopan', 'sucursal', 'SUC02', 'Plaza del Sol 567, Zapopan', 1)`);
        db.run(`INSERT OR IGNORE INTO sucursales (id, nombre, tipo, codigo, direccion, activo) 
            VALUES (4, 'Telemarketing Centro', 'telemarketing', 'TEL01', 'Centro Comercial 890', 1)`);

        // 2. Empleados adicionales
        console.log('👥 Creando empleados...');
        db.run(`INSERT OR IGNORE INTO empleados (id, nombre, email, username, password_hash, rol, activo, sucursal_id) 
            VALUES (2, 'Carlos Rutero', 'rutero1@test.com', 'rutero1', '${hash}', 'rutero', 1, 1)`);
        db.run(`INSERT OR IGNORE INTO empleados (id, nombre, email, username, password_hash, rol, activo, sucursal_id) 
            VALUES (3, 'Maria Rutero', 'rutero2@test.com', 'rutero2', '${hash}', 'rutero', 1, 1)`);
        db.run(`INSERT OR IGNORE INTO empleados (id, nombre, email, username, password_hash, rol, activo, sucursal_id) 
            VALUES (4, 'Juan Telemarketing', 'tele1@test.com', 'tele1', '${hash}', 'telemarketing', 1, 4)`);
        db.run(`INSERT OR IGNORE INTO empleados (id, nombre, email, username, password_hash, rol, activo, sucursal_id) 
            VALUES (5, 'SuperAdmin System', 'superadmin@megamayoreo.com', 'superadmin', '${hash}', 'superadmin', 1, 1)`);

        // 3. Clientes
        console.log('🧑‍💼 Creando clientes...');
        db.run(`INSERT OR IGNORE INTO clientes (id, nombre, telefono, direccion, activo) 
            VALUES (2, 'Abarrotes El Sol', '3312345678', 'Calle Principal 100, Guadalajara', 1)`);
        db.run(`INSERT OR IGNORE INTO clientes (id, nombre, telefono, direccion, activo) 
            VALUES (3, 'Tienda Doña Rosa', '3387654321', 'Av. México 200, Zapopan', 1)`);
        db.run(`INSERT OR IGNORE INTO clientes (id, nombre, telefono, direccion, activo) 
            VALUES (4, 'Minisuper La Esquina', '3311223344', 'Blvd. Juarez 300, Tlaquepaque', 1)`);
        db.run(`INSERT OR IGNORE INTO clientes (id, nombre, telefono, direccion, activo) 
            VALUES (5, 'Abarrotes La Central', '3355667788', 'Mercado de Abastos 45', 1)`);

        // 4. Productos
        console.log('📦 Creando productos...');
        db.run(`INSERT OR IGNORE INTO productos_catalogo (id, codigo, nombre, precio_venta, activo) 
            VALUES (1, 'SKU-0001', 'Refresco Cola 1L', 25.00, 1)`);
        db.run(`INSERT OR IGNORE INTO productos_catalogo (id, codigo, nombre, precio_venta, activo) 
            VALUES (2, 'SKU-0002', 'Agua Mineral 1L', 15.00, 1)`);
        db.run(`INSERT OR IGNORE INTO productos_catalogo (id, codigo, nombre, precio_venta, activo) 
            VALUES (3, 'SKU-0003', 'Galletas Surtidas', 35.00, 1)`);
        db.run(`INSERT OR IGNORE INTO productos_catalogo (id, codigo, nombre, precio_venta, activo) 
            VALUES (4, 'SKU-0004', 'Aceite Vegetal 1L', 45.00, 1)`);
        db.run(`INSERT OR IGNORE INTO productos_catalogo (id, codigo, nombre, precio_venta, activo) 
            VALUES (5, 'SKU-0005', 'Arroz Premium 1kg', 28.00, 1)`);

        // 5. Pedidos de coordinación
        console.log('📋 Creando pedidos de coordinación...');
        db.run(`INSERT OR IGNORE INTO pedidos_coordinacion 
            (id, folio, sucursal_origen_id, empleado_solicitante_id, cliente_id, 
             direccion_entrega, lat_entrega, lng_entrega, subtotal, impuestos, total, 
             estado, prioridad, origen) 
            VALUES (1, 'PED-2026-00001', 4, 4, 2, 
                    'Calle Principal 100, Guadalajara', 20.6720, -103.3460, 500, 80, 580, 
                    'pendiente', 'normal', 'telemarketing')`);

        db.run(`INSERT OR IGNORE INTO pedidos_coordinacion 
            (id, folio, sucursal_origen_id, empleado_solicitante_id, cliente_id, 
             direccion_entrega, lat_entrega, lng_entrega, subtotal, impuestos, total, 
             estado, prioridad, origen, rutero_asignado_id) 
            VALUES (2, 'PED-2026-00002', 4, 4, 3, 
                    'Av. México 200, Zapopan', 20.6800, -103.3380, 800, 128, 928, 
                    'aprobado', 'alta', 'telemarketing', 2)`);

        db.run(`INSERT OR IGNORE INTO pedidos_coordinacion 
            (id, folio, sucursal_origen_id, empleado_solicitante_id, cliente_id, 
             direccion_entrega, lat_entrega, lng_entrega, subtotal, impuestos, total, 
             estado, prioridad, origen, rutero_asignado_id) 
            VALUES (3, 'PED-2026-00003', 4, 4, 4, 
                    'Blvd. Juarez 300, Tlaquepaque', 20.6650, -103.3550, 1200, 192, 1392, 
                    'en_ruta', 'urgente', 'telemarketing', 2)`);

        db.run(`INSERT OR IGNORE INTO pedidos_coordinacion 
            (id, folio, sucursal_origen_id, empleado_solicitante_id, cliente_id, 
             direccion_entrega, lat_entrega, lng_entrega, subtotal, impuestos, total, 
             estado, prioridad, origen, rutero_asignado_id) 
            VALUES (4, 'PED-2026-00004', 4, 4, 5, 
                    'Mercado de Abastos 45', 20.6590, -103.3200, 350, 56, 406, 
                    'preparando', 'normal', 'telemarketing', 3)`);

        db.run(`INSERT OR IGNORE INTO pedidos_coordinacion 
            (id, folio, sucursal_origen_id, empleado_solicitante_id, cliente_id, 
             direccion_entrega, lat_entrega, lng_entrega, subtotal, impuestos, total, 
             estado, prioridad, origen) 
            VALUES (5, 'PED-2026-00005', 4, 4, 2, 
                    'Calle Principal 100, Guadalajara', 20.6720, -103.3460, 650, 104, 754, 
                    'pendiente', 'alta', 'telemarketing')`);

        // 6. Ubicaciones de ruteros
        console.log('📍 Agregando ubicaciones de ruteros...');
        db.run(`INSERT OR REPLACE INTO ruteros_ubicacion 
            (rutero_id, lat, lng, estado, ultima_actualizacion) 
            VALUES (2, 20.6750, -103.3420, 'activo', datetime('now'))`);
        db.run(`INSERT OR REPLACE INTO ruteros_ubicacion 
            (rutero_id, lat, lng, estado, ultima_actualizacion) 
            VALUES (3, 20.6680, -103.3500, 'activo', datetime('now'))`);

        // 7. Inventario en sucursales
        console.log('📊 Creando inventario...');
        db.run(`INSERT OR IGNORE INTO inventario_sucursal (sucursal_id, producto_id, stock_actual, stock_minimo) VALUES (1, 1, 100, 20)`);
        db.run(`INSERT OR IGNORE INTO inventario_sucursal (sucursal_id, producto_id, stock_actual, stock_minimo) VALUES (1, 2, 50, 10)`);
        db.run(`INSERT OR IGNORE INTO inventario_sucursal (sucursal_id, producto_id, stock_actual, stock_minimo) VALUES (1, 3, 200, 30)`);
        db.run(`INSERT OR IGNORE INTO inventario_sucursal (sucursal_id, producto_id, stock_actual, stock_minimo) VALUES (2, 1, 500, 100)`);
        db.run(`INSERT OR IGNORE INTO inventario_sucursal (sucursal_id, producto_id, stock_actual, stock_minimo) VALUES (2, 2, 300, 50)`);

        // Final message
        db.run("SELECT 1", [], function (err) {
            console.log('\n✅ ¡Datos de prueba creados correctamente!');
            console.log('');
            console.log('📊 Resumen:');
            console.log('   - 4 Sucursales (Principal, CEDIS, Zapopan, Telemarketing)');
            console.log('   - 5 Empleados (admin, superadmin, 2 ruteros, 1 telemarketing)');
            console.log('   - 5 Clientes');
            console.log('   - 5 Productos');
            console.log('   - 5 Pedidos de coordinación');
            console.log('   - 2 Ubicaciones de ruteros activos');
            console.log('   - 5 Registros de inventario');
            console.log('');
            console.log('🔑 Credenciales de prueba:');
            console.log('   - admin / 123456 (Admin)');
            console.log('   - superadmin / 123456 (SuperAdmin)');
            console.log('   - rutero1 / 123456 (Rutero)');
            console.log('   - rutero2 / 123456 (Rutero)');
            console.log('   - tele1 / 123456 (Telemarketing)');

            db.close();
            process.exit(0);
        });
    });
}
