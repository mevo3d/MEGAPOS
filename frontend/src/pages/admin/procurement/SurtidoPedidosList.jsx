import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../utils/api';
import { useAuthStore } from '../../../../context/authStore';
import { Button } from '../../../../components/ui/Button';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const SurtidoPedidosList = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();

    // Fetch Orders specific for Logistics (Confirmed Payment, Preparing Status)
    const { data: pedidos = [], isLoading } = useQuery({
        queryKey: ['pedidos-surtido', user?.sucursal_id],
        queryFn: async () => {
            // Fetch Preparing orders that are Confirmed Paid
            const res = await api.get(`/pedidos/sucursal/${user?.sucursal_id || 1}?estado=preparando&estado_pago=confirmado`);
            return res.data;
        },
        refetchInterval: 10000
    });

    const surtirMutation = useMutation({
        mutationFn: async (id) => api.post(`/pedidos/${id}/enviar-caja`), // Reusing 'enivar-caja' as 'Ready for Dispatch' signal
        onSuccess: () => {
            toast.success('Pedido marcado como surtido y enviado a despacho');
            queryClient.invalidateQueries(['pedidos-surtido']);
        },
        onError: () => toast.error('Error al actualizar pedido')
    });

    if (isLoading) return <div className="p-8 text-center text-gray-500">Cargando pedidos para surtido...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Package className="text-blue-600" />
                    Surtido de Mercancía
                </h3>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium border border-green-200">
                    Mostrando solo pedidos PAGADOS
                </span>
            </div>

            {pedidos.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <CheckCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                    <h3 className="text-lg font-medium text-gray-500">No hay pedidos pendientes de surtido</h3>
                    <p className="text-sm text-gray-400">Espera a que Contabilidad confirme nuevos pagos.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {pedidos.map((pedido) => (
                        <div key={pedido.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="font-bold text-lg text-gray-900">Orden #{pedido.id.toString().padStart(4, '0')}</span>
                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold uppercase">
                                        Pago Confirmado
                                    </span>
                                </div>
                                <p className="text-gray-600 font-medium mb-1">{pedido.cliente_nombre}</p>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <Clock size={14} /> {new Date(pedido.created_at).toLocaleString()}
                                    </span>
                                    <span>•</span>
                                    <span>Vendedor: {pedido.empleado_nombre || 'N/A'}</span>
                                </div>
                                {pedido.notas && (
                                    <div className="mt-3 bg-yellow-50 p-3 rounded-lg text-sm text-yellow-800 border border-yellow-100">
                                        <strong>Nota:</strong> {pedido.notas}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col items-end justify-center gap-3 min-w-[200px]">
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">Valor Declarado</p>
                                    <p className="text-2xl font-bold text-gray-900">${parseFloat(pedido.total).toFixed(2)}</p>
                                </div>
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20"
                                    onClick={() => surtirMutation.mutate(pedido.id)}
                                    disabled={surtirMutation.isPending}
                                >
                                    <Truck className="mr-2 h-4 w-4" />
                                    {surtirMutation.isPending ? 'Procesando...' : 'Completar Surtido'}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default SurtidoPedidosList;
