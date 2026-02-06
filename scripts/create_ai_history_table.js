const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./backend/data/megamayoreo.db');

db.run(`
    CREATE TABLE IF NOT EXISTS ai_assistant_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER NOT NULL,
        pregunta TEXT NOT NULL,
        sql_generado TEXT,
        respuesta TEXT,
        duracion_ms INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`, (err) => {
    if (err) console.log('Error:', err.message);
    else console.log('Table ai_assistant_history created successfully');
    db.close();
});
