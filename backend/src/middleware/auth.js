const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(403).json({ message: 'Se requiere token de autenticación' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_dev');
        req.user = decoded;
        next();
    } catch (err) {
        logger.warn(`Intento de acceso con token inválido: ${err.message}`);
        return res.status(401).json({ message: 'Token inválido o expirado' });
    }
};

const isAdmin = (req, res, next) => {
    if (!['admin', 'superadmin'].includes(req.user.rol)) {
        return res.status(403).json({ message: 'Requiere rol de Administrador' });
    }
    next();
};

const isSuperAdmin = (req, res, next) => {
    if (req.user.rol !== 'superadmin') {
        return res.status(403).json({ message: 'Requiere rol de Super Administrador' });
    }
    next();
};

const isGerenteOrAdmin = (req, res, next) => {
    if (!['admin', 'gerente', 'superadmin'].includes(req.user.rol)) {
        return res.status(403).json({ message: 'Requiere rol de Gerente o Admin' });
    }
    next();
};

// Middleware para roles que pueden crear productos (incluye capturista)
const canCreateProducts = (req, res, next) => {
    const allowedRoles = ['admin', 'superadmin', 'gerente', 'capturista'];
    if (!allowedRoles.includes(req.user.rol)) {
        return res.status(403).json({ message: 'No tienes permiso para crear productos' });
    }
    next();
};

// Middleware para roles que pueden subir imágenes
const canUploadImages = (req, res, next) => {
    const allowedRoles = ['admin', 'superadmin', 'gerente', 'capturista', 'rutero', 'bodeguero'];
    if (!allowedRoles.includes(req.user.rol)) {
        return res.status(403).json({ message: 'No tienes permiso para subir imágenes' });
    }
    next();
};

const isBodeguero = (req, res, next) => {
    if (!['admin', 'superadmin', 'gerente', 'bodeguero', 'gerente_cedis'].includes(req.user.rol)) {
        return res.status(403).json({ message: 'Requiere rol de Bodeguero' });
    }
    next();
};

const isRutero = (req, res, next) => {
    if (!['admin', 'superadmin', 'gerente', 'rutero'].includes(req.user.rol)) {
        return res.status(403).json({ message: 'Requiere rol de Rutero' });
    }
    next();
};

const isGerenteCedis = (req, res, next) => {
    if (!['admin', 'superadmin', 'gerente_cedis'].includes(req.user.rol)) {
        return res.status(403).json({ message: 'Requiere rol de Gerente CEDIS' });
    }
    next();
};

module.exports = {
    verifyToken, isAdmin, isSuperAdmin, isGerenteOrAdmin,
    canCreateProducts, canUploadImages,
    isBodeguero, isRutero, isGerenteCedis
};


