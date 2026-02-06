const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/megamayoreo.db');

db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='productos_imagenes'", (err, rows) => {
    console.log('Tabla productos_imagenes existe:', rows.length > 0);

    if (rows.length === 0) {
        console.log('Creando tabla productos_imagenes...');
        db.run(`
            CREATE TABLE productos_imagenes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                producto_id INTEGER NOT NULL,
                nombre_archivo TEXT NOT NULL,
                ruta_original TEXT,
                ruta_procesada TEXT,
                es_principal INTEGER DEFAULT 0,
                orden INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (producto_id) REFERENCES productos_catalogo(id) ON DELETE CASCADE
            )
        `, (err) => {
            if (err) console.log('Error:', err.message);
            else console.log('Tabla creada exitosamente');
            db.close();
        });
    } else {
        db.close();
    }
});
