const { pool } = require('../config/db');

const getConfig = async (req, res) => {
    try {
        const result = await pool.query("SELECT key, value, descripcion, grupo, is_secret FROM configuraciones ORDER BY grupo, key");

        // Mask secrets
        const configs = result.rows.map(row => ({
            ...row,
            value: row.is_secret ? '********' : row.value
        }));

        res.json(configs);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error obteniendo configuraciones' });
    }
};

const updateConfig = async (req, res) => {
    const { key, value } = req.body;

    // Validate special permissions? (SuperAdmin only - middleware handles this usually)

    try {
        await pool.query(
            "UPDATE configuraciones SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2",
            [value, key]
        );
        res.json({ message: 'Configuración actualizada' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error actualizando configuración' });
    }
};

module.exports = {
    getConfig,
    updateConfig
};
