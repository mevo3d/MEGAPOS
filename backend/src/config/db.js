// Selector de base de datos - selecciona automáticamente SQLite o PostgreSQL
require('dotenv').config();

let database;

if (process.env.USE_SQLITE === 'true') {
    database = require('./database-sqlite');
} else {
    database = require('./database');
}

module.exports = database;
