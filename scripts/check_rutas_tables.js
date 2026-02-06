const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/megamayoreo.db');

db.all("SELECT name FROM sqlite_master WHERE type='table' AND (name='rutas' OR name='inventario_ruta' OR name='visitas_ruteros')", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Tablas encontradas:', rows.map(r => r.name));
    }
    db.close();
});
