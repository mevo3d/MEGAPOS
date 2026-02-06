const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const db = new sqlite3.Database('./backend/data/megamayoreo.db');

const usuarios = [
    { nombre: 'Super Admin', email: 'superadmin@mega.com', username: 'superadmin', rol: 'superadmin' },
    { nombre: 'Administrador', email: 'admin@mega.com', username: 'admin', rol: 'admin' },
    { nombre: 'Gerente Sucursal', email: 'gerente@mega.com', username: 'gerente', rol: 'gerente' },
    { nombre: 'Cajero Uno', email: 'cajero@mega.com', username: 'cajero', rol: 'cajero' },
    { nombre: 'Vendedor Uno', email: 'vendedor@mega.com', username: 'vendedor', rol: 'vendedor' },
    { nombre: 'Telemarketing', email: 'telemarketing@mega.com', username: 'telemarketing', rol: 'telemarketing' },
    { nombre: 'Compras', email: 'compras@mega.com', username: 'compras', rol: 'compras' },
    { nombre: 'Capturista Móvil', email: 'capturista@mega.com', username: 'capturista', rol: 'capturista' }
];

async function crearUsuarios() {
    const passwordHash = await bcrypt.hash('123456', 10);

    for (const user of usuarios) {
        db.run(`
            INSERT OR IGNORE INTO empleados (nombre, email, username, password_hash, rol, activo)
            VALUES (?, ?, ?, ?, ?, 1)
        `, [user.nombre, user.email, user.username, passwordHash, user.rol], (err) => {
            if (err) console.log('Error:', user.username, err.message);
            else console.log('✓', user.rol.padEnd(15), '->', user.username, '/', user.email);
        });
    }

    setTimeout(() => {
        console.log('\n==============================');
        console.log('Contraseña para todos: 123456');
        console.log('==============================');
        db.close();
    }, 1000);
}

crearUsuarios();
