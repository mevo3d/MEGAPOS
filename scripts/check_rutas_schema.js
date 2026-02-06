const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/megamayoreo.db');

const tables = ['inventario_ruta', 'rutas', 'visitas_ruteros'];

db.serialize(() => {
    tables.forEach(table => {
        db.all(`PRAGMA table_info(${table})`, (err, rows) => {
            if (err) {
                console.error(`Error en ${table}:`, err);
            } else {
                console.log(`\n--- ${table} ---`);
                console.log(rows.map(r => `${r.name} (${r.type})`).join(', '));
            }
        });
    });
});

// Close after a small delay to ensure all callbacks run (simple approach)
setTimeout(() => db.close(), 1000);
