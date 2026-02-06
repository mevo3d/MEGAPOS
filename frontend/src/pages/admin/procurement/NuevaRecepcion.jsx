import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../utils/api';
import { useAuthStore } from '../../../../context/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { ArrowLeft, CheckCircle, PackageCheck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const NuevaRecepcion = ({ onCancel, onSuccess }) => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    // Estado principal
    const [ordenId, setOrdenId] = useState('');
    const [factura, setFactura] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [items, setItems] = useState([]);

    // Cargar Órdenes Pendientes (Emitidas o Parciales)
    const { data: ordenes = [] } = useQuery({
        queryKey: ['ordenes-pendientes'],
        queryFn: async () => {
            const { data } = await api.get('/compras');
            // Filtrar en frontend para asegurar (idealmente backend filter)
            return data.filter(o => ['emitida', 'recibida_parcial'].includes(o.estado));
        }
    });

    // Cargar detalles de la orden seleccionada
    const { refetch: cargarDetalles } = useQuery({
        queryKey: ['orden-detalles', ordenId],
        queryFn: async () => {
            if (!ordenId) return null;
            const { data } = await api.get(`/compras/${ordenId}`);
            // Transformar items para el formulario de recepción
            const preparedItems = data.items.map(item => ({
                producto_id: item.producto_id,
                nombre: item.producto_nombre || item.nombre, // Dependiendo del join en backend
                codigo: item.codigo,
                cantidad_solicitada: item.cantidad_solicitada,
                cantidad_pendiente: item.cantidad_solicitada - item.cantidad_recibida,
                cantidad_recibida: item.cantidad_solicitada - item.cantidad_recibida, // Por defecto recibir todo lo pendiente
                lote: '',
                fecha_caducidad: '',
                costo_nuevo: item.costo_unitario // Para posible actualización de costo
            }));
            setItems(preparedItems);
            return data;
        },
        enabled: false // Solo manual
    });

    const handleOrdenChange = (id) => {
        setOrdenId(id);
        if (id) setTimeout(() => cargarDetalles(), 100);
        else setItems([]);
    };

    const actualizarItem = (index, field, value) => {
        setItems(prev => prev.map((item, i) => {
            if (i === index) return { ...item, [field]: value };
            return item;
        }));
    };

    const recibirTodo = () => {
        setItems(prev => prev.map(item => ({
            ...item,
            cantidad_recibida: item.cantidad_pendiente
        })));
    };

    // Mutation para guardar
    const createMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                orden_compra_id: ordenId,
                sucursal_id: user.sucursal_id || 1,
                usuario_id: user.id,
                factura_proveedor: factura,
                observaciones,
                items: items.filter(i => i.cantidad_recibida > 0).map(i => ({
                    producto_id: i.producto_id,
                    cantidad_recibida: Number(i.cantidad_recibida),
                    lote: i.lote,
                    fecha_caducidad: i.fecha_caducidad,
                    costo_nuevo: Number(i.costo_nuevo)
                }))
            };
            return api.post('/recepciones', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['recepciones']);
            queryClient.invalidateQueries(['ordenes-compra']);
            queryClient.invalidateQueries(['productos']); // Por cambios de stock y costo
            toast.success('Mercancía recibida e inventario actualizado');
            onSuccess();
        },
        onError: (err) => {
            console.error(err);
            toast.error('Error al procesar la recepción');
        }
    });

    const handleSubmit = () => {
        if (!ordenId) return toast.error('Selecciona una orden de compra');
        if (!factura) return toast.error('Ingresa el folio de factura/remisión');

        const itemsRecibidos = items.filter(i => i.cantidad_recibida > 0);
        if (itemsRecibidos.length === 0) return toast.error('Ingresa al menos una cantidad recibida');

        createMutation.mutate();
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-4 border-b border-gray-200 pb-4">
                <Button variant="ghost" onClick={onCancel}>
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Volver
                </Button>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Recibir Mercancía</h2>
                    <p className="text-sm text-gray-500">Ingreso de productos al almacén vía Orden de Compra</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-wide text-gray-500">Detalles de la Recepción</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Orden de Compra *</label>
                                <select
                                    className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none"
                                    value={ordenId}
                                    onChange={(e) => handleOrdenChange(e.target.value)}
                                >
                                    <option value="">-- Seleccionar Orden Pendiente --</option>
                                    {ordenes.map(o => (
                                        <option key={o.id} value={o.id}>
                                            #{o.id} - {o.proveedor_nombre} (Total: ${Number(o.total_estimado).toFixed(2)})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Factura / Remisión *</label>
                                <Input
                                    value={factura}
                                    onChange={(e) => setFactura(e.target.value)}
                                    placeholder="Folio del documento físico"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                                <Input
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    placeholder="Estado de la mercancía, transportista, notas..."
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {items.length > 0 && (
                        <Card>
                            <CardHeader className="flex flex-row justify-between items-center bg-gray-50">
                                <CardTitle className="text-sm uppercase tracking-wide text-gray-500">Items a Recibir</CardTitle>
                                <Button variant="ghost" size="sm" onClick={recibirTodo} className="text-blue-600 hover:bg-blue-50">
                                    <CheckCircle size={14} className="mr-1" />
                                    Recibir Todo
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-100 text-gray-600 font-medium">
                                            <tr>
                                                <th className="p-3 text-left">Producto</th>
                                                <th className="p-3 w-24 text-center">Pendiente</th>
                                                <th className="p-3 w-28 text-center">A Recibir</th>
                                                <th className="p-3 w-28 text-center">Costo</th>
                                                <th className="p-3 w-32">Lote (Op)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {items.map((item, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    <td className="p-3">
                                                        <p className="font-medium text-gray-800">{item.nombre}</p>
                                                        <p className="text-xs text-gray-500">{item.codigo}</p>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">
                                                            {item.cantidad_pendiente}
                                                        </span>
                                                    </td>
                                                    <td className="p-3">
                                                        <Input
                                                            type="number"
                                                            className={`h-8 text-center ${item.cantidad_recibida > item.cantidad_pendiente ? 'border-red-300 bg-red-50' : ''}`}
                                                            value={item.cantidad_recibida}
                                                            onChange={(e) => actualizarItem(index, 'cantidad_recibida', parseInt(e.target.value) || 0)}
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            className="h-8 text-right bg-transparent"
                                                            value={item.costo_nuevo}
                                                            onChange={(e) => actualizarItem(index, 'costo_nuevo', parseFloat(e.target.value) || 0)}
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <Input
                                                            className="h-8 text-xs"
                                                            placeholder="Lote..."
                                                            value={item.lote}
                                                            onChange={(e) => actualizarItem(index, 'lote', e.target.value)}
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card className="bg-blue-50 border-blue-100 shadow-inner">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-800">
                                <PackageCheck size={20} />
                                Resumen
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-blue-700">
                                Al confirmar, el inventario se actualizará automáticamente y la Orden de Compra cambiará de estado según los items recibidos.
                            </p>

                            {items.some(i => i.cantidad_recibida > i.cantidad_pendiente) && (
                                <div className="bg-red-100 p-3 rounded-lg flex items-start gap-2 text-red-700 text-sm">
                                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                                    <p>Estás recibiendo más unidades de las solicitadas en algunos items. Esto agregará excedente al inventario.</p>
                                </div>
                            )}

                            <Button
                                className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg shadow-lg shadow-green-500/20 mt-4"
                                onClick={handleSubmit}
                                disabled={createMutation.isPending || items.length === 0}
                            >
                                {createMutation.isPending ? 'Procesando...' : 'Confirmar Recepción'}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default NuevaRecepcion;
