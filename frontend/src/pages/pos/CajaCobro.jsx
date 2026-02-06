import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../context/authStore';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import {
    ShoppingCart,
    CreditCard,
    Banknote,
    CheckCircle2,
    Clock,
    RefreshCcw,
    Printer,
    ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const CajaCobro = () => {
    const { user } = useAuthStore();
    const [pedidos, setPedidos] = useState([]);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [montoRecibido, setMontoRecibido] = useState('');
    const [loading, setLoading] = useState(false);
    const [cobrando, setCobrando] = useState(false);

    // Cargar pedidos pendientes
    const cargarPedidos = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/pedidos/sucursal/${user.sucursal_id}?estado=enviado_caja`);
            setPedidos(data);
        } catch (error) {
            console.error('Error cargando pedidos:', error);
            toast.error('Error al actualizar lista de pedidos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarPedidos();
        // Polling cada 15 segundos para nuevos pedidos
        const interval = setInterval(cargarPedidos, 15000);
        return () => clearInterval(interval);
    }, [user.sucursal_id]);

    const seleccionarPedido = async (id) => {
        try {
            const { data } = await api.get(`/pedidos/${id}`);
            setPedidoSeleccionado(data);
            setMontoRecibido(''); // Reset monto
        } catch (error) {
            toast.error('Error al cargar detalles del pedido');
        }
    };

    const procesarCobro = async () => {
        if (!pedidoSeleccionado) return;

        const total = parseFloat(pedidoSeleccionado.total);
        const recibido = parseFloat(montoRecibido || 0);

        if (metodoPago === 'efectivo' && recibido < total) {
            toast.error(`Monto insuficiente. Faltan $${(total - recibido).toFixed(2)}`);
            return;
        }

        setCobrando(true);
        try {
            // Aquí iría el endpoint real de cobro
            // Por ahora simulamos enviando a 'cobrado' con fecha
            await api.put(`/pedidos/${pedidoSeleccionado.id}/cobrar`, {
                metodo_pago: metodoPago,
                monto_recibido: recibido,
                cambio: recibido - total
            });

            toast.success('¡Cobro exitoso! Ticket generado');
            setPedidoSeleccionado(null);
            cargarPedidos();
        } catch (error) {
            console.error('Error procesando cobro:', error);
            toast.error('Error al procesar el cobro');
        } finally {
            setCobrando(false);
        }
    };

    const cambio = parseFloat(montoRecibido || 0) - (pedidoSeleccionado ? parseFloat(pedidoSeleccionado.total) : 0);

    return (
        <div className="flex h-[calc(100vh-80px)] gap-4 p-4">
            {/* Lista de Pedidos Pendientes */}
            <div className={`${pedidoSeleccionado ? 'hidden lg:flex lg:w-1/3' : 'w-full'} flex-col gap-4`}>
                <Card className="glass border-0 shadow-lg flex-1 flex flex-col overflow-hidden bg-white/90">
                    <CardHeader className="p-4 border-b border-gray-100 flex flex-row justify-between items-center">
                        <CardTitle className="text-gray-800 flex items-center gap-2">
                            <Clock className="h-5 w-5 text-orange-500" />
                            Pedidos en Cola
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={cargarPedidos}
                            disabled={loading}
                        >
                            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto">
                        {pedidos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
                                <CheckCircle2 size={48} className="mb-4 text-green-100" />
                                <p>No hay pedidos pendientes de cobro</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {pedidos.map(pedido => (
                                    <div
                                        key={pedido.id}
                                        onClick={() => seleccionarPedido(pedido.id)}
                                        className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors ${pedidoSeleccionado?.id === pedido.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-semibold text-gray-800">#{pedido.id.toString().padStart(4, '0')}</span>
                                            <span className="font-bold text-blue-600">${parseFloat(pedido.total).toFixed(2)}</span>
                                        </div>
                                        <div className="text-sm text-gray-500 flex justify-between">
                                            <span>{pedido.cliente_nombre || 'Cliente General'}</span>
                                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                                En Caja
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-400 mt-2">
                                            Atendido por: {pedido.empleado_nombre || 'Vendedor'}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Detalle y Cobro */}
            {pedidoSeleccionado ? (
                <div className="flex-1 flex flex-col gap-4 animate-in slide-in-from-right duration-200">
                    <Card className="glass border-0 shadow-lg flex-1 flex flex-col overflow-hidden bg-white">
                        <CardHeader className="p-4 border-b border-gray-100 flex flex-row items-center gap-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="lg:hidden"
                                onClick={() => setPedidoSeleccionado(null)}
                            >
                                <ArrowLeft size={20} />
                            </Button>
                            <div>
                                <CardTitle className="text-gray-900">Cobrar Pedido #{pedidoSeleccionado.id.toString().padStart(4, '0')}</CardTitle>
                                <p className="text-sm text-gray-500">{pedidoSeleccionado.cliente_nombre}</p>
                            </div>
                        </CardHeader>

                        <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">
                            {/* Lista de Productos */}
                            <div className="flex-[3] border-r border-gray-100 overflow-y-auto p-4">
                                <table className="w-full text-sm">
                                    <thead className="text-gray-500 border-b border-gray-100">
                                        <tr>
                                            <th className="text-left pb-2 font-medium">Producto</th>
                                            <th className="text-center pb-2 font-medium">Cant.</th>
                                            <th className="text-right pb-2 font-medium">Precio</th>
                                            <th className="text-right pb-2 font-medium">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {pedidoSeleccionado.items?.map(item => (
                                            <tr key={item.id}>
                                                <td className="py-3 pr-2">
                                                    <p className="font-medium text-gray-800">{item.producto_nombre}</p>
                                                    <p className="text-xs text-gray-400">{item.codigo}</p>
                                                </td>
                                                <td className="text-center py-3">{item.cantidad}</td>
                                                <td className="text-right py-3">${parseFloat(item.precio_unitario).toFixed(2)}</td>
                                                <td className="text-right py-3 font-medium">${parseFloat(item.subtotal).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Panel de Cobro */}
                            <div className="flex-[2] bg-gray-50 p-6 flex flex-col justify-between">
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-2">Método de Pago</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setMetodoPago('efectivo')}
                                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${metodoPago === 'efectivo'
                                                        ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500'
                                                        : 'bg-white border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <Banknote size={24} />
                                                <span className="font-medium text-sm">Efectivo</span>
                                            </button>
                                            <button
                                                onClick={() => setMetodoPago('tarjeta')}
                                                className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${metodoPago === 'tarjeta'
                                                        ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500'
                                                        : 'bg-white border-gray-200 hover:border-gray-300'
                                                    }`}
                                            >
                                                <CreditCard size={24} />
                                                <span className="font-medium text-sm">Tarjeta</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-600 mb-2">Total a Pagar</label>
                                        <div className="text-4xl font-bold text-gray-900 mb-4">
                                            ${parseFloat(pedidoSeleccionado.total).toFixed(2)}
                                        </div>

                                        {metodoPago === 'efectivo' && (
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs uppercase tracking-wide text-gray-500 font-bold mb-1">
                                                        Recibido
                                                    </label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                                                        <input
                                                            type="number"
                                                            value={montoRecibido}
                                                            onChange={(e) => setMontoRecibido(e.target.value)}
                                                            className="w-full pl-8 pr-4 py-3 text-xl font-medium border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                                            placeholder="0.00"
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>

                                                <div className="bg-white p-4 rounded-xl border border-gray-200 flex justify-between items-center">
                                                    <span className="font-medium text-gray-600">Cambio:</span>
                                                    <span className={`text-xl font-bold ${cambio < 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                        ${cambio.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <Button
                                    className="w-full h-14 text-lg mt-6 bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20"
                                    onClick={procesarCobro}
                                    disabled={cobrando || (metodoPago === 'efectivo' && cambio < 0)}
                                >
                                    {cobrando ? 'Procesando...' : (
                                        <span className="flex items-center gap-2">
                                            <Printer size={20} />
                                            Cobrar e Imprimir
                                        </span>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            ) : (
                <div className="hidden lg:flex flex-1 items-center justify-center bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200">
                    <div className="text-center text-gray-400">
                        <ShoppingCart size={64} className="mx-auto mb-4 opacity-20" />
                        <h3 className="text-xl font-semibold mb-2">Selecciona un pedido</h3>
                        <p>Elige un pedido de la lista para procesar el cobro</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CajaCobro;
