const { pool } = require('../config/db');
const { PubSub } = require('graphql-subscriptions');
const pubsub = new PubSub();

const resolvers = {
    Query: {
        productos: async (_, { limit = 20, offset = 0, categoria_id }) => {
            let query = `
        SELECT p.*, c.nombre as categoria_nombre 
        FROM productos p
        LEFT JOIN categorias c ON p.categoria_id = c.id
        WHERE p.activo = true
      `;
            const params = [];

            if (categoria_id) {
                query += ` AND p.categoria_id = $1`;
                params.push(categoria_id);
            }

            query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            params.push(limit, offset);

            const result = await pool.query(query, params);
            return result.rows.map(row => ({
                ...row,
                precio: parseFloat(row.precio_base),
                categoria: { id: row.categoria_id, nombre: row.categoria_nombre }
            }));
        },

        stockDisponible: async (_, { sku }) => {
            // Sumar stock de todas las sucursales (o solo CEDIS)
            const result = await pool.query(`
        SELECT 
          SUM(i.stock_disponible) as disponible,
          SUM(i.stock_reservado) as reservado
        FROM inventario i
        JOIN productos p ON i.producto_id = p.id
        WHERE p.sku = $1
      `, [sku]);

            return {
                sku,
                disponible: parseInt(result.rows[0]?.disponible || 0),
                reservado: parseInt(result.rows[0]?.reservado || 0),
                sucursal_id: 0 // 0 = Global
            };
        }
    },

    Mutation: {
        reservarStock: async (_, { orden_id, items }) => {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');

                // Lógica simplificada de reserva en CEDIS (sucursal_id = 4)
                const CEDIS_ID = 4;

                for (const item of items) {
                    const res = await client.query(`
            UPDATE inventario
            SET stock_reservado = stock_reservado + $1,
                stock_disponible = stock_fisico - (stock_reservado + $1)
            WHERE producto_id = (SELECT id FROM productos WHERE sku = $2)
            AND sucursal_id = $3
            AND (stock_fisico - stock_reservado) >= $1
            RETURNING id
          `, [item.cantidad, item.sku, CEDIS_ID]);

                    if (res.rowCount === 0) {
                        throw new Error(`No hay stock suficiente para ${item.sku}`);
                    }
                }

                await client.query('COMMIT');
                return { success: true, expira_en: new Date(Date.now() + 3600000).toISOString() }; // 1 hora

            } catch (error) {
                await client.query('ROLLBACK');
                return { success: false, message: error.message };
            } finally {
                client.release();
            }
        }
    }
};

module.exports = resolvers;
