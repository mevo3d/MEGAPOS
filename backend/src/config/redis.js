const { createClient } = require('redis');
const logger = require('./logger');

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('✅ Conectado a Redis'));

const connectRedis = async () => {
    // Si estamos en modo desarrollo con SQLite, hacer Redis completamente opcional
    if (process.env.USE_SQLITE === 'true' && process.env.NODE_ENV === 'development') {
        logger.warn('⚠️ Saltando conexión Redis en modo desarrollo con SQLite');
        return Promise.resolve();
    }

    try {
        await redisClient.connect();
    } catch (error) {
        logger.error('Error conectando a Redis:', error);
        // No lanzamos error fatal porque Redis puede ser opcional para algunas funciones
        throw error; // Para que el try/catch en server.js pueda manejarlo
    }
};

module.exports = { redisClient, connectRedis };
