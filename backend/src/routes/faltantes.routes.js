const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const db = require('../config/database-sqlite');

// ===============================================
// MÓDULO FALTANTES - Solicitudes de productos
// ===============================================

// GET /faltantes/sucursal/:id - Obtener faltantes de una sucursal específica
router.get('/sucursal/:id', auth.verifyToken, async (req, res) => {
    const { id } = req.params;


    try {
        // Obtener productos con stock bajo el mínimo
        const faltantes = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    inv.id as inventario_id,
                    inv.producto_id,
                    inv.stock_actual,
                    inv.stock_minimo,
                    (inv.stock_minimo - inv.stock_actual) as cantidad_faltante,
                    pc.nombre,
                    pc.sku,
                    pc.codigo_barras,
                    pc.precio_compra,
                    sf.id as solicitud_pendiente_id,
                    sf.cantidad_solicitada,
                    sf.estado as estado_solicitud
                FROM inventario_sucursal inv
                JOIN productos_catalogo pc ON inv.producto_id = pc.id
                LEFT JOIN solicitudes_faltantes sf ON sf.producto_id = inv.producto_id 
                    AND sf.sucursal_id = inv.sucursal_id 
                    AND sf.estado IN ('pendiente', 'aprobada')
                WHERE inv.sucursal_id = ?
                    AND inv.stock_actual < inv.stock_minimo
                ORDER BY cantidad_faltante DESC
            `, [id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        // Obtener solicitudes del sucursal
        const solicitudes = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    sf.*,
                    pc.nombre as producto_nombre,
                    pc.sku as producto_sku,
                    u.nombre as solicitante_nombre
                FROM solicitudes_faltantes sf
                JOIN productos_catalogo pc ON sf.producto_id = pc.id
                LEFT JOIN empleados u ON sf.usuario_solicitante_id = u.id
                WHERE sf.sucursal_id = ?
                ORDER BY sf.fecha_solicitud DESC
                LIMIT 50
            `, [id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        res.json({ faltantes, solicitudes });
    } catch (error) {
        console.error('Error obteniendo faltantes:', error);
        res.status(500).json({ message: 'Error al obtener faltantes', error: error.message });
    }
});

// GET /faltantes/pendientes - Obtener todas las solicitudes pendientes (para CEDIS)
router.get('/pendientes', auth.verifyToken, async (req, res) => {


    try {
        const solicitudes = await new Promise((resolve, reject) => {
            db.all(`
                SELECT 
                    sf.*,
                    pc.nombre as producto_nombre,
                    pc.sku as producto_sku,
                    pc.codigo_barras,
                    s.nombre as sucursal_nombre,
                    u.nombre as solicitante_nombre,
                    (SELECT stock_actual FROM inventario_sucursal 
                     WHERE sucursal_id = 1 AND producto_id = sf.producto_id) as stock_cedis
                FROM solicitudes_faltantes sf
                JOIN productos_catalogo pc ON sf.producto_id = pc.id
                JOIN sucursales s ON sf.sucursal_id = s.id
                LEFT JOIN empleados u ON sf.usuario_solicitante_id = u.id
                WHERE sf.estado = 'pendiente'
                ORDER BY 
                    CASE sf.urgencia 
                        WHEN 'urgente' THEN 1 
                        WHEN 'alta' THEN 2 
                        WHEN 'normal' THEN 3 
                        WHEN 'baja' THEN 4 
                    END,
                    sf.fecha_solicitud ASC
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        // Agrupar por sucursal para mejor visualización
        const porSucursal = solicitudes.reduce((acc, sol) => {
            const key = sol.sucursal_id;
            if (!acc[key]) {
                acc[key] = {
                    sucursal_id: sol.sucursal_id,
                    sucursal_nombre: sol.sucursal_nombre,
                    solicitudes: []
                };
            }
            acc[key].solicitudes.push(sol);
            return acc;
        }, {});

        res.json({
            total: solicitudes.length,
            solicitudes,
            porSucursal: Object.values(porSucursal)
        });
    } catch (error) {
        console.error('Error obteniendo pendientes:', error);
        res.status(500).json({ message: 'Error al obtener pendientes', error: error.message });
    }
});

// POST /faltantes/solicitar - Crear nueva solicitud
router.post('/solicitar', auth.verifyToken, async (req, res) => {
    const { sucursal_id, producto_id, cantidad, urgencia, notas } = req.body;
    const usuario_id = req.userId;


    try {
        // Verificar si ya existe solicitud pendiente
        const existente = await new Promise((resolve, reject) => {
            db.get(`
                SELECT id FROM solicitudes_faltantes 
                WHERE sucursal_id = ? AND producto_id = ? AND estado = 'pendiente'
            `, [sucursal_id, producto_id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (existente) {
            return res.status(400).json({ message: 'Ya existe una solicitud pendiente para este producto' });
        }

        // Crear solicitud
        const result = await new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO solicitudes_faltantes 
                (sucursal_id, producto_id, cantidad_solicitada, urgencia, notas, usuario_solicitante_id, tipo)
                VALUES (?, ?, ?, ?, ?, ?, 'manual')
            `, [sucursal_id, producto_id, cantidad, urgencia || 'normal', notas, usuario_id], function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            });
        });

        res.json({
            message: 'Solicitud creada exitosamente',
            solicitud_id: result.id
        });
    } catch (error) {
        console.error('Error creando solicitud:', error);
        res.status(500).json({ message: 'Error al crear solicitud', error: error.message });
    }
});

