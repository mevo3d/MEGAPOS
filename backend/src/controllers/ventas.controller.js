const ventasService = require('../services/ventas.service');
const logger = require('../config/logger');

const createVenta = async (req, res) => {
    try {
        console.log('📝 Iniciando creación de venta...');
        console.log('Datos recibidos:', JSON.stringify(req.body, null, 2));
        console.log('SucursalId:', req.sucursalId);
        console.log('Usuario:', req.user.id, req.user.nombre);

        const ventaData = {
            ...req.body,
            sucursal_id: req.sucursalId,
            empleado_id: req.user.id,
            vendedor_id: req.body.vendedor_id || req.user.id // Si no viene, el cajero es el vendedor
        };

        console.log('Datos de venta preparados:', JSON.stringify(ventaData, null, 2));

        const nuevaVenta = await ventasService.createVenta(ventaData);

        // Generar comisión de forma asíncrona (no bloquea la respuesta)
        const comisionesService = require('../services/comisiones.service');
        comisionesService.generarComision(nuevaVenta.id, ventaData.vendedor_id, nuevaVenta.total)
            .catch(err => console.error('Error asíncrono generando comisión:', err));

        console.log('✅ Venta creada y comisión procesada:', nuevaVenta.id);

        // Emitir evento socket para monitor en tiempo real
        try {
            const { io } = require('../server');
            io.to('admin-panel').emit('venta-nueva', {
                sucursal_id: req.sucursalId,
                total: nuevaVenta.total,
                empleado: req.user.nombre
            });
        } catch (socketErr) {
            console.log('Socket no disponible, continuando...');
        }

        res.status(201).json({ success: true, venta: nuevaVenta });

    } catch (error) {
        console.error('❌ ERROR COMPLETO en venta:');
        console.error('Mensaje:', error.message);
        console.error('Stack:', error.stack);
        logger.error('Error creando venta:', error);
        res.status(500).json({ message: 'Error al procesar la venta', error: error.message });
    }
};

const getVentasHoy = async (req, res) => {
    try {
        const ventas = await ventasService.getVentasHoy(req.sucursalId);
        res.json(ventas);
    } catch (error) {
        logger.error('Error obteniendo ventas:', error);
        res.status(500).json({ message: 'Error al obtener ventas' });
    }
};

const getHistorialCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const historial = await ventasService.getHistorialCliente(id);
        res.json(historial);
    } catch (error) {
        logger.error('Error historial cliente:', error);
        res.status(500).json({ message: 'Error obteniendo historial' });
    }
};

module.exports = { createVenta, getVentasHoy, getHistorialCliente };
