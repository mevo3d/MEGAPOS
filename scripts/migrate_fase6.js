const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/megamayoreo.db');

console.log('Aplicando migración: Fase 6 (Telemarketing & CRM)...');

const migrations = [
    // Historial de LLamadas
    `CREATE TABLE IF NOT EXISTS llamadas_historial (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cliente_id INTEGER NOT NULL,
        usuario_id INTEGER NOT NULL, -- El telemarketer
        fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
        resultado TEXT, -- 'contesto', 'ocupado', 'buzon', 'venta_cerrada', 'interesado', 'no_interesado'
        duracion_segundos INTEGER,
        notas TEXT,
        fecha_proxima_llamada DATETIME,
        FOREIGN KEY (cliente_id) REFERENCES clientes(id),
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )`,

    // Tareas CRM
    `CREATE TABLE IF NOT EXISTS crm_tareas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL, -- Quién debe realizar la tarea
        cliente_id INTEGER,
        tipo TEXT DEFAULT 'llamada', -- 'llamada', 'whatsapp', 'correo', 'cotizacion'
        titulo TEXT,
        descripcion TEXT,
        fecha_programada DATETIME,
        prioridad TEXT DEFAULT 'media', -- 'alta', 'media', 'baja'
        estado TEXT DEFAULT 'pendiente', -- 'pendiente', 'completada', 'cancelada'
        completed_at DATETIME,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY (cliente_id) REFERENCES clientes(id)
    )`,

    // Cuotas de Telemarketing
    `CREATE TABLE IF NOT EXISTS cuotas_telemarketing (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        periodo_inicio DATE, -- Inicio de semana/mes
        periodo_fin DATE,
        meta_llamadas INTEGER DEFAULT 100,
        meta_ventas DECIMAL(10,2) DEFAULT 0,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    )`
];

db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    migrations.forEach((query) => {
        db.run(query, (err) => {
            if (err) {
                console.error('❌ Error en query:', err.message);
                console.error('Query:', query);
            }
        });
    });

    db.run('COMMIT', (err) => {
        if (err) {
            console.error('❌ Error al confirmar transacción:', err.message);
        } else {
            console.log('✅ Tablas Telemarketing/CRM creadas correctamente.');
        }
        db.close();
    });
});
