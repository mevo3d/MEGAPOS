const telemarketingService = require('../services/telemarketing.service');

const getDashboardData = async (req, res) => {
    try {
        const userId = req.user.id;
        const [tareas, clientes, historial] = await Promise.all([
            telemarketingService.getTareasPendientes(userId),
            telemarketingService.getClientesAsignados(userId),
            telemarketingService.getHistorialLlamadas(userId)
        ]);

        res.json({
            tareas,
            clientes,
            historial
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getEstadisticas = async (req, res) => {
    try {
        const userId = req.user.id;
        const periodo = req.query.periodo || 'semana';
        const stats = await telemarketingService.getEstadisticasEfectividad(userId, periodo);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const registrarLlamada = async (req, res) => {
    try {
        const data = {
            ...req.body,
            usuario_id: req.user.id
        };
        const result = await telemarketingService.registrarLlamada(data);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const crearTarea = async (req, res) => {
    try {
        const data = {
            ...req.body,
            usuario_id: req.user.id
        };
        const result = await telemarketingService.crearTarea(data);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const completarTarea = async (req, res) => {
    try {
        const { id } = req.params;
        const { notas } = req.body;
        const result = await telemarketingService.completarTarea(id, notas);
        res.json(result);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getDashboardData,
    getEstadisticas,
    registrarLlamada,
    crearTarea,
    completarTarea
};
