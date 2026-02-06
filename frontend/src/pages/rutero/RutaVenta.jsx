import React, { useState, useEffect } from 'react';
import { ArrowLeft, Search, Plus, Minus, Trash2, CreditCard, Save, Send, MessageCircle, Link2, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function RutaVenta() {
    const navigate = useNavigate();
    const [inventario, setInventario] = useState([]);
    const [cart, setCart] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [search, setSearch] = useState('');
    const [step, setStep] = useState(1); // 1: Productos, 2: Checkout, 3: Pago
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [ventaCompletada, setVentaCompletada] = useState(null);
    const [pagoLink, setPagoLink] = useState(null);
    const [procesando, setProcesando] = useState(false);

    useEffect(() => {
        const load = async () => {
            try {
                const invRes = await api.get('/rutero/inventario');
                setInventario(invRes.data);
                const cliRes = await api.get('/clientes?limit=100');
                setClientes(cliRes.data.data || []);
            } catch (e) {
                console.error(e);
            }
        };
        load();
    }, []);

    const addToCart = (prod) => {
        const existing = cart.find(i => i.producto_id === prod.producto_id);
        if (existing) {
            if (existing.cantidad + 1 > prod.cantidad) return toast.error('Stock insuficiente');
            setCart(cart.map(i => i.producto_id === prod.producto_id ? { ...i, cantidad: i.cantidad + 1 } : i));
        } else {
            setCart([...cart, { ...prod, cantidad: 1 }]);
        }
    };

    const removeFromCart = (id) => setCart(cart.filter(i => i.producto_id !== id));

    const updateQty = (id, delta) => {
        setCart(cart.map(i => {
            if (i.producto_id === id) {
                const newQty = i.cantidad + delta;
                const maxStock = inventario.find(p => p.producto_id === id)?.cantidad || 0;
                if (newQty > maxStock) {
                    toast.error('Stock insuficiente');
                    return i;
                }
                return newQty > 0 ? { ...i, cantidad: newQty } : i;
            }
            return i;
        }));
    };

    const total = cart.reduce((sum, i) => sum + (i.precio_base * i.cantidad), 0);

    const handleCheckout = async () => {
        if (!selectedCliente) return toast.error('Selecciona un cliente');
        if (cart.length === 0) return toast.error('Carrito vacío');

        setProcesando(true);
        const toastId = toast.loading('Procesando venta...');

        try {
            // Get location for sale record
            const location = await new Promise((resolve) => {
                if (!navigator.geolocation) resolve(null);
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    () => resolve(null)
                );
            });

            const payload = {
                cliente_id: selectedCliente.id,
                items: cart.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio: i.precio_base, nombre: i.nombre })),
                total,
                coordenadas: location
            };

            const res = await api.post('/rutero/ventas', payload);
            toast.success('Venta registrada', { id: toastId });
            setVentaCompletada(res.data.venta);

            // Si el pago es con link, generar link
            if (metodoPago === 'link') {
                await generarLinkPago(res.data.venta);
            }

            setStep(3); // Ir a confirmación

        } catch (error) {
            toast.error('Error: ' + (error.response?.data?.message || 'Fallo conexión'), { id: toastId });
        } finally {
            setProcesando(false);
        }
    };

    const generarLinkPago = async (venta) => {
        try {
            const res = await api.post('/rutero/pagos/link', {
                venta_id: venta?.id,
                monto: total,
                descripcion: `Venta MEGAMAYOREO - ${cart.length} productos`,
                cliente_id: selectedCliente?.id
            });
            setPagoLink(res.data);
            return res.data;
        } catch (error) {
            console.error('Error generando link:', error);
            toast.error('No se pudo generar el link de pago');
        }
    };

    const enviarPorWhatsApp = async () => {
        if (!pagoLink || !selectedCliente?.telefono) {
            toast.error('Falta información para enviar');
            return;
        }

        try {
            const res = await api.post('/rutero/pagos/enviar-whatsapp', {
                pago_id: pagoLink.pago.id,
                telefono: selectedCliente.telefono,
                cliente_id: selectedCliente.id
            });

            // Abrir WhatsApp
            window.open(res.data.whatsapp_url, '_blank');
            toast.success('Redirigiendo a WhatsApp...');
        } catch (error) {
            toast.error('Error al preparar envío');
        }
    };

    const filtered = inventario.filter(i => i.nombre.toLowerCase().includes(search.toLowerCase()));

    // ==================== PANTALLA 3: CONFIRMACIÓN ====================
    if (step === 3) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <header className="bg-green-600 p-4 flex items-center gap-4 shadow-sm">
                    <CheckCircle className="w-8 h-8 text-white" />
                    <h1 className="font-bold text-white text-lg">¡Venta Completada!</h1>
                </header>

                <div className="p-4 flex-1 space-y-4">
                    {/* Resumen de Venta */}
                    <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                        <p className="text-4xl font-bold text-green-600 mb-2">${total.toFixed(2)}</p>
                        <p className="text-gray-500">{cart.length} productos</p>
                        <p className="text-sm text-gray-400 mt-2">Cliente: {selectedCliente?.nombre}</p>
                    </div>

                    {/* Link de Pago */}
                    {metodoPago === 'link' && pagoLink && (
                        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl space-y-4">
                            <div className="flex items-center gap-2">
                                <Link2 className="w-5 h-5 text-blue-600" />
                                <h3 className="font-bold text-blue-800">Link de Pago Generado</h3>
                            </div>

                            <div className="bg-white p-3 rounded-lg break-all text-sm text-gray-600">
                                {pagoLink.link}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(pagoLink.link);
                                        toast.success('Link copiado');
                                    }}
                                    className="flex-1 py-3 bg-white border border-blue-300 text-blue-600 rounded-xl font-medium flex items-center justify-center gap-2"
                                >
                                    <Link2 className="w-4 h-4" />
                                    Copiar Link
                                </button>

                                {selectedCliente?.telefono && (
                                    <button
                                        onClick={enviarPorWhatsApp}
                                        className="flex-1 py-3 bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-green-600"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        WhatsApp
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Acciones */}
                    <div className="space-y-3 mt-6">
                        <button
                            onClick={() => {
                                setCart([]);
                                setSelectedCliente(null);
                                setStep(1);
                                setVentaCompletada(null);
                                setPagoLink(null);
                                setMetodoPago('efectivo');
                            }}
                            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg"
                        >
                            Nueva Venta
                        </button>
                        <button
                            onClick={() => navigate('/rutero')}
                            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium"
                        >
                            Volver al Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==================== PANTALLA 2: CHECKOUT ====================
    if (step === 2) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <header className="bg-white p-4 flex items-center gap-4 shadow-sm">
                    <button onClick={() => setStep(1)} className="p-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="font-bold flex-1">Confirmar Venta</h1>
                </header>

                <div className="p-4 space-y-4 flex-1 overflow-y-auto">
                    {/* Selección de Cliente */}
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
                        <select
                            className="w-full border p-3 rounded-lg bg-gray-50"
                            value={selectedCliente?.id || ''}
                            onChange={e => setSelectedCliente(clientes.find(c => c.id === parseInt(e.target.value)))}
                        >
                            <option value="">Selecciona cliente...</option>
                            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                        {selectedCliente?.telefono && (
                            <p className="text-xs text-gray-500 mt-2">📱 {selectedCliente.telefono}</p>
                        )}
                    </div>

                    {/* Resumen de Productos */}
                    <div className="bg-white p-4 rounded-xl shadow-sm space-y-3">
                        <h3 className="font-medium border-b pb-2">Resumen</h3>
                        {cart.map(item => (
                            <div key={item.producto_id} className="flex justify-between text-sm">
                                <span>{item.cantidad} x {item.nombre}</span>
                                <span>${(item.cantidad * item.precio_base).toFixed(2)}</span>
                            </div>
                        ))}
                        <div className="flex justify-between text-xl font-bold pt-2 border-t">
                            <span>Total</span>
                            <span>${total.toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Método de Pago */}
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                        <h3 className="font-medium mb-3">Método de Pago</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setMetodoPago('efectivo')}
                                className={`p-4 rounded-xl border-2 transition-all ${metodoPago === 'efectivo' ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                            >
                                <span className="text-2xl">💵</span>
                                <p className="text-sm font-medium mt-1">Efectivo</p>
                            </button>
                            <button
                                onClick={() => setMetodoPago('tarjeta')}
                                className={`p-4 rounded-xl border-2 transition-all ${metodoPago === 'tarjeta' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                            >
                                <span className="text-2xl">💳</span>
                                <p className="text-sm font-medium mt-1">Tarjeta</p>
                            </button>
                            <button
                                onClick={() => setMetodoPago('transferencia')}
                                className={`p-4 rounded-xl border-2 transition-all ${metodoPago === 'transferencia' ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}
                            >
                                <span className="text-2xl">🏦</span>
                                <p className="text-sm font-medium mt-1">Transferencia</p>
                            </button>
                            <button
                                onClick={() => setMetodoPago('link')}
                                className={`p-4 rounded-xl border-2 transition-all ${metodoPago === 'link' ? 'border-orange-500 bg-orange-50' : 'border-gray-200'}`}
                            >
                                <span className="text-2xl">🔗</span>
                                <p className="text-sm font-medium mt-1">Link de Pago</p>
                            </button>
                        </div>
                        {metodoPago === 'link' && (
                            <p className="text-xs text-orange-600 mt-2 bg-orange-50 p-2 rounded-lg">
                                Se generará un link de Mercado Pago que podrás enviar por WhatsApp
                            </p>
                        )}
                    </div>
                </div>

                {/* Botón Finalizar */}
                <div className="p-4 bg-white border-t safe-area-bottom">
                    <button
                        onClick={handleCheckout}
                        disabled={procesando || !selectedCliente}
                        className="w-full bg-green-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {procesando ? (
                            <span>Procesando...</span>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Finalizar Venta
                            </>
                        )}
                    </button>
                </div>
            </div>
        );
    }

    // ==================== PANTALLA 1: PRODUCTOS ====================
    return (
        <div className="h-screen bg-gray-50 flex flex-col">
            <header className="bg-white p-4 flex gap-4 shadow-sm z-10 sticky top-0">
                <button onClick={() => navigate('/rutero')} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    <input
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full outline-none"
                        placeholder="Buscar..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-4 pb-24">
                <div className="grid grid-cols-1 gap-3">
                    {filtered.map(p => (
                        <div key={p.producto_id} className="bg-white p-3 rounded-xl shadow-sm flex items-center justify-between">
                            <div className="flex items-center gap-3 overflow-hidden">
                                {p.imagen_url ? (
                                    <img src={p.imagen_url} alt={p.nombre} className="w-12 h-12 rounded-lg object-cover" />
                                ) : (
                                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-gray-400 text-xs">IMG</div>
                                )}
                                <div className="min-w-0">
                                    <h4 className="font-medium truncate text-sm">{p.nombre}</h4>
                                    <p className="text-green-600 font-bold">${p.precio_base}</p>
                                    <p className="text-xs text-gray-400">Stock: {p.cantidad}</p>
                                </div>
                            </div>
                            {cart.find(i => i.producto_id === p.producto_id) ? (
                                <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                                    <button onClick={() => updateQty(p.producto_id, -1)} className="p-1 rounded bg-white shadow hover:bg-gray-50"><Minus className="w-4 h-4" /></button>
                                    <span className="font-bold w-4 text-center">{cart.find(i => i.producto_id === p.producto_id).cantidad}</span>
                                    <button onClick={() => updateQty(p.producto_id, 1)} className="p-1 rounded bg-white shadow hover:bg-gray-50"><Plus className="w-4 h-4" /></button>
                                </div>
                            ) : (
                                <button onClick={() => addToCart(p)} className="bg-blue-600 text-white p-2 rounded-lg shadow"><Plus className="w-5 h-5" /></button>
                            )}
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <p className="text-center text-gray-400 py-8">No se encontraron productos</p>
                    )}
                </div>
            </div>

            {cart.length > 0 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t safe-area-bottom">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-500">{cart.reduce((s, i) => s + i.cantidad, 0)} items</span>
                        <span className="text-xl font-bold">${total.toFixed(2)}</span>
                    </div>
                    <button onClick={() => setStep(2)} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg">
                        Ver Carrito y Pagar
                    </button>
                </div>
            )}
        </div>
    );
}
