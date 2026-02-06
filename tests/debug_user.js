const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../backend/data', 'megamayoreo.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("SELECT * FROM empleados", (err, rows) => {
        if (err) console.error(err);
        else console.log(JSON.stringify(rows, null, 2));
    });
});

db.close();
