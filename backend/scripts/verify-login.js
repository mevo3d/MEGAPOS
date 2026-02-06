const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, '../data/megamayoreo.db');
const db = new sqlite3.Database(dbPath);

const usernameOrEmail = 'superadmin';
const passwordAttempts = ['123456', 'admin123'];

console.log('🔍 Diagnosticando login para:', usernameOrEmail);
console.log('📂 Base de datos:', dbPath);

db.get(
    'SELECT * FROM empleados WHERE email = ? OR username = ?',
    [usernameOrEmail, usernameOrEmail],
    async (err, user) => {
        if (err) {
            console.error('❌ Error BD:', err);
            return;
        }

        if (!user) {
            console.error('❌ Usuario NO encontrado en la BD.');
            // Listar todos los usuarios para ver qué hay
            db.all('SELECT id, username, email, rol FROM empleados', [], (err, rows) => {
                console.log('📋 Usuarios existentes:', rows);
                process.exit(1);
            });
            return;
        }

        console.log('✅ Usuario encontrado:', {
            id: user.id,
            username: user.username,
            email: user.email,
            rol: user.rol,
            activo: user.activo,
            password_hash_prefix: user.password_hash.substring(0, 10) + '...'
        });

        if (!user.activo) {
            console.error('❌ El usuario está marcado como INACTIVO (activo = 0)');
        }

        for (const password of passwordAttempts) {
            console.log(`\n🔑 Probando contraseña: "${password}"`);
            try {
                const match = await bcrypt.compare(password, user.password_hash);
                if (match) {
                    console.log('✅ CONTRASEÑA CORRECTA! El login debería funcionar.');
                } else {
                    console.log('❌ Contraseña incorrecta.');
                }
            } catch (e) {
                console.error('Error bcrypt:', e);
            }
        }
    }
);
