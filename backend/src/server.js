const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { ApolloServer } = require('apollo-server-express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const logger = require('./config/logger');

// Usar SQLite si PostgreSQL no está disponible
let databaseConfig;
if (process.env.USE_SQLITE === 'true') {
    databaseConfig = require('./config/database-sqlite');
    logger.info('📊 Usando SQLite como base de datos');
} else {
    databaseConfig = require('./config/database');
    logger.info('🐘 Usando PostgreSQL como base de datos');
}

const { connectDB } = databaseConfig;
const { connectRedis } = require('./config/redis');
const { connectRabbitMQ } = require('./config/rabbitmq');

const app = express();
const server = http.createServer(app);

// Configuración de Socket.IO - CORS permisivo para desarrollo
const isDev = process.env.NODE_ENV !== 'production';
const allowedOrigins = isDev
    ? true  // En desarrollo, aceptar cualquier origen
    : (process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim()) : ['*']);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// Middlewares Globales
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));
app.use(compression());
app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000 // límite de 1000 peticiones por IP (aumentado para desarrollo)
});
app.use('/api/', limiter);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date(), service: 'pos-backend' });
});

// Rutas REST (cargar si existen)
const routeFiles = [
    'auth.routes',
    'sincronizacion.routes',
    'ventas.routes',
    'inventario.routes',
    'asistencia.routes',
    'monitor.routes',
    'reportes.routes',
    'import.routes',
    'empleados.routes',
    'configuracion.routes',
    'config.routes', // New Config Routes for SuperAdmin
    'sucursales.routes',
    'puntosVenta.routes',
    'cajas.routes',
    'productos.routes',
    'tiposSucursal.routes',
    'pedidos.routes',
    'proveedores.routes',
    'compras.routes',
    'recepciones.routes',
    'ubicaciones.routes',
    'clientes.routes',
    'precios.routes',
    'pagos.routes',
    'pagos-b2b.routes',
    'productosImagenes.routes',
    'productosIA.routes',
    'aiAssistant.routes',
    'traspasos.routes',
    'rutero.routes',
    'cedis.routes',
    'telemarketing.routes',
    'clasificacionClientes.routes',
    'admin.routes',
    'coordinacion.routes',
    'preventa.routes',
    'faltantes.routes'
];

routeFiles.forEach(routeFile => {
    try {
        const routePath = `./routes/${routeFile}`;
        app.use(`/api/${routeFile.replace('.routes', '')}`, require(routePath));
        logger.info(`✅ Ruta ${routeFile} cargada`);
    } catch (error) {
        if (error.code === 'MODULE_NOT_FOUND') {
            logger.warn(`⚠️ Ruta ${routeFile} no encontrada, omitiendo`);
        } else {
            logger.error(`❌ Error cargando ruta ${routeFile}:`, error);
        }
    }
});

// Servir archivos estáticos desde uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// WebSocket Connection
io.on('connection', (socket) => {
    logger.info(`Cliente conectado: ${socket.id}`);

    socket.on('join-sucursal', (sucursalId) => {
        socket.join(`sucursal-${sucursalId}`);
        logger.info(`Socket ${socket.id} unido a sucursal-${sucursalId}`);
    });

    socket.on('disconnect', () => {
        logger.info(`Cliente desconectado: ${socket.id}`);
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    logger.error(err.stack);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Inicialización del Servidor
const PORT = process.env.PORT || 3005;

async function startServer() {
    try {
        // 1. Conectar Base de Datos
        await connectDB();
        logger.info('✅ Base de datos conectada correctamente');

        // 2. Conectar Redis (opcional para desarrollo)
        try {
            await connectRedis();
            logger.info('✅ Redis conectado correctamente');
        } catch (redisError) {
            logger.warn('⚠️ Redis no disponible, continuando sin cache');
        }

        // 3. Conectar RabbitMQ (opcional para desarrollo)
        try {
            await connectRabbitMQ();
            logger.info('✅ RabbitMQ conectado correctamente');

            // 4. Iniciar Consumers de RabbitMQ
            try {
                const syncService = require('./services/sync.service');
                await syncService.startVentasConsumer();
                logger.info('✅ Consumers de RabbitMQ iniciados');
            } catch (syncError) {
                if (syncError.code === 'MODULE_NOT_FOUND') {
                    logger.warn('⚠️ Servicio de sincronización no encontrado, omitiendo');
                } else {
                    logger.warn('⚠️ Error iniciando servicio de sincronización:', syncError.message);
                }
            }
        } catch (rabbitError) {
            logger.warn('⚠️ RabbitMQ no disponible, continuando sin cola de mensajes');
        }

        // 5. Iniciar Apollo Server (GraphQL)
        try {
            const typeDefs = fs.readFileSync(path.join(__dirname, 'graphql/schema.graphql'), 'utf8');
            const resolvers = require('./graphql/resolvers');

            const apolloServer = new ApolloServer({
                typeDefs,
                resolvers,
                context: ({ req }) => ({ user: req.user })
            });

            await apolloServer.start();
            apolloServer.applyMiddleware({ app, path: '/graphql' });
            logger.info(`🚀 GraphQL listo en /graphql`);
        } catch (gqlError) {
            logger.error('Error iniciando GraphQL:', gqlError);
        }

        // 6. Iniciar Servidor HTTP
        server.listen(PORT, () => {
            logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
            logger.info(`📍 Ambiente: ${process.env.NODE_ENV}`);
        });

    } catch (error) {
        logger.error('❌ Error fatal al iniciar el servidor:', error);
        process.exit(1);
    }
}

startServer();

module.exports = { app, io };
