import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../context/authStore';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
    Search,
    ShoppingCart,
    Trash2,
    Send,
    User,
    FileText,
    Plus,
    Minus
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const PreparacionPedidos = () => {
    const { user } = useAuthStore();
    const [productos, setProductos] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [carrito, setCarrito] = useState([]);
    const [cliente, setCliente] = useState('Publico General');
    const [notas, setNotas] = useState('');
    const [loading, setLoading] = useState(false);

    // Buscar productos
    const buscarProductos = async (term) => {
        if (!term) return;
        try {
            // Asumiendo endpoint de búsqueda de productos
            const { data } = await api.get(`/productos?search=${term}`);
            setProductos(data);
        } catch (error) {
            console.error('Error buscando productos:', error);
        }
    };

    // Debounce para búsqueda
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (busqueda.length > 2) {
                buscarProductos(busqueda);
            } else {
                setProductos([]);
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [busqueda]);

    const agregarAlCarrito = (producto) => {
        setCarrito(prev => {
            const existe = prev.find(item => item.id === producto.id);
            if (existe) {
                return prev.map(item =>
                    item.id === producto.id
                        ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precio_venta }
                        : item
                );
            }
            return [...prev, {
                ...producto,
                cantidad: 1,
                subtotal: Number(producto.precio_venta)
            }];
        });
        toast.success('Producto agregado');
    };

    const actualizarCantidad = (id, delta) => {
        setCarrito(prev => prev.map(item => {
            if (item.id === id) {
                const nuevaCantidad = Math.max(1, item.cantidad + delta);
                return {
                    ...item,
                    cantidad: nuevaCantidad,
                    subtotal: nuevaCantidad * item.precio_venta
                };
            }
            return item;
        }));
    };

    const eliminarDelCarrito = (id) => {
        setCarrito(prev => prev.filter(item => item.id !== id));
    };

    const enviarPedido = async () => {
        if (carrito.length === 0) {
            toast.error('El carrito está vacío');
            return;
        }

        setLoading(true);
        try {
            // 1. Crear pedido
            const pedidoData = {
                sucursal_id: user.sucursal_id,
                punto_venta_origen_id: user.punto_venta_id, // Si el usuario tiene punto de venta asignado
                empleado_id: user.id,
                cliente_nombre: cliente,
                notas
            };

            const { data: pedido } = await api.post('/pedidos', pedidoData);

            // 2. Agregar items
            const items = carrito.map(item => ({
                producto_id: item.id,
                cantidad: item.cantidad,
                precio_unitario: item.precio_venta
            }));

            await api.post(`/pedidos/${pedido.pedido.id}/items`, { items });

            // 3. (Opcional) Enviar directo a caja si se requiere
            await api.put(`/pedidos/${pedido.pedido.id}/enviar-caja`);

            toast.success('Pedido enviado a caja correctamente');
            limpiarTodo();

        } catch (error) {
            console.error('Error enviando pedido:', error);
            toast.error('Error al enviar el pedido');
        } finally {
            setLoading(false);
        }
    };

    const limpiarTodo = () => {
        setCarrito([]);
        setCliente('Publico General');
        setNotas('');
        setBusqueda('');
        setProductos([]);
    };

    const total = carrito.reduce((sum, item) => sum + item.subtotal, 0);

    return (
        <div className="flex h-[calc(100vh-80px)] gap-4 p-4">
            {/* Panel Izquierdo: Catálogo y Búsqueda */}
            <div className="w-2/3 flex flex-col gap-4">
                <Card className="glass border-0 shadow-lg flex-1 flex flex-col overflow-hidden">
                    <CardHeader className="p-4 border-b border-white/10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                            <Input
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                placeholder="Buscar productos por nombre o código..."
                                className="pl-10 h-12 text-lg bg-gray-50/50"
                                autoFocus
                            />
                        </div>
                    </CardHeader>
                    <CardContent className="p-4 flex-1 overflow-y-auto">
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                            {productos.length > 0 ? (
                                productos.map(producto => (
                                    <div
                                        key={producto.id}
                                        onClick={() => agregarAlCarrito(producto)}
                                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
                                    >
                                        <div className="h-24 bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-gray-400">
                                            {/* Placeholder para imagen */}
                                            <ShoppingCart size={32} />
                                        </div>
                                        <h3 className="font-semibold text-gray-800 line-clamp-2 mb-1">{producto.nombre}</h3>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-lg font-bold text-blue-600">${Number(producto.precio_venta).toFixed(2)}</span>
                                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                                Stock: {producto.stock || 0}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                busqueda.length > 2 && (
                                    <div className="col-span-full text-center py-12 text-gray-400">
                                        No se encontraron productos
                                    </div>
                                )
                            )}

                            {!busqueda && (
                                <div className="col-span-full text-center py-12 text-gray-400 flex flex-col items-center">
                                    <Search size={48} className="mb-4 opacity-50" />
                                    <p>Escribe para buscar productos</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Panel Derecho: Carrito/Pedido Actual */}
            <div className="w-1/3 flex flex-col gap-4">
                <Card className="glass border-0 shadow-lg flex-1 flex flex-col h-full bg-white/90">
                    <CardHeader className="p-4 border-b border-gray-100 bg-white">
                        <CardTitle className="flex items-center gap-2 text-gray-800">
                            <ShoppingCart className="h-5 w-5 text-blue-600" />
                            Pedido Actual
                        </CardTitle>
                    </CardHeader>

                    <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
                        {/* Lista de Items */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {carrito.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <ShoppingCart size={48} className="mb-4 opacity-20" />
                                    <p>El carrito está vacío</p>
                                </div>
                            ) : (
                                carrito.map(item => (
                                    <div key={item.id} className="flex gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-800 text-sm line-clamp-1">{item.nombre}</h4>
                                            <div className="text-blue-600 font-bold mt-1">
                                                ${item.subtotal.toFixed(2)}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200">
                                                <button
                                                    onClick={() => actualizarCantidad(item.id, -1)}
                                                    className="p-1 hover:bg-gray-100 text-gray-600"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className="text-sm font-medium w-6 text-center">{item.cantidad}</span>
                                                <button
                                                    onClick={() => actualizarCantidad(item.id, 1)}
                                                    className="p-1 hover:bg-gray-100 text-gray-600"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => eliminarDelCarrito(item.id)}
                                                className="text-red-500 hover:text-red-600 text-xs flex items-center gap-1"
                                            >
                                                <Trash2 size={12} /> Eliminar
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Info Cliente y Totales */}
                        <div className="p-4 bg-white border-t border-gray-100 shadow-xl z-10">
                            <div className="space-y-3 mb-4">
                                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                    <User size={18} className="text-gray-400" />
                                    <input
                                        value={cliente}
                                        onChange={(e) => setCliente(e.target.value)}
                                        className="bg-transparent text-sm w-full focus:outline-none"
                                        placeholder="Nombre del cliente"
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                                    <FileText size={18} className="text-gray-400" />
                                    <input
                                        value={notas}
                                        onChange={(e) => setNotas(e.target.value)}
                                        className="bg-transparent text-sm w-full focus:outline-none"
                                        placeholder="Notas o instrucciones..."
                                    />
                                </div>
                            </div>

                            <div className="flex justify-between items-end mb-4">
                                <span className="text-gray-500 font-medium">Total a Pagar</span>
                                <span className="text-3xl font-bold text-gray-900">${total.toFixed(2)}</span>
                            </div>

                            <Button
                                onClick={enviarPedido}
                                disabled={carrito.length === 0 || loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg shadow-lg shadow-blue-500/30"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Enviando...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <Send size={20} />
                                        Enviar a Caja
                                    </span>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PreparacionPedidos;
