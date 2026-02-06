const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/megamayoreo.db');

const tables = [
    'ordenes_compra',
    'ordenes_compra_detalle',
    'recepciones',
    'recepciones_detalle',
    'ubicaciones',
    'producto_ubicaciones'
];

db.serialize(() => {
    db.all(`SELECT name FROM sqlite_master WHERE type='table' AND name IN (${tables.map(t => `'${t}'`).join(',')})`, (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            const found = rows.map(r => r.name);
            console.log('Tablas encontradas:', found);
            tables.forEach(t => {
                if (!found.includes(t)) console.log(`Falta tabla: ${t}`);
            });
        }
    });
});

setTimeout(() => db.close(), 1000);
