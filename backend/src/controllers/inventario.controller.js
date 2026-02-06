const inventarioService = require('../services/inventario.service');
const logger = require('../config/logger');

const getInventario = async (req, res) => {
    try {
        const { limit, offset, search, sucursal_id } = req.query;
        // Si se pasa sucursal_id Y el usuario es admin/superadmin, usar ese ID.
        // Si no, usar la del usuario logueado.
        let targetSucursal = req.sucursalId;

        if (sucursal_id && (req.user.rol === 'admin' || req.user.rol === 'superadmin' || req.user.rol === 'gerente_cedis')) {
            targetSucursal = sucursal_id;
        }

        const productos = await inventarioService.getInventarioSucursal(targetSucursal, {
            limit, offset, search
        });
        res.json(productos);
    } catch (error) {
        logger.error('Error obteniendo inventario:', error);
        res.status(500).json({ message: 'Error al obtener inventario' });
    }
};

const getBajoStock = async (req, res) => {
    try {
        const productos = await inventarioService.getBajoStock(req.sucursalId);
        res.json(productos);
    } catch (error) {
        logger.error('Error obteniendo bajo stock:', error);
        res.status(500).json({ message: 'Error al obtener alertas de stock' });
    }
};

const ajustarStock = async (req, res) => {
    try {
        const { ajustes } = req.body; // Array de ajustes
        if (!ajustes || !Array.isArray(ajustes)) {
            return res.status(400).json({ message: 'Formato de ajustes inválido' });
        }

        await inventarioService.ajustarStock(req.sucursalId, req.user.id, ajustes);
        res.json({ success: true, message: 'Inventario actualizado correctamente' });

    } catch (error) {
        logger.error('Error ajustando stock:', error);
        res.status(500).json({ message: 'Error al realizar ajuste de inventario' });
    }
};

const crearTransferencia = async (req, res) => {
    try {
        const result = await inventarioService.crearTransferencia({
            ...req.body,
            usuario_id: req.user.id
        });
        res.json(result);
    } catch (error) {
        logger.error('Error creando transferencia:', error);
        res.status(500).json({ message: 'Error al crear transferencia', error: error.message });
    }
};

const getTransferencias = async (req, res) => {
    try {
        const transferencias = await inventarioService.getTransferencias(req.query);
        res.json(transferencias);
    } catch (error) {
        logger.error('Error obteniendo transferencias:', error);
        res.status(500).json({ message: 'Error al obtener transferencias' });
    }
};

const getTransferenciaById = async (req, res) => {
    try {
        const transferencia = await inventarioService.getTransferenciaById(req.params.id);
        if (!transferencia) return res.status(404).json({ message: 'Transferencia no encontrada' });
        res.json(transferencia);
    } catch (error) {
        logger.error('Error obteniendo transferencia:', error);
        res.status(500).json({ message: 'Error al obtener transferencia' });
    }
};

const confirmarRecepcion = async (req, res) => {
    try {
        const result = await inventarioService.confirmarRecepcion(req.params.id, req.body.items, req.user.id);
        res.json(result);
    } catch (error) {
        logger.error('Error confirmando recepción:', error);
        res.status(500).json({ message: 'Error al confirmar recepción', error: error.message });
    }
};

const getGlobalStock = async (req, res) => {
    try {
        const stock = await inventarioService.getGlobalStock();
        res.json(stock);
    } catch (error) {
        logger.error('Error obteniendo stock global:', error);
        res.status(500).json({ message: 'Error al obtener stock global' });
    }
};

const getStockPorSucursal = async (req, res) => {
    try {
        const stock = await inventarioService.getStockPorSucursal(req.params.id);
        res.json(stock);
    } catch (error) {
        logger.error('Error obteniendo stock por sucursal:', error);
        res.status(500).json({ message: 'Error al obtener stock por sucursal' });
    }
};

module.exports = {
    getInventario,
    getBajoStock,
    ajustarStock,
    crearTransferencia,
    getTransferencias,
    getTransferenciaById,
    confirmarRecepcion,
    getGlobalStock,
    getStockPorSucursal
};
