import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckSquare, Search, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Loading } from '../../components/ui/Loading';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

export default function RecepcionMercancia() {
    const navigate = useNavigate();
    const [ordenes, setOrdenes] = useState([]);
    const [selectedOrden, setSelectedOrden] = useState(null);
    const [detalle, setDetalle] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch pendientes
    useEffect(() => {
        fetchOrdenes();
    }, []);

    const fetchOrdenes = async () => {
        try {
            const res = await api.get('/cedis/ordenes-pendientes');
            setOrdenes(res.data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const handleSelectOrden = async (orden) => {
        setLoading(true);
        try {
            const res = await api.get(`/cedis/ordenes/${orden.id}/detalle`);
            setSelectedOrden(orden);
            // Initialize reception state (default to expected quantity)
            setDetalle(res.data.map(d => ({
                ...d,
                cantidad_recibida: d.cantidad_solicitada, // Default complete
                ubicacion_id: '', // Optional location
                estado_producto: 'bueno'
            })));
        } catch (error) {
            toast.error('Error cargando detalle');
        } finally {
            setLoading(false);
        }
    };

    const updateCantidad = (id, val) => {
        setDetalle(detalle.map(d => d.id === id ? { ...d, cantidad_recibida: parseInt(val) || 0 } : d));
    };

    const handleSubmit = async () => {
        if (!selectedOrden) return;

        const payload = {
            orden_compra_id: selectedOrden.id,
            proveedor_id: selectedOrden.proveedor_id,
            notas: 'Recepción desde Panel CEDIS',
            items: detalle.map(d => ({
                producto_id: d.producto_id,
                cantidad_recibida: d.cantidad_recibida,
                cantidad_esperada: d.cantidad_solicitada
            }))
        };

        try {
            await api.post('/cedis/recepcion', payload);
            toast.success('Recepción registrada correctamente');
            setSelectedOrden(null);
            fetchOrdenes();
        } catch (error) {
            toast.error('Error al registrar recepción');
        }
    };

    if (loading) return <Loading />;

    if (selectedOrden) {
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedOrden(null)} className="p-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold">Recibiendo Orden #{selectedOrden.id}</h1>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Cotejo de Mercancía - {selectedOrden.proveedor_nombre}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b text-gray-500 text-sm">
                                        <th className="p-3">Producto</th>
                                        <th className="p-3">SKU</th>
                                        <th className="p-3 text-center">Solicitado</th>
                                        <th className="p-3 text-center">Recibido</th>
                                        <th className="p-3">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {detalle.map(item => (
                                        <tr key={item.id} className="hover:bg-gray-50">
                                            <td className="p-3">{item.producto_nombre}</td>
                                            <td className="p-3 text-sm font-mono text-gray-500">{item.sku}</td>
                                            <td className="p-3 text-center font-bold">{item.cantidad_solicitada}</td>
                                            <td className="p-3 text-center">
                                                <input
                                                    type="number"
                                                    className={`w-20 border rounded p-1 text-center ${item.cantidad_recibida !== item.cantidad_solicitada ? 'bg-yellow-50 border-yellow-300' : ''}`}
                                                    value={item.cantidad_recibida}
                                                    onChange={(e) => updateCantidad(item.id, e.target.value)}
                                                />
                                            </td>
                                            <td className="p-3">
                                                {item.cantidad_recibida === item.cantidad_solicitada ? (
                                                    <span className="text-green-600 flex items-center gap-1"><CheckSquare className="w-4 h-4" /> Completo</span>
                                                ) : (
                                                    <span className="text-orange-500 font-medium">Parcial / Extra</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setSelectedOrden(null)}>Cancelar</Button>
                            <Button onClick={handleSubmit}>Confirmar Entrada</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <ClipboardCheck className="w-8 h-8 text-blue-600" />
                Recepción de Mercancía
            </h1>

            <div className="grid gap-4">
                {ordenes.length === 0 ? (
                    <Card className="p-8 text-center text-gray-500">
                        <p>No hay órdenes de compra pendientes por recibir.</p>
                    </Card>
                ) : (
                    ordenes.map(orden => (
                        <Card key={orden.id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleSelectOrden(orden)}>
                            <div className="p-4 flex justify-between items-center">
                                <div>
                                    <h3 className="font-bold text-lg">Orden #{orden.id}</h3>
                                    <p className="text-gray-600">{orden.proveedor_nombre}</p>
                                    <p className="text-sm text-gray-400">{new Date(orden.fecha_emision).toLocaleDateString()}</p>
                                </div>
                                <div className="text-right">
                                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                        Pendiente
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
