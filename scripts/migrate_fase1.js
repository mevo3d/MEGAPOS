/**
 * Migración Fase 1: Fundamentos MEGAMAYOREO
 * - Sucursales reales
 * - Tablas para sistema de puntos
 * - Tablas para rutas
 * - Tablas para zonas de precio
 */

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/megamayoreo.db');

const migrations = [
    // 1. Agregar sucursales reales
    `INSERT OR IGNORE INTO sucursales (id, nombre, direccion, activo) VALUES 
        (1, 'Globolandia', 'Cuautla, Morelos', 1)`,
    `INSERT OR IGNORE INTO sucursales (id, nombre, direccion, activo) VALUES 
        (2, 'Megacentro', 'Cuautla, Morelos', 1)`,
    `INSERT OR IGNORE INTO sucursales (id, nombre, direccion, activo) VALUES 
        (3, 'Todo de Papelería', 'Cuautla, Morelos', 1)`,
    `INSERT OR IGNORE INTO sucursales (id, nombre, direccion, activo) VALUES 
        (4, 'CEDIS Central', 'Cuautla, Morelos', 1)`,

    // 2. Sistema de puntos
    `CREATE TABLE IF NOT EXISTS puntos_cliente (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL UNIQUE,
        puntos_actuales INTEGER DEFAULT 0,
        puntos_totales_acumulados INTEGER DEFAULT 0,
        puntos_totales_canjeados INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS historial_puntos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL,
        tipo TEXT NOT NULL,
        puntos INTEGER NOT NULL,
        venta_id INTEGER,
        descripcion TEXT,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // 3. Rutas de distribución
    `CREATE TABLE IF NOT EXISTS rutas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        codigo TEXT UNIQUE,
        empleado_id INTEGER,
        zona_cobertura TEXT,
        dias_trabajo TEXT,
        activo INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS inventario_ruta (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ruta_id INTEGER NOT NULL,
        producto_id INTEGER NOT NULL,
        cantidad INTEGER DEFAULT 0,
        fecha_carga DATE
    )`,

    // 4. Zonas de precio por distancia
    `CREATE TABLE IF NOT EXISTS zonas_precio (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        km_desde INTEGER DEFAULT 0,
        km_hasta INTEGER,
        incremento_porcentaje DECIMAL(5,2) DEFAULT 0,
        activo INTEGER DEFAULT 1
    )`,

    // 5. Visitas de ruteros
    `CREATE TABLE IF NOT EXISTS visitas_ruteros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ruta_id INTEGER,
        cliente_id INTEGER,
        empleado_id INTEGER,
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        latitud DECIMAL(10,8),
        longitud DECIMAL(11,8),
        qr_checkin INTEGER DEFAULT 0,
        notas TEXT,
        resultado TEXT,
        venta_id INTEGER
    )`,

    // 6. QR codes para clientes
    `CREATE TABLE IF NOT EXISTS clientes_qr (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER UNIQUE,
        codigo_qr TEXT UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // 7. Zonas de precio iniciales
    `INSERT OR IGNORE INTO zonas_precio (id, nombre, km_desde, km_hasta, incremento_porcentaje) VALUES 
        (1, 'Local (Tienda)', 0, 0, 0)`,
    `INSERT OR IGNORE INTO zonas_precio (id, nombre, km_desde, km_hasta, incremento_porcentaje) VALUES 
        (2, 'Zona 1 (0-10km)', 1, 10, 5)`,
    `INSERT OR IGNORE INTO zonas_precio (id, nombre, km_desde, km_hasta, incremento_porcentaje) VALUES 
        (3, 'Zona 2 (10-20km)', 11, 20, 10)`,
    `INSERT OR IGNORE INTO zonas_precio (id, nombre, km_desde, km_hasta, incremento_porcentaje) VALUES 
        (4, 'Zona 3 (20-30km)', 21, 30, 15)`,
    `INSERT OR IGNORE INTO zonas_precio (id, nombre, km_desde, km_hasta, incremento_porcentaje) VALUES 
        (5, 'Zona 4 (30-50km)', 31, 50, 20)`,

    // 8. Rutas iniciales
    `INSERT OR IGNORE INTO rutas (id, nombre, codigo, dias_trabajo) VALUES 
        (1, 'Ruta 1', 'R1', 'lunes,martes,miercoles,jueves,viernes')`,
    `INSERT OR IGNORE INTO rutas (id, nombre, codigo, dias_trabajo) VALUES 
        (2, 'Ruta 2', 'R2', 'lunes,martes,miercoles,jueves,viernes')`,
];

console.log('🚀 Ejecutando migración Fase 1...\n');

let completed = 0;
let errors = 0;

db.serialize(() => {
    migrations.forEach((sql, index) => {
        db.run(sql, (err) => {
            if (err) {
                console.log(`❌ Error en migración ${index + 1}:`, err.message);
                errors++;
            } else {
                completed++;
            }
        });
    });

    db.run("SELECT 1", () => {
        console.log(`\n✅ Migraciones completadas: ${completed}`);
        if (errors > 0) console.log(`⚠️ Errores: ${errors}`);

        // Verificar tablas
        db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, tables) => {
            console.log('\n📦 Tablas en BD:');
            tables.forEach(t => console.log('  -', t.name));

            // Verificar sucursales
            db.all("SELECT * FROM sucursales", (err, rows) => {
                console.log('\n🏪 Sucursales:');
                rows.forEach(s => console.log(`  ${s.id}. ${s.nombre}`));

                // Verificar rutas
                db.all("SELECT * FROM rutas", (err, rows) => {
                    console.log('\n🚚 Rutas:');
                    rows.forEach(r => console.log(`  ${r.id}. ${r.nombre} (${r.codigo})`));

                    // Verificar zonas
                    db.all("SELECT * FROM zonas_precio", (err, rows) => {
                        console.log('\n📍 Zonas de Precio:');
                        rows.forEach(z => console.log(`  ${z.nombre}: +${z.incremento_porcentaje}%`));

                        db.close();
                        console.log('\n✅ Migración Fase 1 completada!');
                    });
                });
            });
        });
    });
});
