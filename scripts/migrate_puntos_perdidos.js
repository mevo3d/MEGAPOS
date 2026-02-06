const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/megamayoreo.db');

console.log('Aplicando migración: Puntos Perdidos...');

db.serialize(() => {
    // Agregar columna puntos_perdidos a tabla ventas
    db.run("ALTER TABLE ventas ADD COLUMN puntos_perdidos INTEGER DEFAULT 0", (err) => {
        if (err) {
            if (err.message.includes('duplicate column')) {
                console.log('⚠️ La columna puntos_perdidos ya existe.');
            } else {
                console.error('❌ Error agregando columna:', err.message);
            }
        } else {
            console.log('✅ Columna puntos_perdidos agregada a tabla ventas.');
        }
    });
});

db.close();
