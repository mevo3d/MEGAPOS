const amqp = require('amqplib');
const logger = require('./logger');

let channel = null;
let connection = null;

const connectRabbitMQ = async () => {
    // Si estamos en modo desarrollo con SQLite, hacer RabbitMQ completamente opcional
    if (process.env.USE_SQLITE === 'true' && process.env.NODE_ENV === 'development') {
        logger.warn('⚠️ Saltando conexión RabbitMQ en modo desarrollo con SQLite');
        return Promise.resolve();
    }

    const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

    try {
        connection = await amqp.connect(RABBITMQ_URL);
        channel = await connection.createChannel();

        logger.info('✅ Conectado a RabbitMQ');

        // Definir colas principales
        await channel.assertQueue('sync_ventas', { durable: true });
        await channel.assertQueue('sync_inventario', { durable: true });
        await channel.assertQueue('notificaciones', { durable: true });

        connection.on('error', (err) => {
            logger.error('Error en conexión RabbitMQ', err);
            setTimeout(connectRabbitMQ, 5000);
        });

        connection.on('close', () => {
            logger.warn('Conexión RabbitMQ cerrada, reintentando...');
            setTimeout(connectRabbitMQ, 5000);
        });

        return channel;

    } catch (error) {
        logger.error('Error conectando a RabbitMQ:', error);
        throw error; // Para que el try/catch en server.js pueda manejarlo
    }
};

const getChannel = () => channel;

module.exports = { connectRabbitMQ, getChannel };
