// Forzar uso de SQLite para esta prueba
process.env.USE_SQLITE = 'true';
const { query } = require('../src/config/dbAdapter');
const logger = require('../src/config/logger');

async function debugUsers() {
    try {
        console.log('🔍 Buscando empleados...');
        const result = await query(`
            SELECT id, nombre, email, username, activo, created_at 
            FROM empleados 
            WHERE username = 'superadmin' OR email = 'superadmin@mega.com'
        `);

        console.log('📊 Resultados:', result.rows);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            console.log('🆔 Tipo de dato de "activo":', typeof user.activo);
            console.log('✅ Valor de "activo":', user.activo);
        } else {
            console.log('❌ Usuario superadmin no encontrado');
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

debugUsers();
