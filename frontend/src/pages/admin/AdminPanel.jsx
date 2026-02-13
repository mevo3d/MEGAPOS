import React, { useState } from 'react';
import { useAuthStore } from '../../context/authStore';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import {
  Package,
  Upload,
  Users,
  Settings,
  TrendingUp,
  FileSpreadsheet,
  Database,
  BarChart3,
  Activity,
  LogOut,
  ArrowLeft,
  Image,
  Building2,
  Brain,
  DollarSign,
  Truck,
  Briefcase,
  Wallet,
  Calculator
} from 'lucide-react';
import ProductImport from './ProductImport';
import LogoSettings from './LogoSettings';
import TiposSucursalSettings from './TiposSucursalSettings';
import ProcurementDashboard from './procurement/ProcurementDashboard';
import CrmDashboard from './crm/CrmDashboard';
import BIDashboard from './bi/BIDashboard';
import PagosControl from './finance/PagosControl';
import AIAssistant from './ai/AIAssistant';
import Productos from './Productos';
import UserManagement from './UserManagement';
import DispersionInventario from './inventario/DispersionInventario';
import HRDashboard from './hr/HRDashboard';
import EmpleadoExpediente from './hr/EmpleadoExpediente';
import NominaPanel from './hr/NominaPanel';
import SystemSettings from './SystemSettings';

