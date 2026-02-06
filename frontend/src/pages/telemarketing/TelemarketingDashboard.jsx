import React, { useState, useEffect } from 'react';
import { Phone, Calendar, Clock, User, CheckCircle, XCircle, MessageSquare, BarChart2, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';

export default function TelemarketingDashboard() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ tareas: [], clientes: [], historial: [] });
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [showCallForm, setShowCallForm] = useState(false);

    // Call Form
    const [callResult, setCallResult] = useState('contesto');
    const [callNotes, setCallNotes] = useState('');
    const [nextCallDate, setNextCallDate] = useState('');
    const [clientHistory, setClientHistory] = useState([]);
    const [activeTab, setActiveTab] = useState('llamada'); // 'llamada' | 'compras'

    useEffect(() => {
        fetchDashboard();
    }, []);

    const fetchDashboard = async () => {
        try {
            const res = await api.get('/telemarketing/dashboard');
            setData(res.data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const handleSelectCliente = async (cliente) => {
        setSelectedCliente(cliente);
        setShowCallForm(true);
        setActiveTab('llamada');
        // Fetch history
        try {
            const res = await api.get(`/ventas/cliente/${cliente.id}/historial`);
            setClientHistory(res.data);
        } catch (error) {
            console.error('Error fetching client sales history', error);
        }
    };

    const handleSubmitCall = async (e) => {
        e.preventDefault();
        try {
            await api.post('/telemarketing/llamadas', {
                cliente_id: selectedCliente.id,
                resultado: callResult,
                notas: callNotes,
                duracion: 0, // Podríamos implementar un timer real
                proxima_llamada: nextCallDate || null
            });
            toast.success('Llamada registrada');
            setShowCallForm(false);
            setCallNotes('');
            setNextCallDate('');
            fetchDashboard();
        } catch (error) {
            toast.error('Error registrando llamada');
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="h-screen flex flex-col md:flex-row bg-gray-50 overflow-hidden">
            {/* Left Panel: Clients List */}
            <div className="w-full md:w-1/4 bg-white border-r flex flex-col">
                <div className="p-4 border-b bg-indigo-600 text-white">
                    <h2 className="font-bold flex items-center gap-2">
                        <User className="w-5 h-5" /> Mis Clientes ({data.clientes.length})
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {data.clientes.map(c => (
                        <div
                            key={c.id}
                            onClick={() => handleSelectCliente(c)}
                            className={`p-3 rounded-lg border cursor-pointer hover:bg-indigo-50 transition-colors ${selectedCliente?.id === c.id ? 'bg-indigo-100 border-indigo-300' : ''}`}
                        >
                            <p className="font-bold text-gray-800">{c.nombre}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {c.telefono || 'Sin tel'}
                            </p>
                            {c.ultima_llamada && (
                                <p className="text-xs text-blue-600 mt-1">
                                    Última: {new Date(c.ultima_llamada).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Center Panel: Workspace */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-gray-800">Telemarketing Workspace</h1>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/telemarketing/estadisticas')}
                            className="flex items-center gap-2"
                        >
                            <BarChart2 className="w-4 h-4" />
                            Estadísticas
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => navigate('/telemarketing/clasificacion')}
                            className="flex items-center gap-2 border-violet-300 text-violet-600 hover:bg-violet-50"
                        >
                            <Users className="w-4 h-4" />
                            Clasificación
                        </Button>
                        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border text-sm">
                            <span className="text-gray-500">Llamadas Hoy:</span>
                            <span className="ml-2 font-bold text-indigo-600">
                                {data.historial.filter(h => new Date(h.fecha).toDateString() === new Date().toDateString()).length}
                            </span>
                        </div>
                    </div>
                </div>

                {selectedCliente ? (
                    <Card className="mb-6 border-indigo-200 shadow-md">
                        <CardHeader className="bg-indigo-50 border-b border-indigo-100 p-0">
                            <div className="p-4 flex justify-between items-center">
                                <CardTitle className="text-indigo-800 flex flex-col">
                                    <span>{selectedCliente.nombre}</span>
                                    <span className="text-sm font-normal text-indigo-600">{selectedCliente.email}</span>
                                </CardTitle>
                                <div className="flex gap-2 text-sm bg-white rounded p-1 border">
                                    <button
                                        onClick={() => setActiveTab('llamada')}
                                        className={`px-3 py-1 rounded transition-colors ${activeTab === 'llamada' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        Registrar Llamada
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('compras')}
                                        className={`px-3 py-1 rounded transition-colors ${activeTab === 'compras' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        Historial Compras
                                    </button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            {activeTab === 'llamada' ? (
                                showCallForm ? (
                                    <form onSubmit={handleSubmitCall} className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Resultado</label>
                                                <select
                                                    className="w-full border p-2 rounded"
                                                    value={callResult}
                                                    onChange={e => setCallResult(e.target.value)}
                                                >
                                                    <option value="contesto">Contestó / Interesado</option>
                                                    <option value="venta_cerrada">Venta Cerrada</option>
                                                    <option value="ocupado">Ocupado / Volver a llamar</option>
                                                    <option value="buzon">Buzón de Voz</option>
                                                    <option value="no_interesado">No interesado</option>
                                                    <option value="numero_incorrecto">Número Incorrecto</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium mb-1">Próxima Llamada (Opcional)</label>
                                                <input
                                                    type="datetime-local"
                                                    className="w-full border p-2 rounded"
                                                    value={nextCallDate}
                                                    onChange={e => setNextCallDate(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1">Notas de la llamada</label>
                                            <textarea
                                                className="w-full border p-2 rounded h-24"
                                                placeholder="Detalles importantes..."
                                                value={callNotes}
                                                onChange={e => setCallNotes(e.target.value)}
                                                required
                                            ></textarea>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <Button type="button" variant="outline" onClick={() => setShowCallForm(false)}>Cancelar</Button>
                                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Registrar Llamada</Button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="text-center py-8">
                                        <Button onClick={() => setShowCallForm(true)} size="lg">
                                            <Phone className="w-5 h-5 mr-2" /> Iniciar Nueva Llamada
                                        </Button>
                                    </div>
                                )
                            ) : (
                                // Historial de Compras View
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {clientHistory.length === 0 ? (
                                        <p className="text-center text-gray-400 py-8">No hay compras registradas</p>
                                    ) : (
                                        <table className="w-full text-sm text-left">
                                            <thead className="text-gray-500 border-b">
                                                <tr>
                                                    <th className="p-2">Fecha</th>
                                                    <th className="p-2">Sucursal</th>
                                                    <th className="p-2 text-center">Items</th>
                                                    <th className="p-2 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {clientHistory.map(v => (
                                                    <tr key={v.id} className="border-b last:border-0 hover:bg-gray-50">
                                                        <td className="p-2">{new Date(v.fecha).toLocaleDateString()}</td>
                                                        <td className="p-2">{v.sucursal}</td>
                                                        <td className="p-2 text-center">{v.items}</td>
                                                        <td className="p-2 text-right font-bold">${parseFloat(v.total).toFixed(2)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center text-blue-800 mb-6">
                        Selecciona un cliente de la lista para comenzar a trabajar.
                    </div>
                )}

                {/* Historial Reciente */}
                <h3 className="font-bold text-gray-700 mb-2">Actividad Reciente</h3>
                <div className="bg-white rounded-lg shadow divide-y">
                    {data.historial.map(h => (
                        <div key={h.id} className="p-4 flex gap-4 items-start">
                            <div className={`w-2 h-2 mt-2 rounded-full ${h.resultado === 'venta_cerrada' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                            <div className="flex-1">
                                <p className="font-bold text-gray-800">{h.cliente_nombre}</p>
                                <p className="text-sm text-gray-600">{h.notas}</p>
                                <div className="flex gap-2 mt-1">
                                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500 uppercase">{h.resultado}</span>
                                    <span className="text-xs text-gray-400">{new Date(h.fecha).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {data.historial.length === 0 && <p className="p-4 text-center text-gray-400">Sin historial reciente.</p>}
                </div>
            </div>

            {/* Right Panel: Tasks */}
            <div className="w-full md:w-1/4 bg-white border-l flex flex-col">
                <div className="p-4 border-b bg-gray-50">
                    <h2 className="font-bold flex items-center gap-2 text-gray-700">
                        <Calendar className="w-5 h-5" /> Tareas Pendientes
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {data.tareas.map(t => (
                        <div key={t.id} className={`p-3 rounded-lg border border-l-4 shadow-sm ${t.prioridad === 'alta' ? 'border-l-red-500' : 'border-l-blue-500'}`}>
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-sm text-gray-800">{t.titulo}</h4>
                                <span className="text-xs text-gray-400">{new Date(t.fecha_programada).toLocaleDateString()}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{t.cliente_nombre}</p>
                            <div className="mt-2 flex gap-1">
                                <button
                                    onClick={() => handleSelectCliente({ id: t.cliente_id, nombre: t.cliente_nombre, telefono: t.cliente_telefono })}
                                    className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 w-full"
                                >
                                    Atender
                                </button>
                            </div>
                        </div>
                    ))}
                    {data.tareas.length === 0 && (
                        <div className="p-4 text-center text-gray-400 text-sm">
                            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                            ¡Todo al día!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
