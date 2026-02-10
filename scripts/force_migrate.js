const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../backend/data/megamayoreo.db');
const db = new sqlite3.Database(dbPath);

console.log(`🚀 Forzando migración directa en: ${dbPath}`);

const sqlPath = path.join(__dirname, '../database/migrations/007_nomina_hr_sqlite.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    // SQLite3 doesn't support multiple statements in one run() easily
    // but exec() does.
    db.exec(sql, (err) => {
        if (err) {
            console.error('❌ Error ejecutando SQL:', err.message);
            db.run('ROLLBACK');
        } else {
            db.run('COMMIT', (err) => {
                if (err) {
                    console.error('❌ Error en COMMIT:', err.message);
                } else {
                    console.log('✅ Migración aplicada exitosamente con db.exec()');
                }
            });
        }
    });
});
