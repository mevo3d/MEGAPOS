const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/megamayoreo.db');

console.log('Aplicando migración: Fase 3 (Traspasos)...');

const migrations = [
    `CREATE TABLE IF NOT EXISTS traspasos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        origen_sucursal_id INTEGER NOT NULL,
        destino_sucursal_id INTEGER NOT NULL,
        usuario_solicita_id INTEGER NOT NULL,
        usuario_aprueba_id INTEGER,
        usuario_recibe_id INTEGER,
        estado TEXT DEFAULT 'pendiente', -- pendiente, en_camino, recibido, rechazado
        fecha_solicitud DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_envio DATETIME,
        fecha_recepcion DATETIME,
        notas TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS traspasos_detalle (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        traspaso_id INTEGER NOT NULL,
        producto_id INTEGER NOT NULL,
        cantidad_solicitada INTEGER NOT NULL,
        cantidad_enviada INTEGER,
        cantidad_recibida INTEGER,
        FOREIGN KEY (traspaso_id) REFERENCES traspasos(id)
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
            console.log('✅ Tablas de traspasos creadas correctamente.');
        }
        db.close();
    });
});
