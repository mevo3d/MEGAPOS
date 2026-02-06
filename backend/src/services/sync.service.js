const { getChannel } = require('../config/rabbitmq');
const { pool } = require('../config/db');
const logger = require('../config/logger');

class SyncService {

    /**
     * Encola ventas recibidas de una sucursal para procesamiento asíncrono
     */
    async queueVentas(sucursalId, ventas) {
        try {
            const channel = getChannel();
            if (!channel) throw new Error('RabbitMQ channel not available');

            const message = {
                sucursalId,
                ventas,
                timestamp: new Date().toISOString()
            };

            // Enviar a la cola 'sync_ventas'
            channel.sendToQueue(
                'sync_ventas',
                Buffer.from(JSON.stringify(message)),
                { persistent: true }
            );

            logger.info(`Encoladas ${ventas.length} ventas de Sucursal ${sucursalId}`);
            return true;

        } catch (error) {
            logger.error('Error enqueuing ventas:', error);
            throw error;
        }
    }

    /**
     * Procesa la cola de ventas (Consumer)
     * Este método debería ser llamado al iniciar el servidor
     */
    async startVentasConsumer() {
        // Si estamos en modo desarrollo con SQLite, omitir RabbitMQ
        if (process.env.USE_SQLITE === 'true' && process.env.NODE_ENV === 'development') {
            logger.info('📊 Modo desarrollo con SQLite - omitiendo consumidor de RabbitMQ');
            return;
        }

        const channel = getChannel();
        if (!channel) {
            logger.warn('RabbitMQ no disponible, reintentando consumer en 5s...');
            setTimeout(() => this.startVentasConsumer(), 5000);
            return;
        }

        logger.info('🐰 Iniciando consumidor de ventas...');

        channel.consume('sync_ventas', async (msg) => {
            if (!msg) return;

            try {
                const content = JSON.parse(msg.content.toString());
                await this.processBatchVentas(content);
                channel.ack(msg); // Confirmar procesamiento
            } catch (error) {
                logger.error('Error procesando mensaje de ventas:', error);
                // Si es error recuperable, nack con requeue. Si es fatal, nack sin requeue.
                // Por ahora, nack sin requeue para evitar bucles infinitos en dev
                channel.nack(msg, false, false);
            }
        });
    }

    /**
     * Lógica para guardar ventas en BD central
     */
    async processBatchVentas({ sucursalId, ventas }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const venta of ventas) {
                // Verificar si ya existe (idempotencia)
                const exists = await client.query('SELECT id FROM ventas WHERE id = $1', [venta.id]);
                if (exists.rows.length > 0) {
                    logger.warn(`Venta ${venta.id} ya existe, saltando...`);
                    continue;
                }

                // Insertar Venta
                await client.query(`
          INSERT INTO ventas (
            id, sucursal_id, caja_id, empleado_id, cliente_id, 
            subtotal, impuestos, total, estado, origen, 
            sincronizado, fecha_venta
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11)
        `, [
                    venta.id, sucursalId, venta.caja_id, venta.empleado_id, venta.cliente_id,
                    venta.subtotal, venta.impuestos, venta.total, venta.estado, venta.origen,
                    venta.fecha_venta
                ]);

                // Insertar Detalles
                for (const item of venta.items) {
                    await client.query(`
            INSERT INTO ventas_detalle (
              venta_id, producto_id, cantidad, precio_unitario, subtotal, nombre_producto
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
                        venta.id, item.producto_id, item.cantidad, item.precio_unitario,
                        item.subtotal, item.nombre_producto
                    ]);

                    // Actualizar Inventario Central (Descontar)
                    await client.query(`
            UPDATE inventario 
            SET stock_fisico = stock_fisico - $1,
                last_sync = NOW()
            WHERE producto_id = $2 AND sucursal_id = $3
          `, [item.cantidad, item.producto_id, sucursalId]);
                }

                // Insertar Pagos
                for (const pago of venta.pagos) {
                    await client.query(`
            INSERT INTO metodos_pago (venta_id, metodo, monto, referencia)
            VALUES ($1, $2, $3, $4)
          `, [venta.id, pago.metodo, pago.monto, pago.referencia]);
                }
            }

            await client.query('COMMIT');
            logger.info(`✅ Procesadas ${ventas.length} ventas de Sucursal ${sucursalId}`);

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Obtiene cambios de inventario para enviar a sucursal (Pull)
     */
    async getInventarioUpdates(sucursalId, lastSyncDate) {
        // Buscar cambios en productos o precios desde la última fecha
        const result = await pool.query(`
      SELECT 
        p.id, p.sku, p.nombre, p.precio_base,
        i.stock_fisico, i.stock_disponible,
        COALESCE(pps.precio, p.precio_base) as precio_final
      FROM productos p
      JOIN inventario i ON p.id = i.producto_id
      LEFT JOIN productos_precios_sucursal pps 
        ON p.id = pps.producto_id AND pps.sucursal_id = $1
      WHERE i.sucursal_id = $1
      AND (
        i.last_sync > $2 OR 
        p.updated_at > $2 OR
        pps.updated_at > $2
      )
    `, [sucursalId, lastSyncDate || '1970-01-01']);

        return result.rows;
    }
}

module.exports = new SyncService();
