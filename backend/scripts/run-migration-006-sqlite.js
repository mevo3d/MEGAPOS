const fs = require('fs');
const path = require('path');
const { pool, query } = require('../src/config/db'); // Load Dynamic DB (SQLite or PG)
const logger = require('../src/config/logger');
require('dotenv').config();

async function runMigration() {
    try {
        console.log('🔄 Ejecutando migración SQLite...');

        const migrationPath = path.join(__dirname, '../../database/migrations/006_ai_config_tables_sqlite.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');

        // Split by semicolon to run multiple statements (SQLite often requires this in raw drivers, though some helper wrappers handle it)
        const statements = migrationSql.split(';').map(s => s.trim()).filter(s => s.length > 0);

        // Check if we are using the SQLite wrapper object or PG pool
        // The SQLite wrapper in database-sqlite.js exports { pool, query, ... } but pool is actually the db instance or object with query method

        for (const sql of statements) {
            console.log(`Executing: ${sql.substring(0, 50)}...`);
            if (process.env.USE_SQLITE === 'true') {
                // For SQLite wrapper, we likely use the 'query' export or 'pool.run' if available
                // Looking at database-sqlite.js it acts as a module exporting 'query'.
                await query(sql);
            } else {
                await query(sql);
            }
        }

        console.log('✅ Migración aplicada exitosamente.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error applying migration:', error);
        process.exit(1);
    }
}

runMigration();
