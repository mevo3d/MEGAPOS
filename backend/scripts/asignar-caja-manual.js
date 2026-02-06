// Script temporal para asignar caja al usuario manualmente
const { pool } = require('../src/config/db');
const logger = require('../src/config/logger');

async function asignarCaja() {
    try {
        // 1. Listar usuarios
        console.log('\n=== USUARIOS ===');
        const usuarios = await pool.query('SELECT id, nombre, username, caja_asignada_id FROM empleados WHERE activo = 1');
        usuarios.rows.forEach(u => {
            console.log(`ID: ${u.id} | Usuario: ${u.username || u.nombre} | Caja ID: ${u.caja_asignada_id || 'SIN ASIGNAR'}`);
        });

        // 2. Listar cajas
        console.log('\n=== CAJAS DISPONIBLES ===');
        const cajas = await pool.query('SELECT pv.id, pv.nombre, pv.es_maestra, s.nombre as sucursal FROM puntos_venta pv JOIN sucursales s ON pv.sucursal_id = s.id');
        cajas.rows.forEach(c => {
            console.log(`ID: ${c.id} | Caja: ${c.nombre} | Tipo: ${c.es_maestra ? 'MAESTRA' : 'PREVENTA'} | Sucursal: ${c.sucursal}`);
        });

        // 3. Buscar usuario "caja1"
        const userResult = await pool.query("SELECT id, nombre FROM empleados WHERE username LIKE '%caja1%' OR nombre LIKE '%caja1%'");

        if (userResult.rows.length === 0) {
            console.log('\n❌ No se encontró ningún usuario con "caja1" en el nombre');
            return;
        }

        const usuario = userResult.rows[0];
        console.log(`\n✅ Usuario encontrado: ${usuario.nombre} (ID: ${usuario.id})`);

        // 4. Buscar caja "Caja 1"
        const cajaResult = await pool.query("SELECT id, nombre, es_maestra FROM puntos_venta WHERE nombre LIKE '%caja%1%'");

        if (cajaResult.rows.length === 0) {
            console.log('❌ No se encontró ninguna caja con "Caja 1" en el nombre');
            return;
        }

        const caja = cajaResult.rows[0];
        console.log(`✅ Caja encontrada: ${caja.nombre} (ID: ${caja.id}) - ${caja.es_maestra ? 'MAESTRA' : 'PREVENTA'}`);

        // 5. Asignar caja al usuario
        await pool.query('UPDATE empleados SET caja_asignada_id = $1 WHERE id = $2', [caja.id, usuario.id]);

        console.log(`\n🎉 ¡ÉXITO! Caja "${caja.nombre}" asignada al usuario "${usuario.nombre}"`);

        // 6. Verificar
        const verificacion = await pool.query(`
            SELECT e.nombre, e.username, pv.nombre as caja_nombre, pv.es_maestra
            FROM empleados e
            LEFT JOIN puntos_venta pv ON e.caja_asignada_id = pv.id
            WHERE e.id = $1
        `, [usuario.id]);

        console.log('\n=== VERIFICACIÓN ===');
        const v = verificacion.rows[0];
        console.log(`Usuario: ${v.nombre} (${v.username})`);
        console.log(`Caja: ${v.caja_nombre || 'SIN ASIGNAR'}`);
        console.log(`Tipo: ${v.es_maestra ? 'MAESTRA' : 'PREVENTA'}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        logger.error('Error asignando caja:', error);
    } finally {
        process.exit(0);
    }
}

asignarCaja();
