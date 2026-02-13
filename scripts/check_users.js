const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../backend/data/megamayoreo.db');
const db = new sqlite3.Database(dbPath);

console.log('--- EMPLEADOS EN LA BASE DE DATOS ---');
db.all('SELECT id, nombre, email, username, rol, activo FROM empleados WHERE id = 1', [], (err, rows) => {
    if (err) {
        console.error('Error:', err.message);
    } else {
        rows.forEach(r => {
            console.log(`ID: ${r.id} | Name: ${r.nombre} | User: ${r.username} | Email: ${r.email} | Role: ${r.rol} | Active: ${r.activo}`);
        });
    }
    db.close();
});
