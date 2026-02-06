const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../data/megamayoreo.db');
const db = new sqlite3.Database(dbPath);

console.log('🔧 Activando usuario caja1esclavo...\n');

db.get(`SELECT * FROM empleados WHERE username = 'caja1esclavo' OR email = 'caja1esclavo@gmail.com'`, (err, user) => {
    if (err) {
        console.error('❌ Error buscando usuario:', err);
        db.close();
        process.exit(1);
    }

    if (!user) {
        console.error('❌ Usuario no encontrado');
        db.close();
        process.exit(1);
    }

    console.log('Usuario encontrado:', user.nombre, '(ID:', user.id + ')');
    console.log('Estado actual:', user.activo ? 'Activo' : 'Inactivo');

    db.run(`UPDATE empleados SET activo = 1 WHERE id = ?`, [user.id], (err) => {
        if (err) {
            console.error('❌ Error activando usuario:', err);
            db.close();
            process.exit(1);
        }

        console.log('\n✅ Usuario activado exitosamente');
        console.log('Ahora', user.nombre, 'puede iniciar sesión');
        db.close();
        process.exit(0);
    });
});
