import React, { useEffect, useState } from 'react';
import api from '../../utils/api';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Package, ArrowLeftRight, CheckCircle2, Clock, AlertCircle, ChevronRight, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';

export const RecepcionTraspasos = ({ sucursalId }) => {
    const [traspasos, setTraspasos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTraspaso, setSelectedTraspaso] = useState(null);
    const [confirming, setConfirming] = useState(false);

    const fetchTraspasos = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/traspasos?sucursal_id=${sucursalId}&estado=en_transito`);
            setTraspasos(res.data);
        } catch (error) {
            console.error('Error fetching traspasos:', error);
            toast.error('Error al cargar traspasos pendientes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (sucursalId) fetchTraspasos();
    }, [sucursalId]);

    const handleRecibir = async (id) => {
        try {
            setConfirming(true);
            await api.post(`/traspasos/${id}/recibir`);
            toast.success('Inventario recibido y stock actualizado');
            setSelectedTraspaso(null);
            fetchTraspasos();
        } catch (error) {
            console.error('Error recibiendo traspaso:', error);
            toast.error(error.response?.data?.message || 'Error al procesar recepción');
        } finally {
            setConfirming(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500">Buscando envíos en tránsito...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {!selectedTraspaso ? (
                <div className="grid grid-cols-1 gap-4">
                    {traspasos.length === 0 ? (
                        <Card className="border-dashed border-2 bg-gray-50/50">
                            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                                <BoxIcon className="h-16 w-16 text-gray-300 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900">No hay envíos pendientes</h3>
                                <p className="text-gray-500 max-w-xs mx-auto">
                                    No tienes transferencias de inventario en camino a esta sucursal en este momento.
                                </p>
                            </CardContent>
                        </Card>
                    ) : (
                        traspasos.map((traspaso) => (
                            <Card key={traspaso.id} className="hover-lift cursor-pointer border-0 shadow-md overflow-hidden group" onClick={() => setSelectedTraspaso(traspaso)}>
                                <div className="flex items-stretch">
                                    <div className="bg-blue-600 w-2 group-hover:bg-purple-600 transition-colors"></div>
                                    <div className="flex-1 p-5 flex items-center justify-between bg-white">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                                                <ArrowLeftRight className="h-6 w-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-bold text-gray-900">Envío #{traspaso.id}</span>
                                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                                        En Tránsito
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500">
                                                    Desde: <span className="font-semibold text-gray-700">{traspaso.origen_nombre}</span> •
                                                    {traspaso.total_items} productos
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    Enviado el {new Date(traspaso.fecha_creacion).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="flex items-center justify-between mb-2">
                        <Button variant="outline" onClick={() => setSelectedTraspaso(null)} className="flex items-center gap-2">
                            <ArrowLeftRight className="h-4 w-4 rotate-180" />
                            Volver a la lista
                        </Button>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Info className="h-4 w-4" />
                            Verifica que los productos físicos coincidan con la lista
                        </div>
                    </div>

                    <Card className="border-0 shadow-xl overflow-hidden">
                        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white pb-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-2xl font-bold flex items-center gap-2 mb-2">
                                        <Package className="h-6 w-6" />
                                        Detalle de Envío #{selectedTraspaso.id}
                                    </CardTitle>
                                    <div className="flex flex-wrap gap-4 text-blue-100 text-sm">
                                        <span className="flex items-center gap-1.5 bg-blue-500/30 px-3 py-1 rounded-full border border-blue-400/30">
                                            Origen: {selectedTraspaso.origen_nombre}
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-blue-500/30 px-3 py-1 rounded-full border border-blue-400/30">
                                            Enviado: {new Date(selectedTraspaso.fecha_creacion).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm opacity-80 mb-1">Total Unidades</div>
                                    <div className="text-3xl font-bold">
                                        {selectedTraspaso.items?.reduce((acc, curr) => acc + curr.cantidad_enviada, 0)}
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-gray-600 text-xs uppercase font-bold">
                                        <tr>
                                            <th className="px-6 py-4">Producto / SKU</th>
                                            <th className="px-6 py-4 text-center">Cant. Enviada</th>
                                            <th className="px-6 py-4 text-center text-blue-600">Confirmación</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {selectedTraspaso.items?.map((item) => (
                                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-900">{item.producto_nombre}</div>
                                                    <div className="text-xs text-gray-500 font-mono tracking-wider">{item.sku}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-lg font-bold text-gray-700">{item.cantidad_enviada}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex justify-center">
                                                        <div className="w-10 h-10 rounded-full bg-green-50 border border-green-100 flex items-center justify-center text-green-600 shadow-inner">
                                                            <CheckCircle2 className="h-6 w-6" />
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {selectedTraspaso.observaciones && (
                                <div className="p-6 bg-amber-50 border-t border-amber-100 text-amber-800 text-sm italic">
                                    <strong>Notas de origen:</strong> {selectedTraspaso.observaciones}
                                </div>
                            )}

                            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-4">
                                <Button variant="outline" onClick={() => setSelectedTraspaso(null)}>
                                    Cancelar
                                </Button>
                                <Button
                                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-6 rounded-xl shadow-lg shadow-green-600/30 flex items-center gap-3 transition-all transform hover:scale-105"
                                    onClick={() => handleRecibir(selectedTraspaso.id)}
                                    disabled={confirming}
                                >
                                    {confirming ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    ) : (
                                        <CheckCircle2 className="h-6 w-6" />
                                    )}
                                    <span className="text-lg font-bold uppercase tracking-wide">Confirmar Recepción</span>
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3 text-blue-800 text-sm">
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                        <p>
                            Al confirmar la recepción, el inventario de esta sucursal se actualizará automáticamente con las cantidades indicadas arriba. Esta acción no se puede deshacer.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

const BoxIcon = ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
);
