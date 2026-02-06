const cedisService = require('../services/cedis.service');

const getKPIs = async (req, res) => {
    try {
        const kpis = await cedisService.getKPIs(req.sucursalId);
        res.json(kpis);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getOrdenesPendientes = async (req, res) => {
    try {
        const ordenes = await cedisService.getOrdenesPendientes(req.sucursalId);
        res.json(ordenes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getOrdenDetalle = async (req, res) => {
    try {
        const detalle = await cedisService.getOrdenDetalle(req.params.id);
        res.json(detalle);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const recibirMercancia = async (req, res) => {
    try {
        // req.body: { orden_compra_id, items: [...], notas, proveedor_id }
        const data = {
            ...req.body,
            sucursal_id: req.sucursalId,
            usuario_id: req.user.id
        };
        const result = await cedisService.registrarRecepcion(data);
        res.json({ success: true, recepcion: result });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getUbicaciones = async (req, res) => {
    try {
        const ubi = await cedisService.getUbicaciones(req.sucursalId);
        res.json(ubi);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const crearUbicacion = async (req, res) => {
    try {
        const data = { ...req.body, sucursal_id: req.sucursalId };
        const ubi = await cedisService.crearUbicacion(data);
        res.json(ubi);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getContenidoUbicacion = async (req, res) => {
    try {
        const contenido = await cedisService.getContenidoUbicacion(req.params.id);
        res.json(contenido);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const buscarProductoUbicaciones = async (req, res) => {
    try {
        const { sku } = req.query;
        const ubicaciones = await cedisService.getUbicacionesProducto(sku, req.sucursalId);
        res.json(ubicaciones);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getKPIs,
    getOrdenesPendientes,
    getOrdenDetalle,
    recibirMercancia,
    getUbicaciones,
    crearUbicacion,
    getContenidoUbicacion,
    buscarProductoUbicaciones
};
