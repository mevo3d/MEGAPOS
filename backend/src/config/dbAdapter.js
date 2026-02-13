/**
 * Utilidad para ejecutar consultas compatibles con SQLite y PostgreSQL
 * Detecta automáticamente qué base de datos se está usando
 */

const logger = require('./logger');

// Detectar si es SQLite o PostgreSQL
const isSQLite = process.env.USE_SQLITE === 'true';

// Importar el pool correcto según el tipo de DB
const pool = isSQLite
    ? require('./database-sqlite')
    : require('./db').pool;

/**
 * Convierte placeholders de PostgreSQL ($1, $2) a SQLite (?, ?)
 */
function convertPlaceholders(sql) {
    if (!isSQLite) return sql;

    // Reemplazar $1, $2, $3... por ?
    let index = 1;
    return sql.replace(/\$\d+/g, () => '?');
}

/**
 * Ejecuta una consulta de forma compatible
 */
async function query(sql, params = []) {
    return new Promise((resolve, reject) => {
        if (isSQLite) {
            // Logic to convert $1, $2... to ? and reorder params array
            const sqliteParams = [];
            const adaptedSQL = sql.replace(/\$(\d+)/g, (match, number) => {
                const index = parseInt(number) - 1;
                if (index >= 0 && index < params.length) {
                    sqliteParams.push(params[index]);
                } else {
                    sqliteParams.push(null);
                }
                return '?';
            });

            // Detectar si es una consulta de selección
            const isSelect = /^\s*SELECT/i.test(adaptedSQL);

            if (isSelect) {
                pool.all(adaptedSQL, sqliteParams, (err, rows) => {
                    logger.info(`🔹 SQLite Query (SELECT): ${adaptedSQL} | Params: ${JSON.stringify(sqliteParams)}`);
                    if (err) {
                        logger.error('Error en consulta SQLite:', err);
                        reject(err);
                    } else {
                        resolve({ rows: rows || [] });
                    }
                });
            } else {
                pool.run(adaptedSQL, sqliteParams, function (err) {
                    logger.info(`🔹 SQLite Query (RUN): ${adaptedSQL} | Params: ${JSON.stringify(sqliteParams)}`);
                    if (err) {
                        logger.error('Error en consulta SQLite:', err);
                        reject(err);
                    } else {
                        resolve({
                            rows: [],
                            id: this.lastID,
                            changes: this.changes
                        });
                    }
                });
            }
        } else {
            const adaptedSQL = convertPlaceholders(sql);
            pool.query(adaptedSQL, params)
                .then(result => resolve(result))
                .catch(err => {
                    logger.error('Error en consulta PostgreSQL:', err);
                    reject(err);
                });
        }
    });
}

/**
 * Ejecuta una transacción de forma compatible
 */
async function transaction(callback) {
    if (isSQLite) {
        return new Promise((resolve, reject) => {
            pool.serialize(() => {
                pool.run('BEGIN TRANSACTION', async (err) => {
                    if (err) {
                        console.error('Error iniciando transacción:', err);
                        return reject(err);
                    }

                    try {
                        const client = {
                            query: async (sql, params) => {
                                const adaptedSQL = convertPlaceholders(sql).replace(/RETURNING\s+\w+/gi, '');
                                console.log('Ejecutando SQL:', adaptedSQL.substring(0, 100), 'Params:', params);

                                return new Promise((res, rej) => {
                                    // Si es INSERT, usar run para obtener lastID
                                    if (adaptedSQL.trim().toUpperCase().startsWith('INSERT')) {
                                        pool.run(adaptedSQL, params, function (err) {
                                            if (err) {
                                                console.error('Error en INSERT:', err.message);
                                                rej(err);
                                            } else {
                                                res({
                                                    rows: [{ id: this.lastID }],
                                                    lastID: this.lastID,
                                                    changes: this.changes
                                                });
                                            }
                                        });
                                    } else {
                                        // Para UPDATE, DELETE, etc
                                        pool.run(adaptedSQL, params, function (err) {
                                            if (err) {
                                                console.error('Error en UPDATE/DELETE:', err.message);
                                                rej(err);
                                            } else {
                                                res({
                                                    rows: [],
                                                    changes: this.changes
                                                });
                                            }
                                        });
                                    }
                                });
                            }
                        };

                        const result = await callback(client);

                        pool.run('COMMIT', (err) => {
                            if (err) {
                                console.error('Error en COMMIT:', err);
                                pool.run('ROLLBACK');
                                reject(err);
                            } else {
                                resolve(result);
                            }
                        });

                    } catch (error) {
                        console.error('Error en transacción:', error);
                        pool.run('ROLLBACK', () => {
                            reject(error);
                        });
                    }
                });
            });
        });
    } else {
        // PostgreSQL
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

/**
 * Obtiene un cliente para transacciones manuales
 */
async function getClient() {
    if (isSQLite) {
        // Para SQLite, retornamos un wrapper
        return {
            query: async (sql, params) => query(sql, params),
            release: () => { }, // No-op para SQLite
            run: (sql, params) => {
                return new Promise((resolve, reject) => {
                    const adaptedSQL = convertPlaceholders(sql);
                    pool.run(adaptedSQL, params, function (err) {
                        if (err) reject(err);
                        else resolve({ lastID: this.lastID, changes: this.changes });
                    });
                });
            }
        };
    } else {
        return await pool.connect();
    }
}

module.exports = {
    query,
    transaction,
    getClient,
    isSQLite,
    pool
};
