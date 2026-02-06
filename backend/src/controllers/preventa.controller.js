const preventaService = require('../services/preventa.service');

const crearPreventa = async (req, res) => {
    try {
        const { sucursalId, cajaId, clienteId, notas, items } = req.body;
        const empleadoId = req.user.id;

        const pedido = await preventaService.crearPreventa(sucursalId, cajaId, empleadoId, clienteId, notas);

        if (items && items.length > 0) {
            await preventaService.agregarItems(pedido.id, items);
        }

        const detalle = await preventaService.getPedidoDetalle(pedido.id);
        res.status(201).json(detalle);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const enviarACobro = async (req, res) => {
    try {
        const { id } = req.params;
        await preventaService.enviarACobro(id);
        res.json({ success: true, message: 'Pedido enviado a caja' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getPendientesBySucursal = async (req, res) => {
    try {
        const { sucursalId } = req.params;
        const pendientes = await preventaService.getPreventasPendientes(sucursalId);
        res.json(pendientes);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getDetalle = async (req, res) => {
    try {
        const { id } = req.params;
        const detalle = await preventaService.getPedidoDetalle(id);
        res.json(detalle);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    crearPreventa,
    enviarACobro,
    getPendientesBySucursal,
    getDetalle
};
