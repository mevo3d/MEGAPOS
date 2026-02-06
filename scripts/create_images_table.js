const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/megamayoreo.db');

db.run(`
    CREATE TABLE IF NOT EXISTS productos_imagenes (
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
    else console.log('Table productos_imagenes created successfully');
    db.close();
});
