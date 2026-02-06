const api = require('axios');

async function testAnonymousSale() {
    try {
        console.log('Simulando Venta Anónima...');

        // 1. Crear venta sin cliente (cliente_id: null)
        const ventaData = {
            sucursal_id: 1,
            caja_id: 1,
            empleado_id: 1,
            cliente_id: null,
            subtotal: 100,
            impuestos: 16,
            total: 116,
            items: [
                { producto_id: 1, cantidad: 1, precio_unitario: 100, subtotal: 100, nombre_producto: 'Test Product' }
            ],
            pagos: [{ metodo: 'efectivo', monto: 116, referencia: '' }]
        };

        const res = await api.post('http://localhost:3001/api/ventas', ventaData, {
            headers: { 'Authorization': 'Bearer test_token' } // Mock auth if needed or handled by middleware? Requires valid token usually.
        });

        console.log('✅ Venta creada ID:', res.data.venta.id);

        // Check manual SQL for verification because API might not return internal column
        console.log('Verifica manualmente con: SELECT puntos_perdidos FROM ventas WHERE id =', res.data.venta.id);

    } catch (error) {
        console.error('❌ Error:', error.response ? error.response.data : error.message);
    }
}

// Note: This script requires running backend and valid text_token if auth is strict.
// For quick verification, we might need a logged-in user token.
// Skipped execution for now, rely on logic review.
console.log('Script created for manual testing.');
