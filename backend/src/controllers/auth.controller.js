const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/dbAdapter');
const logger = require('../config/logger');

const login = async (req, res) => {
    const { email, password } = req.body;
    logger.info(`🔹 Login request received: email=${email}, passwordLength=${password ? password.length : 0}`);

    try {
        // Intentar login por username o email
        const result = await query(
            'SELECT * FROM empleados WHERE email = $1 OR username = $1',
            [email]
        );

        if (!result.rows || result.rows.length === 0) {
            logger.warn(`❌ Login failed: User not found for email=${email}`);
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const user = result.rows[0];
        logger.info(`🔹 User found: id=${user.id}, username=${user.username}, activo=${user.activo}, hash=${user.password_hash.substring(0, 10)}...`);

        if (!user.activo) {
            logger.warn('❌ Login failed: User inactive');
            return res.status(403).json({ message: 'Usuario inactivo' });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        logger.info(`🔹 Password validation result: ${validPassword}`);

        if (!validPassword) {
            logger.warn('❌ Login failed: Invalid password');
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // Generar Token
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                username: user.username,
                rol: user.rol,
                sucursal_id: user.sucursal_id
            },
            process.env.JWT_SECRET || 'secret_key_dev',
            { expiresIn: '24h' }
        );

        // Ocultar password en respuesta
        delete user.password_hash;

        logger.info(`✅ Login exitoso: ${user.email} (username: ${user.username || 'N/A'})`);

        res.json({
            success: true,
            token,
            user
        });

    } catch (error) {
        logger.error('Error en login:', error);
        res.status(500).json({ message: 'Error interno del servidor', error: error.message });
    }
};

const getMe = async (req, res) => {
    try {
        const result = await query(
            'SELECT id, nombre, email, username, rol, sucursal_id, activo FROM empleados WHERE id = $1',
            [req.user.id]
        );

        if (!result.rows || result.rows.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        logger.error('Error en getMe:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = { login, getMe };
