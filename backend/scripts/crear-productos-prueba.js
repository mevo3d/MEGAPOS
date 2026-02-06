// Script para crear productos de prueba
const { pool } = require('../src/config/db');
const logger = require('../src/config/logger');

async function crearProductosPrueba() {
    try {
        console.log('🛒 Creando productos de prueba...\n');

        // 1. Crear algunos productos
        const productos = [
            { codigo: 'PROD001', nombre: 'Coca Cola 600ml', precio: 15.00, categoria: 'Bebidas' },
            { codigo: 'PROD002', nombre: 'Sabritas Original 45g', precio: 12.50, categoria: 'Botanas' },
            { codigo: 'PROD003', nombre: 'Pan Bimbo Blanco', precio: 32.00, categoria: 'Panadería' },
            { codigo: 'PROD004', nombre: 'Leche Lala 1L', precio: 22.00, categoria: 'Lácteos' },
            { codigo: 'PROD005', nombre: 'Agua Bonafont 1.5L', precio: 10.00, categoria: 'Bebidas' }
        ];

        for (const prod of productos) {
            // Insertar producto
            const prodResult = await pool.query(`
                INSERT INTO productos_catalogo (codigo, nombre, precio_venta, categoria, activo)
                VALUES ($1, $2, $3, $4, 1)
                ON CONFLICT (codigo) DO NOTHING
            `, [prod.codigo, prod.nombre, prod.precio, prod.categoria]);

            // Obtener el ID del producto
            const getId = await pool.query('SELECT id FROM productos_catalogo WHERE codigo = $1', [prod.codigo]);

            if (getId.rows.length > 0) {
                const productoId = getId.rows[0].id;

                // Crear inventario para sucursal 1 (con stock inicial de 100)
                await pool.query(`
                    INSERT INTO inventario_sucursal (sucursal_id, producto_id, stock_actual, stock_minimo)
                    VALUES (1, $1, 100, 10)
                    ON CONFLICT (sucursal_id, producto_id) DO UPDATE
                    SET stock_actual = 100
                `, [productoId]);

                console.log(`✅ Producto creado: ${prod.nombre} - Stock: 100 unidades`);
            }
        }

        console.log('\n🎉 ¡Productos de prueba creados exitosamente!');
        console.log('📦 Total: 5 productos con 100 unidades cada uno en Sucursal 1\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        logger.error('Error creando productos de prueba:', error);
    } finally {
        process.exit(0);
    }
}

crearProductosPrueba();
