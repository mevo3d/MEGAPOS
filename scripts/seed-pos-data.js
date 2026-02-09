const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'backend', 'data', 'megamayoreo.db');
const db = new sqlite3.Database(dbPath);

const configValues = [
    { clave: 'nombre_empresa', valor: 'Mega Mayoreo POS', descripcion: 'Nombre de la empresa' },
    { clave: 'puntos_activo', valor: 'true', descripcion: 'Activar sistema de puntos' },
    { clave: 'puntos_por_peso', valor: '0.01', descripcion: 'Puntos ganados por cada peso de compra' },
    { clave: 'puntos_valor_canje', valor: '1', descripcion: 'Valor de cada punto en pesos para canje' },
    { clave: 'ticket_pie_pagina', valor: '¡Gracias por su compra!', descripcion: 'Texto al final del ticket' }
];

async function seed() {
    console.log('--- Iniciando Seed de Datos ---');

    return new Promise((resolve, reject) => {
        db.serialize(async () => {
            // 1. Poblar configuración
            console.log('Poblando configuración...');
            const stmtConfig = db.prepare('INSERT OR IGNORE INTO configuracion_sistema (clave, valor, descripcion) VALUES (?, ?, ?)');
            configValues.forEach(c => stmtConfig.run(c.clave, c.valor, c.descripcion));
            stmtConfig.finalize();

            // 2. Asegurar inventario en todas las sucursales
            console.log('Asegurando inventario en todas las sucursales...');

            // Obtener todas las sucursales y todos los productos
            db.all('SELECT id FROM sucursales', [], (err, sucursales) => {
                if (err) return reject(err);

                db.all('SELECT id FROM productos_catalogo', [], (err, productos) => {
                    if (err) return reject(err);

                    console.log(`Sucursales: ${sucursales.length}, Productos: ${productos.length}`);

                    const stmtInv = db.prepare('INSERT OR IGNORE INTO inventario_sucursal (sucursal_id, producto_id, stock_actual, stock_minimo) VALUES (?, ?, ?, ?)');

                    sucursales.forEach(s => {
                        productos.forEach(p => {
                            // Insertar con stock inicial de 100 para pruebas en todas las sucursales si no existe
                            stmtInv.run(s.id, p.id, 100, 5);
                        });
                    });

                    stmtInv.finalize(() => {
                        console.log('--- Seed completado exitosamente ---');
                        db.close();
                        resolve();
                    });
                });
            });
        });
    });
}

seed().catch(err => {
    console.error('Error en el seed:', err);
    process.exit(1);
});