export default function AdminPanel() {
  const { logout, user } = useAuthStore();
  const [currentSection, setCurrentSection] = useState('dashboard');
  const [showDashboard, setShowDashboard] = useState(true);
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState(null);

  const menuItems = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: Activity,
      description: 'Panel principal de control'
    },
    {
      id: 'dispersion',
      title: 'Dispersión de Inventario',
      icon: Truck,
      description: 'Envíos y Transferencias'
    },
    {
      id: 'compras',
      title: 'Compras y CEDIS',
      icon: Building2,
      description: 'Proveedores y Abastecimiento'
    },
    {
      id: 'import',
      title: 'Importar Productos',
      icon: Upload,
      description: 'Carga masiva desde Excel'
    },
    {
      id: 'crm',
      title: 'CRM y Ventas',
      icon: TrendingUp,
      description: 'Clientes y Telemarketing'
    },
    {
      id: 'products',
      title: 'Gestión de Productos',
      icon: Package,
      description: 'Catálogo y existencias'
    },
    {
      id: 'users',
      title: 'Usuarios',
      icon: Users,
      description: 'Permisos y accesos'
    },
    {
      id: 'logo',
      title: 'Logo del Sistema',
      icon: Image,
      description: 'Personalizar logotipo'
    },
    {
      id: 'reports',
      title: 'Reportes',
      icon: BarChart3,
      description: 'Análisis y métricas'
    },
    {
      id: 'finance',
      title: 'Finanzas y Pagos',
      icon: DollarSign,
      description: 'Auditoría y Tesorería'
    },
    {
      id: 'database',
      title: 'Base de Datos',
      icon: Database,
      description: 'Configuración y respaldos'
    },
    {
      id: 'tipos-sucursal',
      title: 'Tipos de Sucursal',
      icon: Building2,
      description: 'CEDIS, Rutas, Telemarketing'
    },
    // Solo para superadmin - Nómina y RRHH
    ...(user?.rol === 'superadmin' ? [
      {
        id: 'hr',
        title: 'Recursos Humanos',
        icon: Briefcase,
        description: 'Expedientes y Personal'
      },
      {
        id: 'nomina',
        title: 'Nómina',
        icon: Wallet,
        description: 'Comisiones y Pagos'
      }
    ] : []),
    {
      id: 'settings',
      title: 'Configuración',
      icon: Settings,
      description: 'Ajustes del sistema'
    },
    // Solo para superadmin
    ...(user?.rol === 'superadmin' ? [{
      id: 'ai-assistant',
      title: 'Asistente IA',
      icon: Brain,
      description: 'Consultas inteligentes'
    }] : [])
  ];

  const renderContent = () => {
    switch (currentSection) {
      case 'dispersion':
        return <DispersionInventario />;
      case 'compras':
        return <ProcurementDashboard />;
      case 'crm':
        return <CrmDashboard />;
      case 'reports':
        return <BIDashboard />;
      case 'finance':
        return <PagosControl />;
      case 'ai-assistant':
        return <AIAssistant />;
      case 'import':
        return <ProductImport userRole={user?.rol} sucursalId={user?.sucursal_id} />;
      case 'logo':
        return <LogoSettings />;
      case 'tipos-sucursal':
        return <TiposSucursalSettings />;
      case 'products':
        return <Productos />;
      case 'users':
        return <UserManagement />;
      case 'hr':
        if (selectedEmpleadoId) {
          return <EmpleadoExpediente
            empleadoId={selectedEmpleadoId}
            onBack={() => setSelectedEmpleadoId(null)}
          />;
        }
        return <HRDashboard onSelectEmpleado={(id) => setSelectedEmpleadoId(id)} />;
      case 'nomina':
        return <NominaPanel />;
      case 'settings':
        return <SystemSettings />;
      case 'database':
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold">Base de Datos</h2>
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <p className="text-gray-500">Opciones de respaldo y mantenimiento de la base de datos.</p>
                <div className="mt-4 space-y-3">
                  <Button className="w-full" variant="outline">Crear Respaldo Manual</Button>
                  <Button className="w-full" variant="outline">Ver Historial de Respaldos</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      case 'dashboard':
        return <DashboardContent user={user} logout={logout} />;
      default:
        return (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Settings size={64} className="mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Sección en Desarrollo
            </h3>
            <p className="text-gray-600">
              La sección "{menuItems.find(item => item.id === currentSection)?.title}"
              está siendo implementada.
            </p>
          </div>
        );
    }
  };

  if (currentSection === 'dashboard' && showDashboard) {
    return <DashboardContent user={user} logout={logout} onNavigate={setCurrentSection} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-purple-50/30">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {currentSection !== 'dashboard' && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentSection('dashboard')}
                  className="hover-lift"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver
                </Button>
              )}
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg shadow-blue-500/50">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Panel de Administración
                </h1>
                <p className="text-sm text-gray-500">
                  {menuItems.find(item => item.id === currentSection)?.title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.nombre}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.rol}</p>
              </div>
              <Button variant="outline" onClick={logout} className="hover-lift">
                <LogOut className="h-4 w-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navegación lateral */}
      {currentSection !== 'dashboard' && (
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentSection === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentSection(item.id)}
                  className={`p-4 rounded-xl border-2 transition-all hover-lift ${isActive
                    ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 shadow-lg shadow-blue-500/20'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                >
                  <div className={`flex flex-col items-center gap-3 ${isActive ? 'text-blue-600' : 'text-gray-600'}`}>
                    <div className={`p-3 rounded-lg ${isActive ? 'bg-blue-100' : 'bg-gray-100'}`}>
                      <Icon size={24} />
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold text-sm">{item.title}</h3>
                      <p className="text-xs mt-1 opacity-75">{item.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Contenido principal */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {renderContent()}
          </div>
        </div>
      )}

      {/* Contenido cuando no es dashboard */}
      {currentSection !== 'dashboard' && currentSection !== 'import' && renderContent()}
      {currentSection === 'import' && renderContent()}
    </div>
  );
}

// Dashboard Content Component
function DashboardContent({ user, logout, onNavigate }) {
  const [stats, setStats] = useState(null);
  const [cajas, setCajas] = useState([]);
  const [ventasRecientes, setVentasRecientes] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const api = (await import('../../utils/api')).default;
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

  React.useEffect(() => {
    const { io } = require('socket.io-client');
    // Usar URL relativa para aprovechar el proxy de Vite
    const socket = io(import.meta.env.VITE_API_URL || window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    });

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

  const adminActions = [
    {
      title: 'Dispersión Inventario',
      description: 'Mover stock entre sucursales',
      icon: Truck,
      color: 'from-yellow-500 to-orange-500',
      action: () => onNavigate('dispersion')
    },
    {
      title: 'Importar Productos',
      description: 'Carga masiva de productos desde Excel',
      icon: Upload,
      color: 'from-green-500 to-emerald-500',
      action: () => onNavigate('import')
    },
    {
      title: 'Gestión de Productos',
      description: 'Administrar catálogo e inventario',
      icon: Package,
      color: 'from-blue-500 to-cyan-500',
      action: () => onNavigate('products')
    },
    {
      title: 'Reportes',
      description: 'Análisis de ventas y métricas',
      icon: BarChart3,
      color: 'from-purple-500 to-pink-500',
      action: () => onNavigate('reports')
    },
    {
      title: 'Base de Datos',
      description: 'Configuración y mantenimiento',
      icon: Database,
      color: 'from-orange-500 to-red-500',
      action: () => onNavigate('database')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-purple-50/30">
      {/* Header */}
      <header className="glass border-b border-white/20 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg shadow-blue-500/50">
                <Activity className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Panel de Administración
                </h1>
                <p className="text-sm text-gray-500">Bienvenido, {user?.nombre}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
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

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Acciones Rápidas */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {adminActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={action.action}
                  className="group relative overflow-hidden rounded-xl border-2 border-gray-200 bg-white hover:border-gray-300 transition-all hover-lift"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`}></div>
                  <div className="relative p-6">
                    <div className={`bg-gradient-to-br ${action.color} p-3 rounded-lg shadow-lg w-12 h-12 flex items-center justify-center mb-4`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                    <p className="text-xs text-gray-600">{action.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          <Card className="glass hover-lift border-0 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-400/20 to-emerald-400/20 rounded-full blur-3xl"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600">Ventas del Día</CardTitle>
              <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-2 rounded-lg shadow-lg shadow-green-500/50">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                ${parseFloat(stats?.total_ventas || 0).toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                Total acumulado hoy
              </p>
            </CardContent>
          </Card>

          <Card className="glass hover-lift border-0 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600">Transacciones</CardTitle>
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-2 rounded-lg shadow-lg shadow-blue-500/50">
                <FileSpreadsheet className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                {stats?.total_transacciones || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Tickets generados
              </p>
            </CardContent>
          </Card>

          <Card className="glass hover-lift border-0 shadow-xl overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-amber-400/20 rounded-full blur-3xl"></div>
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
              <CardTitle className="text-sm font-medium text-gray-600">Sucursales Activas</CardTitle>
              <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-2 rounded-lg shadow-lg shadow-orange-500/50">
                <Activity className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                {stats?.sucursales_activas || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Operando ahora
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabla de contenido */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
      </div>
    </div>
  );
}