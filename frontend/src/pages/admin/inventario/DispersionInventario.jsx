import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { ArrowRight, Search, Truck, Package, X, AlertCircle } from 'lucide-react';
import api from '../../../utils/api';
import { useAuthStore } from '../../../context/authStore';

export default function DispersionInventario() {
    const { user } = useAuthStore();
    const [sucursales, setSucursales] = useState([]);
    const [origenId, setOrigenId] = useState('');
    const [destinoId, setDestinoId] = useState('');
    const [search, setSearch] = useState('');
    const [productos, setProductos] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    useEffect(() => {
        fetchSucursales();
    }, []);

    useEffect(() => {
        if (search.length > 2 && origenId) {
            const delayDebounceFn = setTimeout(() => {
                searchProductos();
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        } else {
            setProductos([]);
        }
    }, [search, origenId]);

    const fetchSucursales = async () => {
        try {
            const res = await api.get('/sucursales');
            setSucursales(res.data);
            // Default origen to CEDIS if exists, or current user sucursal
            const cedis = res.data.find(s => s.nombre.toUpperCase().includes('CEDIS'));
            if (cedis) setOrigenId(cedis.id);
            else if (user?.sucursal_id) setOrigenId(user.sucursal_id);
        } catch (error) {
            console.error('Error cargando sucursales', error);
        }
    };

    const searchProductos = async () => {
        try {
            // Usamos el endpoint de inventario filtrado por la sucursal de origen
            // Necesitamos pasar un header custom o interceptor para simular "ser" esa sucursal 
            // o usar un endpoint que acepte sucursal_id como param.
            // Como el backend actual usa req.sucursalId del token, vamos a tener q ajustar o usar un endpoint especial
            // Ojo: En inventario.controller.js -> getInventario usa req.sucursalId.
            // Haremos un truco temporal o mejor, usaremos un endpoint que permita pasar sucursal_id si eres admin.
            // Por ahora, asumimos que el endpoint normal filtra por TOKEN. 
            // SI el usuario es ADMIN, quizas deberia poder ver cualquier inventario.

            // WORKAROUND: Si el endpoint backend es estricto con req.sucursalId, 
            // necesitamos un endpoint 'admin/inventario?sucursal_id=X'.
            // Pero intentemos buscar productos y mostrar stock local.

            // Si hay un origen seleccionado, buscamos en el inventario DE ESE ORIGEN
            const queryParams = `search=${search}&limit=10${origenId ? `&sucursal_id=${origenId}` : ''}`;
            const res = await api.get(`/inventario?${queryParams}`);

            // Nota: El backend ya fue ajustado para respetar sucursal_id si eres admin/cedis.
            // Esto mostrará el stock de la sucursal origen seleccionada.
            setProductos(res.data);
        } catch (error) {
            console.error('Error buscando productos', error);
        }
    };

    const addToCart = (product) => {
        const existing = cart.find(item => item.id === product.id);
        if (existing) return;
        setCart([...cart, { ...product, cantidad_a_enviar: 1 }]);
        setSearch('');
        setProductos([]);
    };

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.id !== productId));
    };

    const updateQuantity = (productId, qty) => {
        setCart(cart.map(item =>
            item.id === productId ? { ...item, cantidad_a_enviar: parseInt(qty) || 0 } : item
        ));
    };

    const handleTransfer = async () => {
        if (!origenId || !destinoId) return;
        if (cart.length === 0) return;
        if (origenId === destinoId) {
            alert("Origen y Destino no pueden ser iguales");
            return;
        }

        setLoading(true);
        try {
            const items = cart.map(({ id, cantidad_a_enviar }) => ({
                producto_id: id,
                cantidad: cantidad_a_enviar
            }));

            await api.post('/inventario/transferencias', {
                sucursal_origen_id: origenId,
                sucursal_destino_id: destinoId,
                items,
                tipo: 'envio', // Dispersión = push
                observaciones: 'Dispersión desde Panel Administrativo'
            });

            setSuccessMsg('Transferencia enviada correctamente');
            setCart([]);
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (error) {
            console.error('Error creando transferencia', error);
            alert('Error al crear transferencia');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Dispersión de Inventario</h2>
                <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-lg flex items-center gap-2">
                    <Truck size={20} />
                    <span>Modo: Envío Directo (CEDIS &rarr; Sucursal)</span>
                </div>
            </div>

            {successMsg && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
                    {successMsg}
                </div>
            )}

            {/* Selectores de Sucursal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader>
                        <CardTitle className="text-blue-600">Origen (Desde donde sale)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <select
                            className="w-full p-2 border rounded-lg bg-gray-50 font-medium"
                            value={origenId}
                            onChange={(e) => setOrigenId(e.target.value)}
                        >
                            <option value="">Seleccionar Origen...</option>
                            {sucursales.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                        <p className="text-sm text-gray-500 mt-2">
                            El inventario se descontará de aquí inmediatamente.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-green-500">
                    <CardHeader>
                        <CardTitle className="text-green-600">Destino (Quien recibe)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <select
                            className="w-full p-2 border rounded-lg bg-gray-50 font-medium"
                            value={destinoId}
                            onChange={(e) => setDestinoId(e.target.value)}
                        >
                            <option value="">Seleccionar Destino...</option>
                            {sucursales.map(s => (
                                <option key={s.id} value={s.id}>{s.nombre}</option>
                            ))}
                        </select>
                        <p className="text-sm text-gray-500 mt-2">
                            Deberán confirmar recepción para ver el stock.
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Buscador */}
            <Card>
                <CardContent className="p-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar producto por nombre o código..."
                            className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    {productos.length > 0 && (
                        <div className="mt-2 border rounded-xl overflow-hidden shadow-lg absolute z-10 w-full bg-white max-h-60 overflow-y-auto">
                            {productos.map(prod => (
                                <div
                                    key={prod.id}
                                    className="p-3 hover:bg-gray-50 cursor-pointer flex justify-between items-center border-b last:border-0"
                                    onClick={() => addToCart(prod)}
                                >
                                    <div>
                                        <p className="font-semibold text-gray-800">{prod.nombre}</p>
                                        <p className="text-xs text-gray-500">{prod.sku}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                                            Stock: {prod.stock_fisico}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Lista de Transferencia (Carrito) */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Package className="text-gray-600" />
                        Productos a Transferir
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {cart.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            No hay productos seleccionados. Busca y agrega productos arriba.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="hidden md:grid grid-cols-12 gap-4 text-sm font-semibold text-gray-500 pb-2 border-b">
                                <div className="col-span-6">Producto</div>
                                <div className="col-span-2 text-center">Stock Actual</div>
                                <div className="col-span-3 text-center">Cantidad a Enviar</div>
                                <div className="col-span-1"></div>
                            </div>
                            {cart.map(item => (
                                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center border-b pb-4 last:border-0">
                                    <div className="col-span-6">
                                        <p className="font-medium text-gray-900">{item.nombre}</p>
                                        <p className="text-xs text-gray-500">{item.sku}</p>
                                    </div>
                                    <div className="col-span-2 text-center">
                                        <span className="bg-gray-100 px-2 py-1 rounded text-sm text-gray-600">
                                            {item.stock_fisico}
                                        </span>
                                    </div>
                                    <div className="col-span-3">
                                        <input
                                            type="number"
                                            min="1"
                                            max={item.stock_fisico}
                                            className="w-full p-2 border rounded text-center focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={item.cantidad_a_enviar}
                                            onChange={(e) => updateQuantity(item.id, e.target.value)}
                                        />
                                    </div>
                                    <div className="col-span-1 text-center">
                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="mt-8 flex justify-end">
                        <Button
                            onClick={handleTransfer}
                            disabled={cart.length === 0 || loading || !origenId || !destinoId}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg shadow-lg hover:shadow-blue-500/30 transition-all"
                        >
                            {loading ? 'Procesando...' : 'Confirmar Dispersión'}
                            {!loading && <ArrowRight className="ml-2 h-5 w-5" />}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
