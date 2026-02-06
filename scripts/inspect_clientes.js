const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/megamayoreo.db');

db.each("PRAGMA table_info(clientes)", (err, row) => {
    console.log(row.name, row.type);
});

setTimeout(() => db.close(), 1000);
