const { pool } = require('../config/db');
const logger = require('../config/logger');

// Generar Referencia Única de Pago
const generarReferencia = async (req, res) => {
    try {
        const { pedidoId } = req.params;
        const referencia = `SPEI-${pedidoId}-${Math.floor(Math.random() * 10000)}`;

        // Guardar referencia en el pedido (opcional, o en una tabla de metadatos)
        // Por ahora lo devolvemos para que el frontend lo muestre
        res.json({ success: true, referencia });
    } catch (error) {
        logger.error('Error generando referencia:', error);
        res.status(500).json({ message: 'Error interno' });
    }
};

// Webhook Simulado (Recibe notificación de Banco/MP)
const recibirWebhook = async (req, res) => {
    try {
        const { proveedor, external_id, monto, referencia_interna, metadata } = req.body;

        // 1. Buscar Pedido por Referencia (Parseando el ID del string 'SPEI-ID-RANDOM' o directo)
        // Asumimos referencia_interna viene como 'SPEI-123-X' o simplemente '123'
        let pedidoId = null;
        if (referencia_interna && referencia_interna.includes('-')) {
            const parts = referencia_interna.split('-');
            pedidoId = parts[1]; // Index 1 is ID
        } else {
            pedidoId = referencia_interna;
        }

        if (!pedidoId) return res.status(400).json({ message: 'Referencia inválida' });

        // 2. Insertar Transacción Raw
        await pool.query(`
            INSERT INTO pagos_transacciones (proveedor, external_id, monto, referencia_interna, metadata, estado)
            VALUES ($1, $2, $3, $4, $5, 'approved')
        `, [proveedor, external_id, monto, referencia_interna, JSON.stringify(metadata)]);

        // 3. Actualizar Estado del Pedido a 'detectado'
        await pool.query(`
            UPDATE pedidos 
            SET estado_pago = 'detectado', updated_at = CURRENT_TIMESTAMP 
            WHERE id = $1 AND estado_pago != 'confirmado'
        `, [pedidoId]);

        // 4. Audit Log
        await pool.query(`
            INSERT INTO audit_logs (entity_type, entity_id, action, details)
            VALUES ('pedido', $1, 'PAYMENT_DETECTED', $2)
        `, [pedidoId, `Pago detectado de ${proveedor} por $${monto}`]);

        res.json({ success: true, message: 'Webhook procesado, pago detectado' });

    } catch (error) {
        logger.error('Error procesando webhook:', error);
        res.status(500).json({ message: 'Error procesando pago' });
    }
};

// Contabilidad: Confirmar Pago Manualmente
const confirmarPago = async (req, res) => {
    try {
        const { id } = req.params; // Pedido ID
        const { usuario_id, notas } = req.body;

        await pool.query('BEGIN');

        // Verificar estado actual
        const pedido = await pool.query('SELECT estado_pago FROM pedidos WHERE id = $1', [id]);
        if (pedido.rows.length === 0) throw new Error('Pedido no encontrado');

        // Actualizar a Confirmado
        await pool.query(`
            UPDATE pedidos 
            SET estado_pago = 'confirmado', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
        `, [id]);

        // Audit Log
        await pool.query(`
            INSERT INTO audit_logs (entity_type, entity_id, action, user_id, details)
            VALUES ('pedido', $1, 'PAYMENT_CONFIRMED', $2, $3)
        `, [id, usuario_id, `Confirmado manualmente por Contabilidad. ${notas || ''}`]);

        await pool.query('COMMIT');

        res.json({ success: true, message: 'Pago confirmado. Pedido liberado para logística.' });

    } catch (error) {
        await pool.query('ROLLBACK');
        logger.error('Error confirmando pago:', error);
        res.status(500).json({ message: error.message });
    }
};

// Contabilidad: Obtener Pedidos por Verificar
const getPedidosPorVerificar = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, c.nombre as cliente_nombre 
            FROM pedidos p
            JOIN clientes c ON p.cliente_id = c.id
            WHERE p.estado_pago IN ('detectado', 'verificacion', 'manual')
            ORDER BY p.updated_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ message: 'Error' });
    }
};

module.exports = {
    generarReferencia,
    recibirWebhook,
    confirmarPago,
    getPedidosPorVerificar
};
