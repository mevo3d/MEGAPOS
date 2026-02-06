import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../utils/api';
import { useAuthStore } from '../../../../context/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Search, Trash2, Save, Send, ArrowLeft, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

const NuevaOrdenCompra = ({ onCancel, onSuccess }) => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    // Estados del Encabezado
    const [proveedorId, setProveedorId] = useState('');
    const [observaciones, setObservaciones] = useState('');
    const [sucursalDestinoId, setSucursalDestinoId] = useState(user?.sucursal_id || 1);

    // Estados de Items
    const [items, setItems] = useState([]);

    // Estado de Búsqueda de Productos
    const [busqueda, setBusqueda] = useState('');
    const [resultadosBusqueda, setResultadosBusqueda] = useState([]);

    // Cargar Proveedores
    const { data: proveedores = [] } = useQuery({
        queryKey: ['proveedores'],
        queryFn: async () => (await api.get('/proveedores')).data
    });

    // Cargar Sucursales (para elegir destino si es necesario, por ahora hardcode o current)
    // const { data: sucursales } = ...

    // Buscar Productos (Debounce)
    useEffect(() => {
        const timeoutId = setTimeout(async () => {
            if (busqueda.length > 2) {
                try {
                    const { data } = await api.get(`/productos?search=${busqueda}`);
                    setResultadosBusqueda(data);
                } catch (error) {
                    console.error('Error buscando productos', error);
                }
            } else {
                setResultadosBusqueda([]);
            }
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [busqueda]);

    const agregarProducto = (producto) => {
        // Verificar si ya existe
        const existe = items.find(i => i.producto_id === producto.id);
        if (existe) {
            toast('El producto ya está en la lista', { icon: '⚠️' });
            return;
        }

        setItems(prev => [...prev, {
            producto_id: producto.id,
            nombre: producto.nombre,
            codigo: producto.codigo,
            cantidad: 1,
            costo_unitario: producto.precio_compra || 0, // Fallback si no tiene costo definido
            subtotal: producto.precio_compra || 0
        }]);
        setBusqueda('');
        setResultadosBusqueda([]);
    };

    const actualizarItem = (index, field, value) => {
        setItems(prev => prev.map((item, i) => {
            if (i === index) {
                const updated = { ...item, [field]: value };
                // Recalcular subtotal si cambia cantidad o costo
                if (field === 'cantidad') updated.subtotal = value * updated.costo_unitario;
                if (field === 'costo_unitario') updated.subtotal = updated.cantidad * value;
                return updated;
            }
            return item;
        }));
    };

    const eliminarItem = (index) => {
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const totalEstimado = items.reduce((sum, item) => sum + Number(item.subtotal), 0);

    // Guardar Orden
    const createMutation = useMutation({
        mutationFn: async (estado) => {
            const payload = {
                proveedor_id: proveedorId,
                sucursal_destino_id: sucursalDestinoId,
                usuario_id: user.id,
                observaciones,
                items: items.map(i => ({
                    producto_id: i.producto_id,
                    cantidad: Number(i.cantidad),
                    costo_unitario: Number(i.costo_unitario)
                })),
                estado // 'borrador' o 'emitida'
                // Nota: El backend actualmente setea 'borrador' por defecto en createOrden. 
                // Si queremos emitir directo, deberíamos llamar a 'emitir' después o modificar backend.
                // Por simplicidad, guardamos y si es 'emitida', llamamos al endpoint extra.
            };

            const { data } = await api.post('/compras', payload);

            if (estado === 'emitida') {
                await api.put(`/compras/${data.orden.id}/emitir`);
            }
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['ordenes-compra']);
            toast.success('Orden de compra guardada');
            onSuccess();
        },
        onError: (err) => {
            console.error(err);
            toast.error('Error al guardar la orden');
        }
    });

    const handleSave = (estado = 'borrador') => {
        if (!proveedorId) return toast.error('Selecciona un proveedor');
        if (items.length === 0) return toast.error('Agrega al menos un producto');
        createMutation.mutate(estado);
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <div className="flex items-center gap-4 border-b border-gray-200 pb-4">
                <Button variant="ghost" onClick={onCancel}>
                    <ArrowLeft className="h-5 w-5 mr-2" />
                    Volver
                </Button>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Nueva Orden de Compra</h2>
                    <p className="text-sm text-gray-500">Generar requerimiento a proveedor</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Panel Izquierdo: Datos Generales y Búsqueda */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Selección de Proveedor */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-wide text-gray-500">Datos del Proveedor</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
                                <select
                                    className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={proveedorId}
                                    onChange={(e) => setProveedorId(e.target.value)}
                                >
                                    <option value="">-- Seleccionar Proveedor --</option>
                                    {proveedores.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                                <Input
                                    value={observaciones}
                                    onChange={(e) => setObservaciones(e.target.value)}
                                    placeholder="Notas internas o instrucciones de entrega..."
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Búsqueda de Productos */}
                    <Card className="overflow-visible z-10">
                        <CardHeader>
                            <CardTitle className="text-sm uppercase tracking-wide text-gray-500">Agregar Productos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                                <Input
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    placeholder="Buscar por código o nombre..."
                                    className="pl-10"
                                />
                                {/* Dropdown de Resultados */}
                                {resultadosBusqueda.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 shadow-xl rounded-b-xl mt-1 max-h-60 overflow-y-auto z-50">
                                        {resultadosBusqueda.map(prod => (
                                            <div
                                                key={prod.id}
                                                onClick={() => agregarProducto(prod)}
                                                className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 flex justify-between items-center"
                                            >
                                                <div>
                                                    <p className="font-medium text-gray-800">{prod.nombre}</p>
                                                    <p className="text-xs text-gray-500">{prod.codigo}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-gray-500">Último Costo</p>
                                                    <p className="font-bold text-gray-700">${prod.precio_compra || '0.00'}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Lista de Items Agregados */}
                    <Card>
                        <CardContent className="p-0">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-600 font-medium">
                                    <tr>
                                        <th className="p-3 text-left">Producto</th>
                                        <th className="p-3 w-24">Cantidad</th>
                                        <th className="p-3 w-32">Costo U.</th>
                                        <th className="p-3 w-24 text-right">Subtotal</th>
                                        <th className="p-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.map((item, index) => (
                                        <tr key={`${item.producto_id}-${index}`} className="group hover:bg-gray-50">
                                            <td className="p-3">
                                                <p className="font-medium text-gray-800">{item.nombre}</p>
                                            </td>
                                            <td className="p-3">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={item.cantidad}
                                                    onChange={(e) => actualizarItem(index, 'cantidad', parseInt(e.target.value) || 0)}
                                                    className="h-8 text-center"
                                                />
                                            </td>
                                            <td className="p-3">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={item.costo_unitario}
                                                    onChange={(e) => actualizarItem(index, 'costo_unitario', parseFloat(e.target.value) || 0)}
                                                    className="h-8 text-right bg-transparent focus:bg-white"
                                                />
                                            </td>
                                            <td className="p-3 text-right font-medium">
                                                ${item.subtotal.toFixed(2)}
                                            </td>
                                            <td className="p-3 text-center">
                                                <button onClick={() => eliminarItem(index)} className="text-gray-400 hover:text-red-500">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {items.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-gray-400">
                                                Agrega productos para comenzar la orden.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </CardContent>
                    </Card>
                </div>

                {/* Panel Derecho: Resumen y Acciones */}
                <div className="space-y-6">
                    <Card className="bg-gray-50 border-gray-200 shadow-inner">
                        <CardHeader>
                            <CardTitle>Resumen de Orden</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between items-center text-gray-600">
                                <span>Items Totales</span>
                                <span className="font-medium">{items.reduce((acc, i) => acc + i.cantidad, 0)}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-600">
                                <span>Líneas</span>
                                <span className="font-medium">{items.length}</span>
                            </div>
                            <div className="border-t border-gray-200 pt-4 mt-4">
                                <div className="flex justify-between items-end">
                                    <span className="text-lg font-bold text-gray-800">Total Estimado</span>
                                    <span className="text-2xl font-bold text-blue-600">${totalEstimado.toFixed(2)}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 text-right">Impuestos incluidos según configuración</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-3">
                        <Button
                            variant="outline"
                            className="w-full bg-white hover:bg-gray-50"
                            onClick={() => handleSave('borrador')}
                            disabled={createMutation.isPending}
                        >
                            {createMutation.isPending ? 'Guardando...' : 'Guardar Borrador'}
                        </Button>
                        <Button
                            className="w-full bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20"
                            onClick={() => handleSave('emitida')}
                            disabled={createMutation.isPending}
                        >
                            <Send size={18} className="mr-2" />
                            Emitir Orden
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NuevaOrdenCompra;
