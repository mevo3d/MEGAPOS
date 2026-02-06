const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../backend/data', 'megamayoreo.db');
const db = new sqlite3.Database(dbPath);
const password = 'admin123';

(async () => {
    const hash = await bcrypt.hash(password, 10);
    console.log('New Hash:', hash);

    db.serialize(() => {
        db.run("UPDATE empleados SET password_hash = ?, rol = 'admin', activo = 1 WHERE id = 1", [hash], function (err) {
            if (err) console.error(err);
            else console.log(`Updated Admin with new hash. Changes: ${this.changes}`);
        });
    });

    db.close();
})();
