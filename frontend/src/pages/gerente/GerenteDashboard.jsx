import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../context/authStore';
import { Button } from '../../components/ui/Button';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import {
  LogOut,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Store,
  ShoppingBag,
  Package,
  Upload,
  Settings,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import api from '../../utils/api';
import { io } from 'socket.io-client';
import ProductImport from '../admin/ProductImport';

export default function GerenteDashboard() {
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
        console.error('Error cargando dashboard gerente:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    // Usar URL relativa para aprovechar el proxy de Vite
    const socket = io(import.meta.env.VITE_API_URL || window.location.origin);

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    // Unirse a la sala de la sucursal del gerente
    if (user?.sucursal_id) {
      socket.emit('join-sucursal', user.sucursal_id);
    }

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
        sucursal: 'Mi Sucursal',
        fecha_venta: new Date().toISOString()
      }, ...prev.slice(0, 9)]);
    });

    return () => socket.disconnect();
  }, [user?.sucursal_id]);

  const tabs = [
    { id: 'dashboard', name: 'Mi Sucursal', icon: Store },
    { id: 'import', name: 'Importar Productos', icon: Upload },
    { id: 'employees', name: 'Mis Empleados', icon: UserCheck },
    { id: 'inventory', name: 'Inventario', icon: Package },
    { id: 'reports', name: 'Reportes', icon: TrendingUp }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'import':
        return <ProductImport userRole={user?.rol} sucursalId={user?.sucursal_id} />;
      case 'dashboard':
        return (
          <>
            {/* Header de Sucursal */}
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Panel de Gerencia</h2>
                  <p className="text-blue-100">
                    Gestionando tu sucursal - {user?.sucursal_nombre || 'Sucursal Asignada'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {stats?.sucursales_activas > 0 ? '🟢 Activa' : '🔴 Inactiva'}
                  </div>
                  <p className="text-sm text-blue-100">Estado de Operación</p>
                </div>
              </div>
            </div>

            {/* Stats Grid de Gerente */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
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
                  <p className="text-xs text-gray-500 mt-1">Hoy en tu sucursal</p>
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
                  <p className="text-xs text-gray-500 mt-1">Tickets generados</p>
                </CardContent>
              </Card>

              <Card className="glass hover-lift border-0 shadow-xl overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl"></div>
                <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium text-gray-600">Cajas Activas</CardTitle>
                  <div className="bg-gradient-to-br from-purple-500 to-pink-500 p-2 rounded-lg shadow-lg shadow-purple-500/50">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {cajas.filter(c => c.estado_caja === 'abierta').length}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Operando ahora</p>
                </CardContent>
              </Card>

              <Card className="glass hover-lift border-0 shadow-xl overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-red-400/20 rounded-full blur-3xl"></div>
                <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                  <CardTitle className="text-sm font-medium text-gray-600">Alertas</CardTitle>
                  <div className="bg-gradient-to-br from-orange-500 to-red-500 p-2 rounded-lg shadow-lg shadow-orange-500/50">
                    <AlertTriangle className="h-5 w-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                    0
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Sin alertas</p>
                </CardContent>
              </Card>
            </div>

            {/* Información Detallada */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Estado de Cajas */}
              <Card className="glass border-0 shadow-xl">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Estado de Cajas - Mi Sucursal
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
                            <p className="text-sm text-gray-500">Cajero: {caja.empleado_actual || 'Sin asignar'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">${caja.total_actual || '0.00'}</p>
                          <p className="text-xs text-gray-500">Ventas del turno</p>
                        </div>
                      </div>
                    ))}
                    {cajas.length === 0 && (
                      <p className="text-center text-gray-400 py-8">No hay cajas registradas en tu sucursal</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Ventas Recientes */}
              <Card className="glass border-0 shadow-xl">
                <CardHeader className="border-b border-gray-100">
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Ventas Recientes - Mi Sucursal
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {ventasRecientes.slice(0, 8).map((venta, idx) => (
                      <div key={venta.id} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 hover:bg-gray-50 px-2 py-1 rounded-lg transition-colors">
                        <div>
                          <p className="font-medium text-sm text-gray-900">Ticket #{venta.id.toString().slice(-6)}</p>
                          <p className="text-xs text-gray-500">{new Date(venta.fecha_venta).toLocaleTimeString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">+${parseFloat(venta.total).toFixed(2)}</p>
                          <p className="text-xs text-gray-500">{venta.empleado}</p>
                        </div>
                      </div>
                    ))}
                    {ventasRecientes.length === 0 && (
                      <p className="text-center text-gray-400 py-8">Esperando ventas en tu sucursal...</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        );
      case 'employees':
        return (
          <Card className="glass border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="text-center text-gray-500">
                <UserCheck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">Gestión de Empleados</h3>
                <p>Administra al personal de tu sucursal</p>
                <p className="text-sm mt-2">En desarrollo - Próximamente disponible</p>
              </div>
            </CardContent>
          </Card>
        );
      case 'inventory':
        return (
          <Card className="glass border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="text-center text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">Gestión de Inventario</h3>
                <p>Controla el stock y existencias de tu sucursal</p>
                <p className="text-sm mt-2">En desarrollo - Próximamente disponible</p>
              </div>
            </CardContent>
          </Card>
        );
      case 'reports':
        return (
          <Card className="glass border-0 shadow-xl">
            <CardContent className="p-8">
              <div className="text-center text-gray-500">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">Reportes de Sucursal</h3>
                <p>Analiza el rendimiento y métricas de tu sucursal</p>
                <p className="text-sm mt-2">En desarrollo - Próximamente disponible</p>
              </div>
            </CardContent>
          </Card>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-purple-50/30">
      {/* Header Gerente */}
      <header className="glass border-b border-white/20 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg shadow-blue-500/50">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Panel de Gerente
                </h1>
                <p className="text-sm text-gray-500">
                  {user?.nombre} - {user?.sucursal_nombre || 'Sucursal Asignada'}
                </p>
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

      {/* Navegación del Gerente */}
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

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        {renderContent()}
      </div>
    </div>
  );
}