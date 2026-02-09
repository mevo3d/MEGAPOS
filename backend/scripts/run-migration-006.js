const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');
const logger = require('../src/config/logger');
require('dotenv').config();

async function runMigration() {
    try {
        console.log('🔄 Ejecutando migración 006_ai_config_tables.sql...');

        const migrationPath = path.join(__dirname, '../../database/migrations/006_ai_config_tables.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            await client.query(migrationSql);
            await client.query('COMMIT');
            console.log('✅ Migración aplicada exitosamente.');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('❌ Error applying migration:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
