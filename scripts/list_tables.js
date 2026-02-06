const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/megamayoreo.db');

db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name", (err, rows) => {
    console.log('TABLAS EXISTENTES:');
    rows.forEach(r => console.log('  -', r.name));
    db.close();
});
