const logger = require('../config/logger');

const validateSucursal = (req, res, next) => {
    // El ID de sucursal puede venir en el header, body, o del usuario autenticado
    let sucursalId = req.headers['x-sucursal-id'] || req.body.sucursal_id;

    // Si no viene el header, usar la sucursal del usuario autenticado
    if (!sucursalId && req.user && req.user.sucursal_id) {
        sucursalId = req.user.sucursal_id;
    }

    if (!sucursalId) {
        // Allow admins to proceed without specific sucursal (global view)
        if (req.user && (req.user.rol === 'admin' || req.user.rol === 'superadmin')) {
            req.sucursalId = null;
            return next();
        }
        return res.status(400).json({ message: 'Se requiere ID de sucursal (header x-sucursal-id o usuario con sucursal asignada)' });
    }

    // Si el usuario es admin o superadmin, puede actuar sobre cualquier sucursal
    if (req.user && (req.user.rol === 'admin' || req.user.rol === 'superadmin')) {
        req.sucursalId = parseInt(sucursalId);
        return next();
    }

    // Validar que el empleado pertenezca a la sucursal
    if (req.user && req.user.sucursal_id != sucursalId) {
        logger.warn(`Intento de acceso cruzado: Usuario ${req.user.id} (Suc ${req.user.sucursal_id}) intentó acceder a Suc ${sucursalId}`);
        return res.status(403).json({ message: 'No tienes permiso para operar en esta sucursal' });
    }

    req.sucursalId = parseInt(sucursalId);
    next();
};

module.exports = { validateSucursal };
