const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/megamayoreo.db');

console.log('Aplicando migración: Fase 5 (CEDIS)...');

const migrations = [
    // Tabla Ubicaciones (Ej. Pasillo A, Estante 1)
    `CREATE TABLE IF NOT EXISTS ubicaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sucursal_id INTEGER NOT NULL,
        codigo TEXT NOT NULL, -- Ej: A-01-01
        tipo TEXT DEFAULT 'general', -- general, refrigerado, dañado
        notas TEXT
    )`,

    // Relación Producto-Ubicación (Stock en ubicación específica)
    `CREATE TABLE IF NOT EXISTS producto_ubicaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ubicacion_id INTEGER NOT NULL,
        producto_id INTEGER NOT NULL,
        cantidad INTEGER DEFAULT 0,
        FOREIGN KEY (ubicacion_id) REFERENCES ubicaciones(id)
    )`,

    // Recepciones de Mercancía (Cabecera)
    // Linked to ordenes_compra (optional if direct reception)
    `CREATE TABLE IF NOT EXISTS recepciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orden_compra_id INTEGER, 
        sucursal_id INTEGER NOT NULL,
        usuario_recibe_id INTEGER,
        fecha_recepcion DATETIME DEFAULT CURRENT_TIMESTAMP,
        proveedor_id INTEGER, -- Denormalized for direct reception
        estado TEXT DEFAULT 'completada', -- parcial, completada
        notas TEXT
    )`,

    // Detalle de Recepción
    `CREATE TABLE IF NOT EXISTS recepciones_detalle (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recepcion_id INTEGER NOT NULL,
        producto_id INTEGER NOT NULL,
        cantidad_esperada INTEGER,
        cantidad_recibida INTEGER NOT NULL,
        lote TEXT,
        fecha_caducidad DATE,
        FOREIGN KEY (recepcion_id) REFERENCES recepciones(id)
    )`,

    // Ensure ordenes_compra_detalle exists
    `CREATE TABLE IF NOT EXISTS ordenes_compra_detalle (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        orden_compra_id INTEGER NOT NULL,
        producto_id INTEGER NOT NULL,
        cantidad_solicitada INTEGER NOT NULL,
        costo_unitario DECIMAL(10,2),
        FOREIGN KEY (orden_compra_id) REFERENCES ordenes_compra(id)
    )`
];

db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    migrations.forEach((query) => {
        db.run(query, (err) => {
            if (err) {
                console.error('❌ Error en query:', err.message);
            }
        });
    });

    db.run('COMMIT', (err) => {
        if (err) {
            console.error('❌ Error al confirmar transacción:', err.message);
        } else {
            console.log('✅ Tablas CEDIS creadas correctamente.');
        }
        db.close();
    });
});
