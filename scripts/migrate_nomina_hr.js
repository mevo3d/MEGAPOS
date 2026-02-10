const { query, transaction, isSQLite } = require('../backend/src/config/dbAdapter');
const fs = require('fs');
const path = require('path');

async function migrate() {
    console.log(`🚀 Iniciando migración Nómina y HR (${isSQLite ? 'SQLite' : 'PostgreSQL'})...`);

    const migrationFile = isSQLite 
        ? '007_nomina_hr_sqlite.sql' 
        : '007_nomina_hr.sql';
    
    const migrationPath = path.join(__dirname, '../database/migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
        console.error(`❌ No se encontró el archivo de migración: ${migrationPath}`);
        return;
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

    try {
        await transaction(async (client) => {
            for (const statement of statements) {
                console.log(`📝 Ejecutando: ${statement.substring(0, 50)}...`);
                await client.query(statement);
            }
        });
        console.log('✅ Migración completada exitosamente.');
    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        process.exit(1);
    }
}

migrate();
