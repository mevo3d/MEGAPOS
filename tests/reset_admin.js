const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../backend/data', 'megamayoreo.db');
const db = new sqlite3.Database(dbPath);

const adminHash = '$2b$10$zriYiKRBLSyppn240lsBu.NQWR4egiu8M7vsjaLCXWDWkZzxGT4i.'; // admin123

db.serialize(() => {
    db.run("UPDATE empleados SET password_hash = ?, rol = 'admin', activo = 1 WHERE id = 1", [adminHash], function (err) {
        if (err) {
            console.error(err);
        } else {
            console.log(`Updated Admin. Changes: ${this.changes}`);
        }
    });

    // Also ensure permissions for admin role if applicable (roles are hardcoded strings usually)
});

db.close();
