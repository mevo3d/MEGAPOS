import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../utils/api';
import { useAuthStore } from '../../../../context/authStore';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { PhoneCall, Calendar, CheckCircle, Clock, XCircle, User, MessageSquare, ShoppingCart } from 'lucide-react';
import toast from 'react-hot-toast';
import VentaRapidaModal from './VentaRapidaModal';

const Telemarketing = () => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [selectedTask, setSelectedTask] = useState(null);
    const [callNote, setCallNote] = useState('');
    const [showVentaModal, setShowVentaModal] = useState(false);

    // New Task State (Follow up)
    const [showSchedule, setShowSchedule] = useState(false);
    const [nextDate, setNextDate] = useState('');
    const [nextNote, setNextNote] = useState('');

    // Fetch Pending Tasks
    const { data: tareas = [] } = useQuery({
        queryKey: ['crm-tareas', user?.id],
        queryFn: async () => (await api.get(`/clientes/tareas?usuario_id=${user?.id}`)).data,
        enabled: !!user?.id
    });

    const completeMutation = useMutation({
        mutationFn: async ({ taskId, note, result }) => {
            // 1. Complete Task
            await api.put(`/clientes/tareas/${taskId}/completar`);
            // 2. Add History Note
            await api.post(`/clientes/${selectedTask.cliente_id}/notas`, {
                usuario_id: user.id,
                nota: `Llamada ${result}: ${note}`,
                tipo_accion: 'llamada',
                es_tarea: false
            });
            // 3. If Scheduled New Task
            if (showSchedule && nextDate) {
                await api.post(`/clientes/${selectedTask.cliente_id}/notas`, {
                    usuario_id: user.id,
                    nota: `Seguimiento: ${nextNote}`,
                    tipo_accion: 'nota',
                    fecha_proximo_contacto: nextDate,
                    es_tarea: true
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['crm-tareas']);
            toast.success('Llamada registrada');
            setSelectedTask(null);
            setCallNote('');
            setShowSchedule(false);
            setNextDate('');
        },
        onError: () => toast.error('Error al registrar llamada')
    });

    const handleResult = (result) => {
        if (!callNote && result !== 'Sin Respuesta') return toast.error('Ingresa una nota sobre la llamada');
        completeMutation.mutate({
            taskId: selectedTask.id,
            note: callNote || 'Sin respuesta',
            result
        });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
            {/* Lista de Tareas (Izquierda) */}
            <div className="lg:col-span-1 border-r border-gray-100 pr-4 overflow-y-auto">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <Clock size={20} className="text-blue-600" />
                    Llamadas Pendientes ({tareas.length})
                </h3>
                <div className="space-y-3">
                    {tareas.map(tarea => (
                        <div
                            key={tarea.id}
                            onClick={() => setSelectedTask(tarea)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedTask?.id === tarea.id
                                ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300'
                                : 'bg-white border-gray-100 hover:bg-gray-50'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-gray-800">{tarea.cliente_nombre}</h4>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${new Date(tarea.fecha_proximo_contacto) < new Date() ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                                    }`}>
                                    {new Date(tarea.fecha_proximo_contacto).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2">{tarea.nota}</p>
                            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                                <PhoneCall size={12} /> {tarea.cliente_telefono || "Sin Tel"}
                            </p>
                        </div>
                    ))}
                    {tareas.length === 0 && (
                        <div className="text-center py-10 text-gray-400">
                            <CheckCircle size={48} className="mx-auto mb-2 opacity-30" />
                            <p>¡Todo al día!</p>
                            <p className="text-sm">No tienes llamadas programadas.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Panel de Acción (Derecha) */}
            <div className="lg:col-span-2 pl-4">
                {selectedTask ? (
                    <Card className="h-full flex flex-col">
                        <CardHeader className="bg-gray-50 border-b border-gray-100">
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-gray-500 uppercase tracking-wide">Gestionando Cliente</p>
                                    <CardTitle className="text-2xl">{selectedTask.cliente_nombre}</CardTitle>
                                </div>
                                <div className="flex items-center gap-4">
                                    <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 shadow-md" onClick={() => setShowVentaModal(true)}>
                                        <ShoppingCart size={16} className="mr-2" />
                                        Pedido Rápido
                                    </Button>
                                    <div className="text-right">
                                        <p className="text-3xl font-bold text-blue-600">${selectedTask.saldo_actual || 0}</p>
                                        <p className="text-xs text-gray-500">Saldo Actual</p>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col gap-6 pt-6">
                            {/* Info de la Tarea Original */}
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 text-sm text-yellow-800">
                                <span className="font-bold block mb-1">Motivo de llamada:</span>
                                {selectedTask.nota}
                            </div>

                            {/* Registro de Actividad */}
                            <div className="space-y-3 flex-1">
                                <label className="font-medium text-gray-700 flex items-center gap-2">
                                    <MessageSquare size={18} />
                                    Resultado de la Llamada
                                </label>
                                <textarea
                                    className="w-full h-32 p-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="Escribe el resumen de la conversación..."
                                    value={callNote}
                                    onChange={(e) => setCallNote(e.target.value)}
                                />

                                {/* Agendar Siguiente (Toggle) */}
                                <div className="flex items-center gap-2 mt-4">
                                    <input
                                        type="checkbox"
                                        id="schedule"
                                        checked={showSchedule}
                                        onChange={(e) => setShowSchedule(e.target.checked)}
                                        className="w-4 h-4 text-blue-600 rounded"
                                    />
                                    <label htmlFor="schedule" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
                                        Agendar siguiente seguimiento
                                    </label>
                                </div>

                                {showSchedule && (
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in slide-in-from-top duration-200">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha</label>
                                            <Input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nota Recordatorio</label>
                                            <Input placeholder="Ej: Volver a llamar para cerrar venta" value={nextNote} onChange={(e) => setNextNote(e.target.value)} />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Botones de Acción */}
                            <div className="grid grid-cols-3 gap-3 border-t pt-6">
                                <Button variant="outline" className="border-red-200 hover:bg-red-50 text-red-600" onClick={() => handleResult('Sin Respuesta')}>
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Sin Respuesta
                                </Button>
                                <Button variant="outline" className="border-yellow-200 hover:bg-yellow-50 text-yellow-700" onClick={() => handleResult('Negociación')}>
                                    <Clock className="mr-2 h-4 w-4" />
                                    En Negociación
                                </Button>
                                <Button className="bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20" onClick={() => handleResult('Exitoso')}>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Éxito / Venta
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                        <User size={64} className="mb-4 opacity-30" />
                        <h3 className="text-xl font-medium text-gray-500">Selecciona un cliente</h3>
                        <p>Elige una tarea de la lista para comenzar a gestionar.</p>
                    </div>
                )}
            </div>

            {/* Modal de Venta Rápida */}
            {showVentaModal && selectedTask && (
                <VentaRapidaModal
                    cliente={{
                        id: selectedTask.cliente_id,
                        nombre: selectedTask.cliente_nombre,
                        lista_precio_id: 1 // TODO: Fetch full client info or include list_id in getTareas
                    }}
                    onClose={() => setShowVentaModal(false)}
                    onSuccess={() => {
                        handleResult('Venta Realizada');
                        setShowVentaModal(false);
                    }}
                />
            )}
        </div>
    );
};

export default Telemarketing;
