const { pool } = require('../config/db');
const logger = require('../config/logger');
const aiAssistantService = require('../services/aiAssistant.service');

/**
 * Procesar consulta en lenguaje natural
 */
const query = async (req, res) => {
    try {
        const { question } = req.body;
        const userId = req.user.id;

        if (!question || question.trim().length < 5) {
            return res.status(400).json({
                success: false,
                message: 'La pregunta debe tener al menos 5 caracteres'
            });
        }

        logger.info(`Consulta IA de usuario ${userId}: ${question}`);

        const result = await aiAssistantService.processQuery(question, userId);

        res.json(result);

    } catch (error) {
        logger.error('Error en consulta IA:', error);
        res.status(500).json({
            success: false,
            message: 'Error procesando la consulta'
        });
    }
};

/**
 * Obtener historial de consultas
 */
const getHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 20 } = req.query;

        const result = await pool.query(`
            SELECT id, pregunta, respuesta, duracion_ms, created_at
            FROM ai_assistant_history
            WHERE usuario_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `, [userId, parseInt(limit)]);

        res.json({
            success: true,
            history: result.rows
        });

    } catch (error) {
        // Si la tabla no existe, devolver array vacío
        res.json({
            success: true,
            history: []
        });
    }
};

/**
 * Obtener configuración de IA
 */
const getConfig = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT clave, valor, descripcion
            FROM configuracion_sistema
            WHERE clave LIKE 'ai_%'
        `);

        // Valores por defecto si no hay configuración
        const defaults = {
            ai_enabled: 'true',
            ai_model: 'gpt-3.5-turbo',
            ai_max_tokens: '500',
            ai_temperature: '0.1'
        };

        const config = { ...defaults };
        result.rows.forEach(row => {
            config[row.clave] = row.valor;
        });

        // No exponer la API key completa
        if (process.env.OPENAI_API_KEY) {
            config.ai_api_key_configured = true;
            config.ai_api_key_preview = process.env.OPENAI_API_KEY.substring(0, 10) + '...';
        } else {
            config.ai_api_key_configured = false;
        }

        res.json({
            success: true,
            config
        });

    } catch (error) {
        logger.error('Error obteniendo config IA:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo configuración'
        });
    }
};

/**
 * Actualizar configuración de IA
 */
const updateConfig = async (req, res) => {
    try {
        const { config } = req.body;
        const userId = req.user.id;

        for (const [clave, valor] of Object.entries(config)) {
            // Solo permitir claves que empiecen con ai_
            if (!clave.startsWith('ai_')) continue;

            // No guardar la API key en BD (usar .env)
            if (clave === 'ai_api_key') continue;

            await pool.query(`
                INSERT OR REPLACE INTO configuracion_sistema (clave, valor, actualizado_por, updated_at)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
            `, [clave, valor, userId]);
        }

        logger.info(`Configuración IA actualizada por usuario ${userId}`);

        res.json({
            success: true,
            message: 'Configuración actualizada'
        });

    } catch (error) {
        logger.error('Error actualizando config IA:', error);
        res.status(500).json({
            success: false,
            message: 'Error actualizando configuración'
        });
    }
};

/**
 * Ejemplos de consultas sugeridas
 */
const getSuggestions = async (req, res) => {
    const suggestions = [
        "¿Cuánto vendí este mes?",
        "¿Cuál es el producto más vendido?",
        "¿Cuántos clientes nuevos tuve esta semana?",
        "Dame un resumen de inventario con stock bajo",
        "¿Cuál es la sucursal con más ventas?",
        "¿Cuántas órdenes de compra están pendientes?",
        "¿Cuál es el promedio de venta por ticket?",
        "Lista los 10 productos con menos stock"
    ];

    res.json({
        success: true,
        suggestions
    });
};

module.exports = {
    query,
    getHistory,
    getConfig,
    updateConfig,
    getSuggestions
};
