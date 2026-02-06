/**
 * Servicio de Asistente IA de Business Intelligence
 * Permite consultas en lenguaje natural a la base de datos
 */

const OpenAI = require('openai');
const { pool } = require('../config/db');
const logger = require('../config/logger');

// Cliente OpenAI
let openai = null;
try {
    if (process.env.OPENAI_API_KEY) {
        openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }
} catch (error) {
    logger.warn('OpenAI no configurado para Asistente IA');
}

// Esquema de la base de datos para contexto del LLM
const SCHEMA_CONTEXT = `
Eres un asistente de Business Intelligence para el sistema POS MEGAMAYOREO.
Tu trabajo es responder preguntas sobre el negocio consultando la base de datos.

ESQUEMA DE LA BASE DE DATOS (SQLite):

TABLAS PRINCIPALES:
- empleados (id, nombre, email, rol, sucursal_id, activo)
- sucursales (id, nombre, tipo, direccion, telefono, activo)
- productos_catalogo (id, codigo, nombre, descripcion, categoria, precio_compra, precio_venta, marca, activo)
- inventario_sucursal (id, sucursal_id, producto_id, stock_actual, stock_minimo)
- ventas (id, sucursal_id, empleado_id, cliente_id, total, fecha, estado)
- ventas_detalle (id, venta_id, producto_id, cantidad, precio_unitario, subtotal)
- clientes (id, nombre, email, telefono, rfc, limite_credito, saldo_pendiente)
- ordenes_compra (id, proveedor_id, sucursal_destino_id, total_estimado, estado, created_at)
- proveedores (id, nombre, rfc, contacto_nombre, telefono, email)
- movimientos_inventario (id, sucursal_id, producto_id, tipo_movimiento, cantidad, fecha)
- pedidos (id, cliente_id, sucursal_id, total, estado, estado_pago, created_at)

INSTRUCCIONES:
1. Genera SOLO la consulta SQL necesaria para responder la pregunta.
2. Usa funciones SQLite: strftime('%Y-%m', fecha), date('now'), etc.
3. Siempre limita resultados a máximo 20 filas.
4. Para fechas relativas usa: date('now', '-1 month'), date('now', 'start of month'), etc.
5. Responde en formato JSON con: {"sql": "...", "explicacion": "..."}

Si la pregunta no puede responderse con los datos disponibles, responde:
{"sql": null, "explicacion": "No tengo la información necesaria para responder esto."}
`;

/**
 * Genera una consulta SQL a partir de una pregunta en lenguaje natural
 */
const generateSQL = async (question) => {
    if (!openai) {
        return {
            success: false,
            error: 'OpenAI no está configurado. Agrega OPENAI_API_KEY en .env'
        };
    }

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                { role: 'system', content: SCHEMA_CONTEXT },
                { role: 'user', content: question }
            ],
            temperature: 0.1,
            max_tokens: 500
        });

        const content = response.choices[0].message.content;

        // Parsear respuesta JSON
        try {
            // Limpiar posibles backticks de código
            const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            return {
                success: true,
                ...JSON.parse(cleanContent)
            };
        } catch (parseError) {
            // Si no es JSON, intentar extraer SQL
            const sqlMatch = content.match(/SELECT[\s\S]+?(?:;|$)/i);
            if (sqlMatch) {
                return {
                    success: true,
                    sql: sqlMatch[0].replace(/;$/, ''),
                    explicacion: 'Consulta generada'
                };
            }
            return {
                success: false,
                error: 'No pude generar una consulta válida',
                raw: content
            };
        }

    } catch (error) {
        logger.error('Error generando SQL con IA:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Ejecuta una consulta SQL de forma segura (solo SELECT)
 */
const executeQuery = async (sql) => {
    // Validación de seguridad: solo permitir SELECT
    const sqlUpper = sql.toUpperCase().trim();
    if (!sqlUpper.startsWith('SELECT')) {
        return {
            success: false,
            error: 'Solo se permiten consultas SELECT por seguridad'
        };
    }

    // Bloquear palabras peligrosas
    const forbidden = ['DELETE', 'DROP', 'INSERT', 'UPDATE', 'ALTER', 'CREATE', 'TRUNCATE'];
    for (const word of forbidden) {
        if (sqlUpper.includes(word)) {
            return {
                success: false,
                error: `Operación "${word}" no permitida`
            };
        }
    }

    try {
        const result = await pool.query(sql);
        return {
            success: true,
            data: result.rows,
            rowCount: result.rows.length
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Genera una respuesta en lenguaje natural basada en los resultados
 */
const generateNaturalResponse = async (question, results, sql) => {
    if (!openai) {
        // Respuesta básica sin IA
        return formatBasicResponse(results);
    }

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [
                {
                    role: 'system',
                    content: `Eres un asistente de BI que explica resultados de consultas de base de datos de forma clara y profesional.
                    Responde en español, de forma concisa pero informativa.
                    Si hay números monetarios, formatea como moneda mexicana ($X,XXX.XX).
                    Si son fechas, usa formato legible.`
                },
                {
                    role: 'user',
                    content: `Pregunta: ${question}\n\nResultados de la consulta:\n${JSON.stringify(results, null, 2)}\n\nGenera una respuesta clara y profesional.`
                }
            ],
            temperature: 0.7,
            max_tokens: 300
        });

        return response.choices[0].message.content;

    } catch (error) {
        return formatBasicResponse(results);
    }
};

/**
 * Formatea respuesta básica cuando no hay IA disponible
 */
const formatBasicResponse = (results) => {
    if (!results || results.length === 0) {
        return 'No se encontraron resultados para tu consulta.';
    }

    if (results.length === 1) {
        const keys = Object.keys(results[0]);
        const values = Object.values(results[0]);
        return `Resultado: ${keys.map((k, i) => `${k}: ${values[i]}`).join(', ')}`;
    }

    return `Se encontraron ${results.length} registros.`;
};

/**
 * Procesa una consulta completa: pregunta → SQL → ejecución → respuesta
 */
const processQuery = async (question, userId) => {
    const startTime = Date.now();

    // 1. Generar SQL
    const sqlResult = await generateSQL(question);
    if (!sqlResult.success || !sqlResult.sql) {
        return {
            success: false,
            answer: sqlResult.explicacion || sqlResult.error,
            sql: null,
            duration: Date.now() - startTime
        };
    }

    // 2. Ejecutar consulta
    const queryResult = await executeQuery(sqlResult.sql);
    if (!queryResult.success) {
        return {
            success: false,
            answer: `Error ejecutando la consulta: ${queryResult.error}`,
            sql: sqlResult.sql,
            duration: Date.now() - startTime
        };
    }

    // 3. Generar respuesta natural
    const answer = await generateNaturalResponse(question, queryResult.data, sqlResult.sql);

    // 4. Guardar en historial (opcional)
    try {
        await pool.query(`
            INSERT INTO ai_assistant_history (usuario_id, pregunta, sql_generado, respuesta, duracion_ms)
            VALUES ($1, $2, $3, $4, $5)
        `, [userId, question, sqlResult.sql, answer, Date.now() - startTime]);
    } catch (e) {
        // Tabla podría no existir aún, ignorar error
    }

    return {
        success: true,
        answer,
        sql: sqlResult.sql,
        data: queryResult.data,
        rowCount: queryResult.rowCount,
        duration: Date.now() - startTime
    };
};

module.exports = {
    generateSQL,
    executeQuery,
    generateNaturalResponse,
    processQuery
};
