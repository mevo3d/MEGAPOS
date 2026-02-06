const axios = require('axios'); // Assuming axios is not available, use fetch? No, node 18+ has fetch.
const http = require('http');

async function verify() {
    try {
        // 1. Login
        const loginRes = await fetch('http://localhost:3005/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin', password: 'admin123' })
        });
        const loginData = await loginRes.json();
        if (!loginData.token) throw new Error('Login failed');

        const token = loginData.token;

        // 2. Get Order 1
        const orderRes = await fetch('http://localhost:3005/api/pedidos/1', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const order = await orderRes.json();

        console.log('Order ID:', order.id);
        console.log('Estado Pago:', order.estado_pago);
        console.log('Estado Operativo:', order.estado);

        if (order.estado_pago === 'confirmado' || order.estado_pago === 'detectado') {
            console.log('SUCCESS: Payment status updated.');
        } else {
            console.log('FAIL: Payment status not updated.');
        }

    } catch (e) {
        console.error(e);
    }
}

verify();
