const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/database');
const logger = require('../src/config/logger');
require('dotenv').config();

async function initDB() {
    try {
        logger.info('🔄 Iniciando configuración de base de datos...');

        // Leer archivos SQL
        const schemaPath = path.join(__dirname, '../../database/schema.sql');
        const seedsPath = path.join(__dirname, '../../database/seeds.sql');

        const schemaSql = fs.readFileSync(schemaPath, 'utf8');
        const seedsSql = fs.readFileSync(seedsPath, 'utf8');

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Ejecutar Schema
            logger.info('🏗️ Creando tablas y estructura...');
            await client.query(schemaSql);
            logger.info('✅ Estructura creada correctamente.');

            // Ejecutar Seeds (solo si se pide o si la BD está vacía)
            // Por ahora lo ejecutamos siempre para dev
            logger.info('🌱 Insertando datos de prueba...');
            await client.query(seedsSql);
            logger.info('✅ Datos de prueba insertados.');

            await client.query('COMMIT');
            logger.info('🎉 Base de datos inicializada exitosamente.');

        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }

    } catch (error) {
        logger.error('❌ Error inicializando base de datos:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

initDB();
