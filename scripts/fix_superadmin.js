const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, '../backend/data/megamayoreo.db');
const db = new sqlite3.Database(dbPath);

async function fixSuperAdmin() {
    const passwordHash = await bcrypt.hash('admin123', 10);

    console.log('🔄 Actualizando credenciales de superadmin...');

    // Intentar actualizar el usuario con id 2 (que es el superadmin que vimos)
    db.run(`
        UPDATE empleados 
        SET password_hash = ?, rol = 'superadmin', activo = 1 
        WHERE username = 'superadmin' OR id = 2
    `, [passwordHash], function (err) {
        if (err) {
            console.error('❌ Error actualizando id 2:', err.message);
        } else {
            console.log(`✅ Superadmin (id 2) actualizado. Filas afectadas: ${this.changes}`);
        }
    });

    // También asegurar que el usuario 'admin' (id 1) sea superadmin por si acaso
    db.run(`
        UPDATE empleados 
        SET password_hash = ?, rol = 'superadmin', activo = 1 
        WHERE username = 'admin' OR id = 1
    `, [passwordHash], function (err) {
        if (err) {
            console.error('❌ Error actualizando id 1:', err.message);
        } else {
            console.log(`✅ Admin (id 1) actualizado a superadmin. Filas afectadas: ${this.changes}`);
        }
        db.close();
    });
}

fixSuperAdmin();
