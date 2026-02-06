const { Pool } = require('pg');
const logger = require('./logger');

const poolConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'pos_megamayoreo',
        password: process.env.DB_PASSWORD || 'postgres',
        port: process.env.DB_PORT || 5432,
    };

const pool = new Pool({
    ...poolConfig,
    max: 20, // Pool size
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

pool.on('error', (err, client) => {
    logger.error('Error inesperado en el cliente PostgreSQL', err);
});

const connectDB = async () => {
    let retries = 5;
    while (retries) {
        try {
            const client = await pool.connect();
            logger.info('✅ Conectado a PostgreSQL');
            client.release();
            return pool;
        } catch (err) {
            logger.error(`Error conectando a BD (intentos restantes: ${retries}):`, err.message);
            retries -= 1;
            await new Promise(res => setTimeout(res, 5000)); // Esperar 5s
        }
    }
    throw new Error('No se pudo conectar a PostgreSQL después de varios intentos');
};

module.exports = {
    pool,
    connectDB,
    query: (text, params) => pool.query(text, params)
};
