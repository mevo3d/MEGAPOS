import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../context/authStore';
import api from '../../utils/api';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import {
    Phone, Users, TrendingUp, Target, Calendar, Clock,
    LogOut, User, CheckCircle, XCircle, MessageSquare, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function TelemarketingPanel() {
    const { user, logout } = useAuthStore();
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalClientes: 0,
        pendientes: 0,
        contactadosHoy: 0,
        ventasHoy: 0
    });
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [showNoteModal, setShowNoteModal] = useState(false);
    const [newNote, setNewNote] = useState('');

    useEffect(() => {
        fetchClientes();
    }, []);

    const fetchClientes = async () => {
        try {
            const res = await api.get('/clientes');
            setClientes(res.data.clientes || res.data || []);

            // Calcular estadísticas
            const hoy = new Date().toISOString().split('T')[0];
            const pendientes = res.data.clientes?.filter(c => !c.ultimo_contacto) || [];

            setStats({
                totalClientes: res.data.clientes?.length || 0,
                pendientes: pendientes.length,
                contactadosHoy: 0,
                ventasHoy: 0
            });
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error cargando clientes');
        } finally {
            setLoading(false);
        }
    };

    const marcarContactado = async (clienteId, resultado) => {
        try {
            await api.post(`/clientes/${clienteId}/notas`, {
                contenido: `Llamada realizada - Resultado: ${resultado}`,
                tipo: 'llamada'
            });
            toast.success('Contacto registrado');
            fetchClientes();
        } catch (error) {
            toast.error('Error registrando contacto');
        }
    };

    const agregarNota = async () => {
        if (!selectedCliente || !newNote.trim()) return;

        try {
            await api.post(`/clientes/${selectedCliente.id}/notas`, {
                contenido: newNote,
                tipo: 'nota'
            });
            toast.success('Nota agregada');
            setShowNoteModal(false);
            setNewNote('');
            fetchClientes();
        } catch (error) {
            toast.error('Error agregando nota');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-4 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Phone className="w-7 h-7" />
                            Panel de Telemarketing
                        </h1>
                        <p className="text-green-100 text-sm flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {user?.nombre}
                        </p>
                    </div>
                    <Button onClick={logout} variant="ghost" className="text-white hover:bg-white/20">
                        <LogOut className="w-5 h-5 mr-2" />
                        Salir
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Estadísticas */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                        <CardContent className="p-4">
                            <Users className="w-8 h-8 opacity-80" />
                            <p className="text-3xl font-bold mt-2">{stats.totalClientes}</p>
                            <p className="text-blue-100 text-sm">Total Clientes</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white border-0">
                        <CardContent className="p-4">
                            <Target className="w-8 h-8 opacity-80" />
                            <p className="text-3xl font-bold mt-2">{stats.pendientes}</p>
                            <p className="text-yellow-100 text-sm">Por Contactar</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-500 to-emerald-500 text-white border-0">
                        <CardContent className="p-4">
                            <CheckCircle className="w-8 h-8 opacity-80" />
                            <p className="text-3xl font-bold mt-2">{stats.contactadosHoy}</p>
                            <p className="text-green-100 text-sm">Contactos Hoy</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-500 to-pink-500 text-white border-0">
                        <CardContent className="p-4">
                            <TrendingUp className="w-8 h-8 opacity-80" />
                            <p className="text-3xl font-bold mt-2">${stats.ventasHoy}</p>
                            <p className="text-purple-100 text-sm">Ventas Hoy</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Lista de Clientes para Llamar */}
                <Card className="shadow-xl border-0">
                    <CardHeader className="bg-gray-50 border-b">
                        <CardTitle className="flex items-center gap-2">
                            <Phone className="w-5 h-5 text-green-500" />
                            Clientes para Contactar
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-8 text-center text-gray-500">Cargando...</div>
                        ) : clientes.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">No hay clientes registrados</div>
                        ) : (
                            <div className="divide-y">
                                {clientes.slice(0, 20).map(cliente => (
                                    <div key={cliente.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-800">{cliente.nombre}</p>
                                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {cliente.telefono || 'Sin teléfono'}
                                                </span>
                                                {cliente.saldo_pendiente > 0 && (
                                                    <span className="text-red-500 font-medium">
                                                        Saldo: ${parseFloat(cliente.saldo_pendiente).toFixed(2)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                    setSelectedCliente(cliente);
                                                    setShowNoteModal(true);
                                                }}
                                                className="text-blue-500"
                                            >
                                                <MessageSquare className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => marcarContactado(cliente.id, 'Contactado')}
                                                className="bg-green-500 hover:bg-green-600 text-white"
                                            >
                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                Contactado
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => marcarContactado(cliente.id, 'No contestó')}
                                                className="text-gray-500"
                                            >
                                                <XCircle className="w-4 h-4 mr-1" />
                                                No contestó
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </main>

            {/* Modal de Nota */}
            {showNoteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <h3 className="text-lg font-bold mb-4">
                            Agregar Nota - {selectedCliente?.nombre}
                        </h3>
                        <textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            className="w-full h-32 border rounded-lg p-3 focus:ring-2 focus:ring-green-500 focus:outline-none"
                            placeholder="Escribe la nota de la llamada..."
                        />
                        <div className="flex justify-end gap-3 mt-4">
                            <Button variant="ghost" onClick={() => setShowNoteModal(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={agregarNota} className="bg-green-500 hover:bg-green-600 text-white">
                                Guardar Nota
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
