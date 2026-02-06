import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../context/authStore';
import api from '../../utils/api';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import {
    ShoppingCart, Package, Truck, ClipboardList,
    LogOut, User, Plus, CheckCircle, Clock, AlertCircle,
    Building2, DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ComprasPanel() {
    const { user, logout } = useAuthStore();
    const [activeTab, setActiveTab] = useState('ordenes');
    const [ordenes, setOrdenes] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        pendientes: 0,
        enTransito: 0,
        recibidas: 0,
        totalMes: 0
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [ordenesRes, proveedoresRes] = await Promise.all([
                api.get('/compras'),
                api.get('/proveedores')
            ]);

            setOrdenes(ordenesRes.data.ordenes || ordenesRes.data || []);
            setProveedores(proveedoresRes.data.proveedores || proveedoresRes.data || []);

            // Calcular estadísticas
            const lista = ordenesRes.data.ordenes || ordenesRes.data || [];
            setStats({
                pendientes: lista.filter(o => o.estado === 'pendiente').length,
                enTransito: lista.filter(o => o.estado === 'ordenado').length,
                recibidas: lista.filter(o => o.estado === 'recibido').length,
                totalMes: lista.reduce((sum, o) => sum + parseFloat(o.total_estimado || 0), 0)
            });
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const cambiarEstado = async (ordenId, nuevoEstado) => {
        try {
            await api.put(`/compras/${ordenId}/estado`, { estado: nuevoEstado });
            toast.success('Estado actualizado');
            fetchData();
        } catch (error) {
            toast.error('Error actualizando estado');
        }
    };

    const getEstadoBadge = (estado) => {
        const estilos = {
            pendiente: 'bg-yellow-100 text-yellow-800',
            ordenado: 'bg-blue-100 text-blue-800',
            en_transito: 'bg-purple-100 text-purple-800',
            recibido: 'bg-green-100 text-green-800',
            cancelado: 'bg-red-100 text-red-800'
        };
        return estilos[estado] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Header */}
            <header className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-4 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <ShoppingCart className="w-7 h-7" />
                            Panel de Compras
                        </h1>
                        <p className="text-orange-100 text-sm flex items-center gap-1">
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
                    <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white border-0">
                        <CardContent className="p-4">
                            <Clock className="w-8 h-8 opacity-80" />
                            <p className="text-3xl font-bold mt-2">{stats.pendientes}</p>
                            <p className="text-yellow-100 text-sm">Pendientes</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
                        <CardContent className="p-4">
                            <Truck className="w-8 h-8 opacity-80" />
                            <p className="text-3xl font-bold mt-2">{stats.enTransito}</p>
                            <p className="text-blue-100 text-sm">En Tránsito</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
                        <CardContent className="p-4">
                            <CheckCircle className="w-8 h-8 opacity-80" />
                            <p className="text-3xl font-bold mt-2">{stats.recibidas}</p>
                            <p className="text-green-100 text-sm">Recibidas</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
                        <CardContent className="p-4">
                            <DollarSign className="w-8 h-8 opacity-80" />
                            <p className="text-3xl font-bold mt-2">${stats.totalMes.toFixed(0)}</p>
                            <p className="text-purple-100 text-sm">Total Ordenado</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm">
                    {[
                        { id: 'ordenes', label: 'Órdenes de Compra', icon: ClipboardList },
                        { id: 'proveedores', label: 'Proveedores', icon: Building2 },
                        { id: 'recepciones', label: 'Recepciones', icon: Package }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-all
                                ${activeTab === tab.id
                                    ? 'bg-orange-500 text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Contenido de Tabs */}
                {activeTab === 'ordenes' && (
                    <Card className="shadow-xl border-0">
                        <CardHeader className="bg-gray-50 border-b flex justify-between items-center">
                            <CardTitle className="flex items-center gap-2">
                                <ClipboardList className="w-5 h-5 text-orange-500" />
                                Órdenes de Compra
                            </CardTitle>
                            <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                                <Plus className="w-4 h-4 mr-2" />
                                Nueva Orden
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {loading ? (
                                <div className="p-8 text-center text-gray-500">Cargando...</div>
                            ) : ordenes.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No hay órdenes de compra</div>
                            ) : (
                                <div className="divide-y">
                                    {ordenes.map(orden => (
                                        <div key={orden.id} className="p-4 hover:bg-gray-50 flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-gray-800">
                                                    Orden #{orden.id} - {orden.proveedor_nombre || 'Sin proveedor'}
                                                </p>
                                                <p className="text-sm text-gray-500">
                                                    {new Date(orden.created_at).toLocaleDateString()} •
                                                    Total: ${parseFloat(orden.total_estimado || 0).toFixed(2)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoBadge(orden.estado)}`}>
                                                    {orden.estado}
                                                </span>
                                                {orden.estado === 'pendiente' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => cambiarEstado(orden.id, 'ordenado')}
                                                        className="bg-blue-500 text-white"
                                                    >
                                                        Marcar Ordenado
                                                    </Button>
                                                )}
                                                {orden.estado === 'ordenado' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => cambiarEstado(orden.id, 'recibido')}
                                                        className="bg-green-500 text-white"
                                                    >
                                                        Marcar Recibido
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'proveedores' && (
                    <Card className="shadow-xl border-0">
                        <CardHeader className="bg-gray-50 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-orange-500" />
                                Proveedores ({proveedores.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {proveedores.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">No hay proveedores registrados</div>
                            ) : (
                                <div className="divide-y">
                                    {proveedores.map(prov => (
                                        <div key={prov.id} className="p-4 hover:bg-gray-50">
                                            <p className="font-medium text-gray-800">{prov.nombre}</p>
                                            <p className="text-sm text-gray-500">
                                                {prov.contacto_nombre} • {prov.telefono || 'Sin teléfono'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {activeTab === 'recepciones' && (
                    <Card className="shadow-xl border-0">
                        <CardHeader className="bg-gray-50 border-b">
                            <CardTitle className="flex items-center gap-2">
                                <Package className="w-5 h-5 text-orange-500" />
                                Recepciones de Mercancía
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 text-center text-gray-500">
                            Las recepciones aparecerán aquí cuando marques órdenes como recibidas.
                        </CardContent>
                    </Card>
                )}
            </main>
        </div>
    );
}
