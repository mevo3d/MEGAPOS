const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const auth = require('../middleware/auth');
const logger = require('../config/logger');

// Middleware para verificar admin
const requireAdmin = (req, res, next) => {
    if (!['admin', 'superadmin'].includes(req.user.rol)) {
        return res.status(403).json({ message: 'Acceso denegado' });
    }
    next();
};

// ==================== ZONAS DE PRECIO ====================

/**
 * GET /admin/zonas-precio - Listar todas las zonas
 */
router.get('/zonas-precio', auth.verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM zonas_precio ORDER BY distancia_min_km');
        res.json(result.rows);
    } catch (error) {
        logger.error('Error listando zonas precio:', error);
        res.status(500).json({ message: 'Error obteniendo zonas' });
    }
});

/**
 * GET /admin/zonas-precio/:id - Obtener una zona
 */
router.get('/zonas-precio/:id', auth.verifyToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM zonas_precio WHERE id = $1', [req.params.id]);
        if (!result.rows[0]) {
            return res.status(404).json({ message: 'Zona no encontrada' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error obteniendo zona:', error);
        res.status(500).json({ message: 'Error' });
    }
});

/**
 * POST /admin/zonas-precio - Crear zona
 */
router.post('/zonas-precio', auth.verifyToken, requireAdmin, async (req, res) => {
    try {
        const {
            nombre,
            descripcion,
            distancia_min_km,
            distancia_max_km,
            porcentaje_incremento,
            monto_fijo_extra,
            activo
        } = req.body;

        if (!nombre) {
            return res.status(400).json({ message: 'Nombre requerido' });
        }

        const result = await pool.query(`
            INSERT INTO zonas_precio 
            (nombre, descripcion, distancia_min_km, distancia_max_km, porcentaje_incremento, monto_fijo_extra, activo)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `, [
            nombre,
            descripcion || null,
            distancia_min_km || 0,
            distancia_max_km || 0,
            porcentaje_incremento || 0,
            monto_fijo_extra || 0,
            activo !== false
        ]);

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error creando zona:', error);
        res.status(500).json({ message: 'Error creando zona' });
    }
});

/**
 * PUT /admin/zonas-precio/:id - Actualizar zona
 */
router.put('/zonas-precio/:id', auth.verifyToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            nombre,
            descripcion,
            distancia_min_km,
            distancia_max_km,
            porcentaje_incremento,
            monto_fijo_extra,
            activo
        } = req.body;

        const result = await pool.query(`
            UPDATE zonas_precio SET
                nombre = COALESCE($2, nombre),
                descripcion = $3,
                distancia_min_km = COALESCE($4, distancia_min_km),
                distancia_max_km = COALESCE($5, distancia_max_km),
                porcentaje_incremento = COALESCE($6, porcentaje_incremento),
                monto_fijo_extra = COALESCE($7, monto_fijo_extra),
                activo = COALESCE($8, activo),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
            RETURNING *
        `, [
            id,
            nombre,
            descripcion,
            distancia_min_km,
            distancia_max_km,
            porcentaje_incremento,
            monto_fijo_extra,
            activo
        ]);

        if (!result.rows[0]) {
            return res.status(404).json({ message: 'Zona no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error actualizando zona:', error);
        res.status(500).json({ message: 'Error actualizando zona' });
    }
});

/**
 * DELETE /admin/zonas-precio/:id - Eliminar zona
 */
router.delete('/zonas-precio/:id', auth.verifyToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('DELETE FROM zonas_precio WHERE id = $1 RETURNING id', [req.params.id]);

        if (!result.rows[0]) {
            return res.status(404).json({ message: 'Zona no encontrada' });
        }

        res.json({ success: true, message: 'Zona eliminada' });
    } catch (error) {
        logger.error('Error eliminando zona:', error);
        res.status(500).json({ message: 'Error eliminando zona' });
    }
});

/**
 * GET /admin/zonas-precio/calcular-precio - Calcular precio con zona
 * Query params: precio_base, zona_id OR distancia_km
 */
router.get('/calcular-precio', auth.verifyToken, async (req, res) => {
    try {
        const { precio_base, zona_id, distancia_km } = req.query;

        if (!precio_base) {
            return res.status(400).json({ message: 'precio_base requerido' });
        }

        let zona;
        if (zona_id) {
            const result = await pool.query('SELECT * FROM zonas_precio WHERE id = $1', [zona_id]);
            zona = result.rows[0];
        } else if (distancia_km) {
            const result = await pool.query(`
                SELECT * FROM zonas_precio 
                WHERE activo = 1 
                AND $1 >= distancia_min_km 
                AND $1 < distancia_max_km
                LIMIT 1
            `, [distancia_km]);
            zona = result.rows[0];
        }

        if (!zona) {
            // Sin zona, precio base
            return res.json({
                precio_base: parseFloat(precio_base),
                precio_final: parseFloat(precio_base),
                zona: null,
                incremento: 0,
                cargo_fijo: 0
            });
        }

        const base = parseFloat(precio_base);
        const incremento = base * (parseFloat(zona.porcentaje_incremento) / 100);
        const cargoFijo = parseFloat(zona.monto_fijo_extra) || 0;
        const precioFinal = base + incremento + cargoFijo;

        res.json({
            precio_base: base,
            precio_final: precioFinal,
            zona: zona.nombre,
            zona_id: zona.id,
            incremento,
            cargo_fijo: cargoFijo
        });
    } catch (error) {
        logger.error('Error calculando precio:', error);
        res.status(500).json({ message: 'Error calculando precio' });
    }
});

// ==================== PAGOS MERCADO PAGO (Admin view) ====================

/**
 * GET /admin/pagos-mercadopago - Listar pagos recientes
 */
router.get('/pagos-mercadopago', auth.verifyToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT pm.*, 
                   c.nombre as cliente_nombre
            FROM pagos_mercadopago pm
            LEFT JOIN clientes c ON (pm.metadata->>'cliente_id')::int = c.id
            ORDER BY pm.fecha_creacion DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (error) {
        logger.error('Error listando pagos:', error);
        res.status(500).json({ message: 'Error' });
    }
});

module.exports = router;
