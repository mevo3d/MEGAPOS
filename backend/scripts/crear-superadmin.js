const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, '../data/megamayoreo.db');
const db = new sqlite3.Database(dbPath);

console.log('👤 Creando usuario superadmin con hash bcrypt...\n');

const username = 'superadmin';
const password = '123456';
const email = 'superadmin@mega.com';
const nombre = 'Super Administrador';

// Generar hash de bcrypt de forma asíncrona
bcrypt.hash(password, 10, (err, passwordHash) => {
    if (err) {
        console.error('❌ Error generando hash:', err);
        db.close();
        process.exit(1);
    }

    console.log('🔐 Hash generado:', passwordHash);

    // Verificar si ya existe
    db.get(`SELECT * FROM empleados WHERE username = ? OR email = ?`, [username, email], (err, user) => {
        if (err) {
            console.error('❌ Error verificando usuario:', err);
            db.close();
            process.exit(1);
        }

        if (user) {
            console.log('Usuario ya existe (ID:', user.id + '), actualizando contraseña...');
            db.run(`
                UPDATE empleados 
                SET password_hash = ?, activo = 1, rol = 'admin', nombre = ?
                WHERE username = ? OR email = ?
            `, [passwordHash, nombre, username, email], (err) => {
                if (err) {
                    console.error('❌ Error actualizando usuario:', err);
                    db.close();
                    process.exit(1);
                }

                console.log('\n✅ Usuario superadmin actualizado exitosamente');
                console.log('📧 Email:', email);
                console.log('👤 Username:', username);
                console.log('🔑 Password:', password);
                console.log('\n💡 Ahora puedes iniciar sesión en http://localhost:5173/admin');
                db.close();
                process.exit(0);
            });
        } else {
            console.log('Creando nuevo usuario...');
            db.run(`
                INSERT INTO empleados (
                    username, email, password_hash, nombre, rol, activo, 
                    sucursal_id, created_at
                ) VALUES (?, ?, ?, ?, 'admin', 1, 1, CURRENT_TIMESTAMP)
            `, [username, email, passwordHash, nombre], function (err) {
                if (err) {
                    console.error('❌ Error creando usuario:', err.message);
                    db.close();
                    process.exit(1);
                }

                console.log('\n✅ Usuario superadmin creado exitosamente');
                console.log('📧 Email:', email);
                console.log('👤 Username:', username);
                console.log('🔑 Password:', password);
                console.log('🆔 ID:', this.lastID);
                console.log('\n💡 Ahora puedes iniciar sesión en http://localhost:5173/admin');
                db.close();
                process.exit(0);
            });
        }
    });
});
