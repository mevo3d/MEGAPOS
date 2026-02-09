import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../context/authStore';
import { useThemeStore } from '../../context/themeStore';
import { Button } from '../../components/ui/Button';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { LogOut, TrendingUp, Users, DollarSign, Activity, Zap, Clock, ShoppingBag, UserPlus, Settings, Store, Upload, ArrowLeftRight } from 'lucide-react';
import api from '../../utils/api';
import { io } from 'socket.io-client';
import UserManagement from './UserManagement';
import StoreManagement from './StoreManagement';
import ProductImport from './ProductImport';
import Productos from './Productos';
import SystemSettings from './SystemSettings';
import TraspasosPanel from './TraspasosPanel';
import { AlertasStock } from '../../components/inventario/AlertasStock';

export default function AdminDashboard() {
    const { logout, user } = useAuthStore();
    const [activeTab, setActiveTab] = useState('dashboard');
    const [stats, setStats] = useState(null);
    const [cajas, setCajas] = useState([]);
    const [ventasRecientes, setVentasRecientes] = useState([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await api.get('/monitor/dashboard');
                setStats(res.data.consolidado);
                setCajas(res.data.cajas);
                setVentasRecientes(res.data.ventas_recientes);
            } catch (error) {
                console.error('Error cargando dashboard:', error);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        // Implementación de WebSocket
        // Usamos el mismo origen del navegador pero con puerto del backend
        const socketUrl = import.meta.env.VITE_SOCKET_URL || `${window.location.protocol}//${window.location.hostname}:4847`;
        const socket = io(socketUrl);

        socket.on('connect', () => setIsConnected(true));
        socket.on('disconnect', () => setIsConnected(false));

        socket.on('venta-nueva', (data) => {
            setStats(prev => ({
                ...prev,
                total_ventas: parseFloat(prev?.total_ventas || 0) + parseFloat(data.total),
                total_transacciones: parseInt(prev?.total_transacciones || 0) + 1
            }));

            setVentasRecientes(prev => [{
                id: Date.now(),
                total: data.total,
                empleado: data.empleado,
                sucursal: 'Actual',
                fecha_venta: new Date().toISOString()
            }, ...prev.slice(0, 9)]);
        });

        return () => socket.disconnect();
    }, []);

    const tabs = [
        { id: 'dashboard', name: 'Panel Principal', icon: Activity },
        { id: 'products', name: 'Inventario', icon: ShoppingBag },
        { id: 'users', name: 'Usuarios', icon: Users },
        { id: 'stores', name: 'Gestión de Tiendas', icon: Store },
        { id: 'settings', name: 'Configuración', icon: Settings }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'products':
                return <Productos />;
            case 'dashboard':
                return (
                    <>
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                            <Card className="glass hover-lift border-0 shadow-xl overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full blur-3xl"></div>
                                <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                                    <CardTitle className="text-sm font-medium text-gray-600">Ventas del Día</CardTitle>
                                    <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-2 rounded-lg shadow-lg shadow-green-500/50">
                                        <DollarSign className="h-5 w-5 text-white" />
                                    </div>
                                </CardHeader>
                                <CardContent className="relative z-10">
                                    <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                                        ${parseFloat(stats?.total_ventas || 0).toFixed(2)}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <TrendingUp className="h-3 w-3" />
                                        Total acumulado hoy
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="glass hover-lift border-0 shadow-xl overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"></div>
                                <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                                    <CardTitle className="text-sm font-medium text-gray-600">Transacciones</CardTitle>
                                    <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg shadow-lg shadow-blue-500/50">
                                        <ShoppingBag className="h-5 w-5 text-white" />
                                    </div>
                                </CardHeader>
                                <CardContent className="relative z-10">
                                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                                        {stats?.total_transacciones || 0}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Tickets generados
                                    </p>
                                </CardContent>
                            </Card>

                            <Card className="glass hover-lift border-0 shadow-xl overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl"></div>
                                <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                                    <CardTitle className="text-sm font-medium text-gray-600">Sucursales Activas</CardTitle>
                                    <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-2 rounded-lg shadow-lg shadow-orange-500/50">
                                        <Zap className="h-5 w-5 text-white" />
                                    </div>
                                </CardHeader>
                                <CardContent className="relative z-10">
                                    <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                                        {stats?.sucursales_activas || 0}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                        <Activity className="h-3 w-3" />
                                        Operando ahora
                                    </p>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Stock Alerts */}
                            <div className="h-96 lg:h-auto">
                                <AlertasStock />
                            </div>

                            {/* Active Registers */}
                            <Card className="glass border-0 shadow-xl animate-slide-up">
                                <CardHeader className="border-b border-gray-100">
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5 text-blue-600" />
                                        Estado de Cajas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="space-y-3">
                                        {cajas.map((caja) => (
                                            <div key={caja.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-white to-gray-50 border border-gray-100 rounded-xl hover-lift">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-3 h-3 rounded-full ${caja.estado_caja === 'abierta' ? 'bg-green-500 shadow-lg shadow-green-500/50 animate-pulse' : 'bg-gray-300'}`} />
                                                    <div>
                                                        <p className="font-semibold text-gray-900">{caja.nombre}</p>
                                                        <p className="text-sm text-gray-500">{caja.sucursal_nombre}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-medium text-gray-900">{caja.empleado_actual || 'Sin asignar'}</p>
                                                    <p className="text-sm font-semibold text-green-600">${caja.total_actual || '0.00'}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {cajas.length === 0 && (
                                            <p className="text-center text-gray-400 py-8">No hay cajas registradas</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Recent Sales */}
                            <Card className="glass border-0 shadow-xl animate-slide-up">
                                <CardHeader className="border-b border-gray-100">
                                    <CardTitle className="flex items-center gap-2">
                                        <TrendingUp className="h-5 w-5 text-green-600" />
                                        Ventas Recientes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="space-y-3">
                                        {ventasRecientes.map((venta, idx) => (
                                            <div key={venta.id} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors">
                                                <div>
                                                    <p className="font-medium text-sm text-gray-900">Ticket #{venta.id.toString().slice(-4)}</p>
                                                    <p className="text-xs text-gray-500">{new Date(venta.fecha_venta).toLocaleTimeString()}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-green-600">+${parseFloat(venta.total).toFixed(2)}</p>
                                                    <p className="text-xs text-gray-500">{venta.empleado}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {ventasRecientes.length === 0 && (
                                            <p className="text-center text-gray-400 py-8">Esperando ventas...</p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                );
            case 'users':
                return <UserManagement />;
            case 'stores':
                return <StoreManagement />;
            case 'settings':
                return <SystemSettings />;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-purple-50/30">
            {/* Header Premium */}
            <header className="glass border-b border-white/20 sticky top-0 z-50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg shadow-blue-500/50">
                                <Activity className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    Panel de Control
                                </h1>
                                <p className="text-sm text-gray-500">Bienvenido, {user?.nombre}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <ThemeToggle />
                            <div className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 ${isConnected
                                ? 'bg-green-100 text-green-800 border border-green-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                                }`}>
                                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                {isConnected ? 'En Vivo' : 'Desconectado'}
                            </div>
                            <Button variant="outline" onClick={logout} className="hover-lift">
                                <LogOut className="h-4 w-4 mr-2" />
                                Salir
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="max-w-7xl mx-auto px-6 py-6">
                <div className="flex space-x-1 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm p-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-md font-medium text-sm transition-all duration-200 ${activeTab === tab.id
                                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                            >
                                <Icon className="h-4 w-4" />
                                <span className="hidden md:inline">{tab.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-6 pb-8">
                {renderContent()}
            </div>
        </div>
    );
}