// PUT /faltantes/:id/aprobar - Aprobar solicitud
router.put('/:id/aprobar', auth.verifyToken, async (req, res) => {
    const { id } = req.params;
    const { cantidad_aprobada } = req.body;
    const usuario_id = req.userId;


    try {
        await new Promise((resolve, reject) => {
            db.run(`
                UPDATE solicitudes_faltantes 
                SET estado = 'aprobada', 
                    cantidad_aprobada = ?,
                    usuario_aprobador_id = ?,
                    fecha_respuesta = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [cantidad_aprobada, usuario_id, id], function (err) {
                if (err) reject(err);
                else resolve();
            });
        });

        res.json({ message: 'Solicitud aprobada' });
    } catch (error) {
        console.error('Error aprobando solicitud:', error);
        res.status(500).json({ message: 'Error al aprobar', error: error.message });
    }
});

// PUT /faltantes/:id/rechazar - Rechazar solicitud
router.put('/:id/rechazar', auth.verifyToken, async (req, res) => {
    const { id } = req.params;
    const { motivo } = req.body;
    const usuario_id = req.userId;


    try {
        await new Promise((resolve, reject) => {
            db.run(`
                UPDATE solicitudes_faltantes 
                SET estado = 'rechazada', 
                    notas = COALESCE(notas, '') || ' | Rechazado: ' || ?,
                    usuario_aprobador_id = ?,
                    fecha_respuesta = CURRENT_TIMESTAMP
                WHERE id = ?
            `, [motivo || 'Sin stock', usuario_id, id], function (err) {
                if (err) reject(err);
                else resolve();
            });
        });

        res.json({ message: 'Solicitud rechazada' });
    } catch (error) {
        console.error('Error rechazando solicitud:', error);
        res.status(500).json({ message: 'Error al rechazar', error: error.message });
    }
});

// POST /faltantes/despachar - Generar traspasos masivos desde solicitudes aprobadas
router.post('/despachar', auth.verifyToken, async (req, res) => {
    const { solicitud_ids } = req.body; // Array de IDs de solicitudes a despachar
    const usuario_id = req.userId;


    try {
        // Obtener solicitudes aprobadas
        const solicitudes = await new Promise((resolve, reject) => {
            const placeholders = solicitud_ids.map(() => '?').join(',');
            db.all(`
                SELECT * FROM solicitudes_faltantes 
                WHERE id IN (${placeholders}) AND estado = 'aprobada'
            `, solicitud_ids, (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        if (solicitudes.length === 0) {
            return res.status(400).json({ message: 'No hay solicitudes aprobadas para despachar' });
        }

        // Agrupar por sucursal destino
        const porDestino = solicitudes.reduce((acc, sol) => {
            if (!acc[sol.sucursal_id]) acc[sol.sucursal_id] = [];
            acc[sol.sucursal_id].push(sol);
            return acc;
        }, {});

        const traspasos_creados = [];

        // Crear un traspaso por cada sucursal destino
        for (const [sucursal_destino, items] of Object.entries(porDestino)) {
            // Crear traspaso
            const traspaso = await new Promise((resolve, reject) => {
                db.run(`
                    INSERT INTO traspasos (sucursal_origen_id, sucursal_destino_id, estado, created_by)
                    VALUES (1, ?, 'pendiente', ?)
                `, [sucursal_destino, usuario_id], function (err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID });
                });
            });

            // Agregar productos al traspaso
            for (const item of items) {
                await new Promise((resolve, reject) => {
                    db.run(`
                        INSERT INTO traspasos_detalle (traspaso_id, producto_id, cantidad)
                        VALUES (?, ?, ?)
                    `, [traspaso.id, item.producto_id, item.cantidad_aprobada], function (err) {
                        if (err) reject(err);
                        else resolve();
                    });
                });

                // Actualizar solicitud como despachada
                await new Promise((resolve, reject) => {
                    db.run(`
                        UPDATE solicitudes_faltantes 
                        SET estado = 'despachada', traspaso_id = ?
                        WHERE id = ?
                    `, [traspaso.id, item.id], function (err) {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            }

            traspasos_creados.push(traspaso.id);
        }

        res.json({
            message: `Se generaron ${traspasos_creados.length} traspasos`,
            traspasos_ids: traspasos_creados
        });
    } catch (error) {
        console.error('Error despachando:', error);
        res.status(500).json({ message: 'Error al despachar', error: error.message });
    }
});

// GET /faltantes/productos/buscar - Buscar productos para solicitar
router.get('/productos/buscar', auth.verifyToken, async (req, res) => {
    const { q } = req.query;


    try {
        const productos = await new Promise((resolve, reject) => {
            db.all(`
                SELECT id, nombre, sku, codigo_barras, precio_compra
                FROM productos_catalogo
                WHERE activo = 1 
                    AND (nombre LIKE ? OR sku LIKE ? OR codigo_barras LIKE ?)
                LIMIT 20
            `, [`%${q}%`, `%${q}%`, `%${q}%`], (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        res.json(productos);
    } catch (error) {
        console.error('Error buscando productos:', error);
        res.status(500).json({ message: 'Error al buscar', error: error.message });
    }
});

module.exports = router;
