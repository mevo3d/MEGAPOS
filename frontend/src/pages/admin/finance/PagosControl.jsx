import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../utils/api';
import { useAuthStore } from '../../../../context/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { DollarSign, CheckCircle2, XCircle, AlertCircle, Clock, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const PagosControl = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [confirmNote, setConfirmNote] = useState('');

    // Fetch Pendientes
    const { data: pedidos = [], isLoading } = useQuery({
        queryKey: ['pagos-pendientes'],
        queryFn: async () => (await api.get('/pagos-b2b/pendientes')).data,
        refetchInterval: 15000
    });

    const confirmMutation = useMutation({
        mutationFn: async ({ id, notas }) => api.post(`/pagos-b2b/confirmar/${id}`, { usuario_id: user.id, notas }),
        onSuccess: () => {
            toast.success('Pago confirmado y pedido liberado');
            queryClient.invalidateQueries(['pagos-pendientes']);
            setSelectedOrder(null);
            setConfirmNote('');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Error al confirmar')
    });

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)] p-6">
            {/* Lista de Pendientes */}
            <div className="lg:col-span-1 border-r border-gray-100 pr-6 overflow-y-auto">
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <DollarSign className="text-blue-600" />
                    Validación de Pagos
                </h2>

                {isLoading ? (
                    <div className="text-center py-10">Cargando...</div>
                ) : pedidos.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
                        <CheckCircle2 size={48} className="mx-auto text-green-200 mb-2" />
                        <p className="text-gray-500 font-medium">Todo conciliado</p>
                        <p className="text-xs text-gray-400">No hay pagos pendientes de revisión</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pedidos.map(p => (
                            <div
                                key={p.id}
                                onClick={() => setSelectedOrder(p)}
                                className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedOrder?.id === p.id
                                        ? 'bg-blue-50 border-blue-500 shadow-md ring-1 ring-blue-500'
                                        : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-bold text-gray-800">#{p.id.toString().padStart(4, '0')}</span>
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${p.estado_pago === 'detectado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {p.estado_pago.toUpperCase()}
                                    </span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-sm text-gray-600 font-medium">{p.cliente_nombre}</p>
                                        <p className="text-xs text-gray-400 mt-1">{new Date(p.created_at).toLocaleDateString()}</p>
                                    </div>
                                    <p className="text-lg font-bold text-blue-600">${parseFloat(p.total).toFixed(2)}</p>
                                </div>
                                {p.estado_pago === 'detectado' && (
                                    <div className="mt-2 text-xs bg-green-50 text-green-700 p-2 rounded flex items-center gap-2">
                                        <CheckCircle2 size={12} />
                                        Sistema detectó coincidencia SPEI
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Panel de Detalle */}
            <div className="lg:col-span-2">
                {selectedOrder ? (
                    <Card className="h-full border-0 shadow-none bg-transparent">
                        <CardHeader className="bg-white rounded-t-xl border border-gray-200">
                            <CardTitle className="flex justify-between items-center">
                                <span>Revisión Financiera - Orden #{selectedOrder.id}</span>
                                <span className="text-2xl font-bold font-mono text-gray-800">${parseFloat(selectedOrder.total).toFixed(2)}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="bg-white border-x border-b border-gray-200 rounded-b-xl p-6 space-y-6">

                            {/* Datos Clave */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Cliente</p>
                                    <p className="font-medium text-lg text-gray-800">{selectedOrder.cliente_nombre}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-lg">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-1">Método Solicitado</p>
                                    <p className="font-medium text-lg text-gray-800 capitalize">{selectedOrder.metodo_pago || 'Transferencia'}</p>
                                </div>
                            </div>

                            {/* Evidencia / Match */}
                            <div className="border rounded-xl p-4 bg-blue-50 border-blue-100">
                                <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                                    <Search size={18} />
                                    Análisis del Sistema
                                </h4>
                                {selectedOrder.estado_pago === 'detectado' ? (
                                    <div className="text-sm text-blue-700 space-y-1">
                                        <p>✅ Se recibió una transferencia por el monto exacto.</p>
                                        <p>✅ La referencia interna coincide con el ID de orden.</p>
                                        <p className="mt-2 font-medium">Recomendación: APROBAR</p>
                                    </div>
                                ) : (
                                    <div className="text-sm text-yellow-700 space-y-1">
                                        <p>⚠️ No se ha detectado un pago automático vinculado.</p>
                                        <p>⚠️ Valida manualmente el comprobante en banca electrónica.</p>
                                    </div>
                                )}
                            </div>

                            {/* Acciones */}
                            <div className="pt-6 border-t space-y-4">
                                <label className="block text-sm font-medium text-gray-700">Notas de Auditoría</label>
                                <textarea
                                    className="w-full border rounded-lg p-3 h-24 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Ingresa referencia de autorización o motivo de rechazo..."
                                    value={confirmNote}
                                    onChange={(e) => setConfirmNote(e.target.value)}
                                />

                                <div className="flex gap-4 pt-2">
                                    <Button
                                        variant="outline"
                                        className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                                        onClick={() => toast.error('Funcionalidad de rechazo pendiente')}
                                    >
                                        <XCircle className="mr-2" />
                                        Rechazar Pago
                                    </Button>
                                    <Button
                                        className="flex-[2] bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20"
                                        onClick={() => confirmMutation.mutate({ id: selectedOrder.id, notas: confirmNote })}
                                        disabled={confirmMutation.isPending}
                                    >
                                        {confirmMutation.isPending ? 'Procesando...' : (
                                            <>
                                                <CheckCircle2 className="mr-2" />
                                                Confirmar y Liberar Mercancía
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                        <DollarSign size={64} className="mb-4 opacity-20" />
                        <h3 className="text-lg font-medium text-gray-500">Selecciona un pago para auditar</h3>
                        <p className="text-sm">Valida las transferencias antes de liberar la mercancía.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PagosControl;
