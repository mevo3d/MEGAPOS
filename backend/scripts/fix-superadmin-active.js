// Forzar uso de SQLite para esta prueba
process.env.USE_SQLITE = 'true';
const { pool } = require('../src/config/dbAdapter'); // Access pool via adapter export which has the run method exposed if using my fix or directly via database-sqlite

async function fixSuperAdmin() {
    try {
        console.log('🔧 Reparando usuario superadmin...');

        // Update
        // Note: dbAdapter pool might be the raw sqlite object or wrapper. 
        // My recent edit to dbAdapter exposed pool.

        const db = require('../src/config/database-sqlite'); // Direct access to ensure run works

        db.run(`UPDATE empleados SET activo = 1 WHERE username = 'superadmin' OR email = 'superadmin@megamayoreo.com'`, function (err) {
            if (err) {
                console.error('❌ Error actualizando:', err);
                return;
            }
            console.log(`✅ Usuario actualizado. Cambios: ${this.changes}`);
        });

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

fixSuperAdmin();
