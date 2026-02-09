const ruteroService = require('../services/rutero.service');
const visitasService = require('../services/visitas.service');
const { pool } = require('../config/db');
const logger = require('../config/logger');

// ==================== INFO Y RUTA ====================

const getMiRuta = async (req, res) => {
    try {
        const ruta = await visitasService.getRutaAsignada(req.user.id);
        if (!ruta) return res.status(404).json({ message: 'No tienes ruta asignada' });
        res.json(ruta);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Error' });
    }
};

// ==================== INVENTARIO ====================

const getInventario = async (req, res) => {
    try {
        const ruta = await visitasService.getRutaAsignada(req.user.id);
        if (!ruta) return res.status(400).json({ message: 'Sin ruta asignada' });

        const inventario = await ruteroService.getInventarioRuta(ruta.id);
        res.json(inventario);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Error obteniendo inventario ruta' });
    }
};

// ==================== VENTAS ====================

const registrarVenta = async (req, res) => {
    try {
        const ruta = await visitasService.getRutaAsignada(req.user.id);
        if (!ruta) return res.status(400).json({ message: 'Sin ruta asignada' });

        const ventaData = {
            ...req.body,
            ruta_id: ruta.id,
            usuario_id: req.user.id
        };

        const result = await ruteroService.registrarVentaRuta(ventaData);
        res.json({ success: true, venta: result });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: error.message || 'Error en venta ruta' });
    }
};

// ==================== VISITAS ====================

const registrarVisita = async (req, res) => {
    try {
        const ruta = await visitasService.getRutaAsignada(req.user.id);
        if (!ruta) return res.status(400).json({ message: 'Sin ruta asignada' });

        const data = { ...req.body, ruta_id: ruta.id };
        const visita = await visitasService.registrarVisita(data);
        res.json({ success: true, visita });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Error registrando visita' });
    }
};

const getVisitasHoy = async (req, res) => {
    try {
        const ruta = await visitasService.getRutaAsignada(req.user.id);
        if (!ruta) return res.json([]);

        const visitas = await visitasService.getHistorialHoy(ruta.id);
        res.json(visitas);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Error fetching visitas' });
    }
};

/**
 * Calificar una visita existente (1-5 estrellas)
 */
const calificarVisita = async (req, res) => {
    try {
        const { id } = req.params;
        const { calificacion, feedback } = req.body;

        if (!calificacion || calificacion < 1 || calificacion > 5) {
            return res.status(400).json({ message: 'Calificación debe ser entre 1 y 5' });
        }

        const visita = await visitasService.actualizarCalificacion(id, calificacion, feedback);

        if (!visita) {
            return res.status(404).json({ message: 'Visita no encontrada' });
        }

        res.json({ success: true, visita });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Error calificando visita' });
    }
};

/**
 * Obtener estadísticas del rutero
 */
const getEstadisticas = async (req, res) => {
    try {
        const ruta = await visitasService.getRutaAsignada(req.user.id);
        if (!ruta) return res.status(400).json({ message: 'Sin ruta asignada' });

        // Por defecto: semana actual
        const { fecha_inicio, fecha_fin } = req.query;
        const hoy = new Date();
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay());

        const stats = await visitasService.getEstadisticasRutero(
            ruta.id,
            fecha_inicio || inicioSemana.toISOString(),
            fecha_fin || new Date().toISOString()
        );

        res.json(stats);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Error obteniendo estadísticas' });
    }
};

// ==================== CLIENTES ====================

const getClientesPendientes = async (req, res) => {
    try {
        const ruta = await visitasService.getRutaAsignada(req.user.id);
        if (!ruta) return res.json([]);

        const clientes = await visitasService.getClientesPendientesHoy(ruta.id);
        res.json(clientes);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Error obteniendo clientes pendientes' });
    }
};

// ==================== ZONAS DE PRECIO ====================

const getZonasPrecios = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM zonas_precio WHERE activo = 1 ORDER BY distancia_min_km');
        res.json(result.rows);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Error obteniendo zonas de precio' });
    }
};

// ==================== PAGOS - MERCADO PAGO ====================

/**
 * Generar link de pago para una venta
 */
