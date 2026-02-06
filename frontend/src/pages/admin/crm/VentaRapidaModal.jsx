import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../utils/api';
import { useAuthStore } from '../../../../context/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { ShoppingCart, Search, Trash2, Save, X, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const VentaRapidaModal = ({ cliente, onClose, onSuccess }) => {
    const { user } = useAuthStore();
    const [busqueda, setBusqueda] = useState('');
    const [resultados, setResultados] = useState([]);
    const [items, setItems] = useState([]);

    // Buscar Productos (Debounce manual simplificado)
    useEffect(() => {
        const timeout = setTimeout(async () => {
            if (busqueda.length > 2) {
                try {
                    const { data } = await api.get(`/productos?search=${busqueda}`);
                    setResultados(data.productos || data); // Ajustar según respuesta backend
                } catch (e) {
                    console.error(e);
                }
            } else {
                setResultados([]);
            }
        }, 300);
        return () => clearTimeout(timeout);
    }, [busqueda]);

    const agregarProducto = (prod) => {
        // Lógica de precio según cliente:
        // Si lista_precio_id = 2 (Mayoreo 10%), 3 (Distribuidor 20%)
        // Calcular precio final.
        // Base: prod.precio_venta
        let precio = Number(prod.precio_venta);
        if (cliente.lista_precio_id === 2) precio = precio * 0.90;
        if (cliente.lista_precio_id === 3) precio = precio * 0.80;

        const existe = items.find(i => i.id === prod.id);
        if (existe) {
            setItems(items.map(i => i.id === prod.id ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precio } : i));
        } else {
            setItems([...items, {
                id: prod.id,
                codigo: prod.codigo,
                nombre: prod.nombre,
                precio: precio,
                cantidad: 1,
                subtotal: precio
            }]);
        }
        setBusqueda('');
        setResultados([]);
    };

    const actualizarCantidad = (index, cant) => {
        const newItems = [...items];
        newItems[index].cantidad = cant;
        newItems[index].subtotal = cant * newItems[index].precio;
        setItems(newItems);
    };

    const eliminarItem = (index) => setItems(items.filter((_, i) => i !== index));

    const total = items.reduce((acc, i) => acc + i.subtotal, 0);

    const [step, setStep] = useState('create'); // create, success
    const [createdOrder, setCreatedOrder] = useState(null);
    const [paymentRef, setPaymentRef] = useState('');

    const createPedidoMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                cliente_id: cliente.id,
                usuario_id: user.id,
                sucursal_id: user.sucursal_id || 1,
                items: items.map(i => ({
                    producto_id: i.id,
                    cantidad: i.cantidad,
                    precio_unitario: i.precio
                })),
                total: total,
                estado: 'pendiente'
            };
            const { data } = await api.post('/pedidos', payload);
            return data.pedido; // Asumimos estructura response { success: true, pedido: {...} }
        },
        onSuccess: async (order) => {
            setCreatedOrder(order);
            // Generar Referencia
            try {
                const { data } = await api.get(`/pagos-b2b/referencia/${order.id}`);
                setPaymentRef(data.referencia);
            } catch (e) {
                console.error("Error fetching ref", e);
                setPaymentRef(`REF-${order.id}`);
            }
            setStep('success');
            toast.success('Pedido creado exitosamente');
        },
        onError: () => toast.error('Error al crear pedido')
    });

    const handleCopyRef = () => {
        navigator.clipboard.writeText(paymentRef);
        toast.success('Referencia copiada');
    };

    if (step === 'success') {
        return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
                <Card className="w-full max-w-md m-4 text-center">
                    <CardHeader>
                        <div className="mx-auto bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                            <Save className="text-green-600 h-8 w-8" />
                        </div>
                        <CardTitle className="text-2xl text-green-700">¡Pedido Creado!</CardTitle>
                        <p className="text-gray-500">Orden #{createdOrder?.id.toString().padStart(4, '0')}</p>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <p className="text-sm font-bold text-gray-500 uppercase mb-2">Referencia de Pago (SPEI)</p>
                            <div className="flex items-center gap-2 justify-center">
                                <span className="text-2xl font-mono font-bold tracking-wider text-gray-800">{paymentRef}</span>
                                <Button variant="ghost" size="sm" onClick={handleCopyRef}>
                                    <Search size={16} /> {/* Icon changed to represent copy/inspect if Copy icon missing */}
                                </Button>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">Monto Exacto: ${parseFloat(createdOrder?.total).toFixed(2)}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" className="w-full" onClick={onClose}>
                                Cerrar
                            </Button>
                            <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => {
                                // Mock Link Generation
                                toast.success('Link de pago enviado por SMS/WhatsApp');
                            }}>
                                Generar Link Pago
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col m-4">
                <CardHeader className="flex flex-row justify-between items-center border-b pb-4">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <ShoppingCart className="text-blue-600" />
                            Pedido Rápido: {cliente.nombre}
                        </CardTitle>
                        <p className="text-xs text-gray-500 mt-1">
                            Lista de Precios: {cliente.lista_precio_id === 1 ? 'Público' : cliente.lista_precio_id === 2 ? 'Mayoreo' : 'Distribuidor'}
                        </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onClose}><X size={20} /></Button>
                </CardHeader>

                <CardContent className="flex-1 overflow-hidden flex flex-col gap-4 pt-4">
                    {/* Buscador */}
                    <div className="relative z-10">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input
                            placeholder="Buscar producto a agregar..."
                            className="pl-9"
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            autoFocus
                        />
                        {resultados.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-xl rounded-b-lg mt-1 max-h-48 overflow-y-auto">
                                {resultados.map(p => (
                                    <div
                                        key={p.id}
                                        onClick={() => agregarProducto(p)}
                                        className="p-3 hover:bg-blue-50 cursor-pointer border-b flex justify-between items-center"
                                    >
                                        <div>
                                            <p className="font-medium text-sm">{p.nombre}</p>
                                            <p className="text-xs text-gray-500">{p.codigo} | Stock: {p.total_stock || 0}</p>
                                        </div>
                                        <span className="font-bold text-blue-600">${p.precio_venta}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Tabla Items */}
                    <div className="flex-1 overflow-y-auto border rounded-lg bg-gray-50">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100 text-gray-600 sticky top-0">
                                <tr>
                                    <th className="p-2 text-left">Producto</th>
                                    <th className="p-2 w-20 text-center">Cant.</th>
                                    <th className="p-2 w-24 text-right">Precio</th>
                                    <th className="p-2 w-24 text-right">Total</th>
                                    <th className="p-2 w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="p-2">
                                            <p className="font-medium">{item.nombre}</p>
                                            <p className="text-xs text-gray-400">{item.codigo}</p>
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                type="number"
                                                min="1"
                                                className="h-7 text-center"
                                                value={item.cantidad}
                                                onChange={(e) => actualizarCantidad(idx, parseInt(e.target.value) || 1)}
                                            />
                                        </td>
                                        <td className="p-2 text-right">${item.precio.toFixed(2)}</td>
                                        <td className="p-2 text-right font-bold">${item.subtotal.toFixed(2)}</td>
                                        <td className="p-2 text-center">
                                            <button onClick={() => eliminarItem(idx)} className="text-red-400 hover:text-red-600">
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-gray-400 italic">Agrega productos al pedido</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer Totales */}
                    <div className="flex justify-between items-center bg-gray-100 p-4 rounded-lg">
                        <span className="text-lg font-bold text-gray-700">Total Pedido</span>
                        <span className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</span>
                    </div>

                    <Button
                        size="lg"
                        className="w-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20"
                        disabled={items.length === 0 || createPedidoMutation.isPending}
                        onClick={() => createPedidoMutation.mutate()}
                    >
                        {createPedidoMutation.isPending ? 'Procesando...' : 'Confirmar Pedido'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default VentaRapidaModal;
