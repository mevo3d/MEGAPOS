const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, '../backend/data/megamayoreo.db');
const db = new sqlite3.Database(dbPath);

const testLogin = async (username, password) => {
    return new Promise((resolve) => {
        db.get('SELECT * FROM empleados WHERE username = ? OR email = ?', [username, username], async (err, user) => {
            if (err) {
                console.log('❌ Error DB:', err.message);
                return resolve();
            }
            if (!user) {
                console.log(`❌ Usuario no encontrado: ${username}`);
                return resolve();
            }

            const valid = await bcrypt.compare(password, user.password_hash);
            console.log(`User: ${user.username} | Role: ${user.rol} | Active: ${user.activo}`);
            console.log(`Attempting password: ${password}`);
            console.log(valid ? '✅ LOGIN EXITOSO' : '❌ PASSWORD INCORRECTO');
            resolve();
        });
    });
};

async function run() {
    await testLogin('superadmin', '123456');
    await testLogin('superadmin', 'admin123');
    await testLogin('admin', 'admin123');
    await testLogin('admin', '123456');
    db.close();
}

run();