const generarLinkPago = async (req, res) => {
    try {
        const { venta_id, monto, descripcion, cliente_id } = req.body;

        if (!monto || monto <= 0) {
            return res.status(400).json({ message: 'Monto inválido' });
        }

        // Obtener cliente para datos
        let clienteNombre = 'Cliente';
        if (cliente_id) {
            const clienteRes = await pool.query('SELECT nombre, email FROM clientes WHERE id = $1', [cliente_id]);
            if (clienteRes.rows[0]) {
                clienteNombre = clienteRes.rows[0].nombre;
            }
        }

        // Generar referencia externa única
        const externalReference = `MEGA-${Date.now()}-${Math.random().toString(36).substring(7)}`;

        // Por ahora simularemos el link (en producción se conectaría a Mercado Pago API)
        // TODO: Integrar con SDK real de Mercado Pago
        const linkPago = `https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=${externalReference}`;

        // Guardar en BD
        const insertRes = await pool.query(`
            INSERT INTO pagos_mercadopago (venta_id, external_reference, monto, link_pago, status, metadata)
            VALUES ($1, $2, $3, $4, 'pending', $5)
            RETURNING *
        `, [venta_id || null, externalReference, monto, linkPago, JSON.stringify({
            cliente_id,
            cliente_nombre: clienteNombre,
            descripcion: descripcion || 'Pago MEGAMAYOREO',
            generado_por: req.user.id
        })]);

        res.json({
            success: true,
            pago: insertRes.rows[0],
            link: linkPago,
            mensaje: 'Link generado. En producción conectar con Mercado Pago API.'
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Error generando link de pago' });
    }
};

/**
 * Enviar link de pago por WhatsApp
 */
const enviarLinkWhatsApp = async (req, res) => {
    try {
        const { pago_id, telefono, cliente_id } = req.body;

        if (!telefono) {
            return res.status(400).json({ message: 'Teléfono requerido' });
        }

        // Obtener el pago
        const pagoRes = await pool.query('SELECT * FROM pagos_mercadopago WHERE id = $1', [pago_id]);
        if (!pagoRes.rows[0]) {
            return res.status(404).json({ message: 'Pago no encontrado' });
        }

        const pago = pagoRes.rows[0];
        const metadata = pago.metadata || {};

        // Formatear teléfono (quitar espacios, guiones, etc.)
        const telefonoLimpio = telefono.replace(/\D/g, '');
        const telefonoWhatsApp = telefonoLimpio.startsWith('52') ? telefonoLimpio : `52${telefonoLimpio}`;

        // Construir mensaje
        const mensaje = `🛒 *MEGAMAYOREO*\n\nHola ${metadata.cliente_nombre || 'Cliente'}!\n\nTe enviamos el link para realizar tu pago:\n\n💰 *Monto:* $${parseFloat(pago.monto).toFixed(2)} MXN\n📝 *Concepto:* ${metadata.descripcion || 'Compra'}\n\n👉 *Pagar ahora:* ${pago.link_pago}\n\n¡Gracias por tu preferencia! 🙏`;

        // Generar URL de WhatsApp
        const whatsappUrl = `https://wa.me/${telefonoWhatsApp}?text=${encodeURIComponent(mensaje)}`;

        // Registrar envío
        await pool.query(`
            INSERT INTO links_pago_enviados (pago_mercadopago_id, cliente_id, telefono, empleado_id, canal)
            VALUES ($1, $2, $3, $4, 'whatsapp')
        `, [pago_id, cliente_id || null, telefono, req.user.id]);

        res.json({
            success: true,
            whatsapp_url: whatsappUrl,
            mensaje: 'Abre este enlace para enviar el mensaje por WhatsApp',
            telefono_formateado: telefonoWhatsApp
        });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ message: 'Error preparando envío WhatsApp' });
    }
};

module.exports = {
    getMiRuta,
    getInventario,
    registrarVenta,
    registrarVisita,
    getVisitasHoy,
    calificarVisita,
    getEstadisticas,
    getClientesPendientes,
    getZonasPrecios,
    generarLinkPago,
    enviarLinkWhatsApp
};
