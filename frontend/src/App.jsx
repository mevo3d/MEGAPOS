import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Login from './pages/auth/Login';
import POS from './pages/pos/POS';
import CorteCaja from './pages/pos/CorteCaja';
import PreparacionPedidos from './pages/pos/PreparacionPedidos';
import CajaCobro from './pages/pos/CajaCobro';
import POSLayout from './components/layout/POSLayout';
import AdminDashboard from './pages/admin/Dashboard';
import Productos from './pages/admin/Productos';
import GerenteDashboard from './pages/gerente/GerenteDashboard';
import MobileCapture from './pages/mobile/MobileCapture';
import TelemarketingPanel from './pages/telemarketing/TelemarketingPanel';
import ComprasPanel from './pages/compras/ComprasPanel';
import { useAuthStore } from './context/authStore';
import BodegaDashboard from './pages/bodega/BodegaDashboard';
import RuteroDashboard from './pages/rutero/RuteroDashboard';
import Traspasos from './pages/inventario/Traspasos';
import RutaInventario from './pages/rutero/RutaInventario';
import RutaVisitas from './pages/rutero/RutaVisitas';
import RutaVenta from './pages/rutero/RutaVenta';
import CedisDashboard from './pages/cedis/CedisDashboard';
import RecepcionMercancia from './pages/cedis/RecepcionMercancia';
import GestionUbicaciones from './pages/cedis/GestionUbicaciones';
import TelemarketingDashboard from './pages/telemarketing/TelemarketingDashboard';
import TelemarketingEstadisticas from './pages/telemarketing/TelemarketingEstadisticas';
import ClasificacionClientes from './pages/telemarketing/ClasificacionClientes';
import CoordinacionPedidos from './pages/coordinacion/CoordinacionPedidos';
import SuperAdminDashboard from './pages/admin/bi/SuperAdminDashboard';
import Configuracion from './pages/admin/Configuracion';
import AperturaCaja from './pages/pos/AperturaCaja';
import PreventaPOS from './pages/pos/PreventaPOS';
import CajaGuard from './components/pos/CajaGuard';

// Configuración de React Query
const queryClient = new QueryClient();

// Componente para rutas protegidas
const ProtectedRoute = ({ children, roles }) => {
    const { isAuthenticated, user } = useAuthStore();

    if (!isAuthenticated) return <Navigate to="/login" />;

    // Si se especifican roles, verificar que el usuario tenga uno de ellos
    if (roles && !roles.includes(user?.rol)) {
        // Redirigir según el rol del usuario
        if (user?.rol === 'superadmin') return <Navigate to="/superadmin" />;
        if (user?.rol === 'admin') return <Navigate to="/admin" />;
        if (user?.rol === 'gerente') return <Navigate to="/gerente" />;
        if (user?.rol === 'gerente_cedis') return <Navigate to="/cedis" />;
        if (user?.rol === 'telemarketing') return <Navigate to="/telemarketing" />;
        if (user?.rol === 'compras') return <Navigate to="/compras" />;
        if (user?.rol === 'capturista') return <Navigate to="/mobile/capture" />;
        if (user?.rol === 'bodeguero') return <Navigate to="/bodega" />;
        if (user?.rol === 'rutero') return <Navigate to="/rutero" />;
        if (user?.rol === 'cajero') return <Navigate to="/pos" />;
        if (user?.rol === 'vendedor') return <Navigate to="/vendedor" />;
        return <Navigate to="/login" />;
    }

    return children;
};

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    {/* PWA Mobile - Captura Rápida de Productos */}
                    <Route path="/mobile/capture" element={<MobileCapture />} />

                    {/* Panel Admin/Superadmin */}
                    <Route path="/superadmin" element={<ProtectedRoute roles={['superadmin']}><SuperAdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute roles={['admin', 'superadmin']}><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/admin/productos" element={<ProtectedRoute roles={['admin', 'superadmin']}><Productos /></ProtectedRoute>} />
                    <Route path="/admin/configuracion" element={<ProtectedRoute roles={['superadmin']}><Configuracion /></ProtectedRoute>} />

                    {/* Panel Gerente */}
                    <Route path="/gerente" element={<ProtectedRoute roles={['gerente']}><GerenteDashboard /></ProtectedRoute>} />

                    {/* Panel Telemarketing */}
                    <Route path="/telemarketing" element={<ProtectedRoute roles={['telemarketing']}><TelemarketingPanel /></ProtectedRoute>} />

                    {/* Panel Compras */}
                    <Route path="/compras" element={<ProtectedRoute roles={['compras']}><ComprasPanel /></ProtectedRoute>} />

                    {/* Paneles Nuevos CEDIS/Logística */}
                    <Route path="/bodega" element={<ProtectedRoute roles={['bodeguero', 'admin', 'superadmin']}><BodegaDashboard /></ProtectedRoute>} />
                    <Route path="/rutero" element={<ProtectedRoute roles={['rutero', 'admin', 'superadmin']}><RuteroDashboard /></ProtectedRoute>} />
                    <Route path="/rutero/inventario" element={<ProtectedRoute roles={['rutero', 'admin', 'superadmin']}><RutaInventario /></ProtectedRoute>} />
                    <Route path="/rutero/visitas" element={<ProtectedRoute roles={['rutero', 'admin', 'superadmin']}><RutaVisitas /></ProtectedRoute>} />
                    <Route path="/rutero/venta" element={<ProtectedRoute roles={['rutero', 'admin', 'superadmin']}><RutaVenta /></ProtectedRoute>} />
                    <Route path="/cedis" element={<ProtectedRoute roles={['gerente', 'gerente_cedis', 'admin', 'superadmin', 'compras']}><CedisDashboard /></ProtectedRoute>} />
                    <Route path="/cedis/recepcion" element={<ProtectedRoute roles={['gerente', 'gerente_cedis', 'bodeguero', 'admin', 'superadmin']}><RecepcionMercancia /></ProtectedRoute>} />
                    <Route path="/cedis/ubicaciones" element={<ProtectedRoute roles={['gerente', 'gerente_cedis', 'bodeguero', 'admin', 'superadmin']}><GestionUbicaciones /></ProtectedRoute>} />
                    <Route path="/telemarketing" element={<ProtectedRoute roles={['telemarketing', 'admin', 'superadmin']}><TelemarketingDashboard /></ProtectedRoute>} />
                    <Route path="/telemarketing/estadisticas" element={<ProtectedRoute roles={['telemarketing', 'admin', 'superadmin']}><TelemarketingEstadisticas /></ProtectedRoute>} />
                    <Route path="/telemarketing/clasificacion" element={<ProtectedRoute roles={['telemarketing', 'admin', 'superadmin']}><ClasificacionClientes /></ProtectedRoute>} />
                    <Route path="/coordinacion" element={<ProtectedRoute roles={['telemarketing', 'gerente', 'gerente_cedis', 'admin', 'superadmin']}><CoordinacionPedidos /></ProtectedRoute>} />
                    <Route path="/inventario/traspasos" element={<ProtectedRoute roles={['bodeguero', 'gerente', 'gerente_cedis', 'admin', 'superadmin']}><Traspasos /></ProtectedRoute>} />

                    {/* POS - Cajero y Vendedor */}
                    <Route path="/pos/apertura" element={<ProtectedRoute roles={['admin', 'superadmin', 'cajero', 'vendedor', 'gerente']}><AperturaCaja /></ProtectedRoute>} />

                    <Route path="/pos" element={
                        <ProtectedRoute roles={['admin', 'superadmin', 'cajero', 'gerente']}>
                            <CajaGuard>
                                <POSLayout><POS /></POSLayout>
                            </CajaGuard>
                        </ProtectedRoute>
                    } />

                    <Route path="/pos/preventa" element={
                        <ProtectedRoute roles={['admin', 'superadmin', 'cajero', 'vendedor', 'gerente']}>
                            <CajaGuard>
                                <POSLayout><PreventaPOS /></POSLayout>
                            </CajaGuard>
                        </ProtectedRoute>
                    } />

                    <Route path="/pos/preparacion" element={<ProtectedRoute roles={['admin', 'superadmin', 'cajero', 'gerente']}><POSLayout><PreparacionPedidos /></POSLayout></ProtectedRoute>} />
                    <Route path="/pos/cobro" element={<ProtectedRoute roles={['admin', 'superadmin', 'cajero', 'gerente', 'telemarketing']}><POSLayout><CajaCobro /></POSLayout></ProtectedRoute>} />
                    <Route path="/pos/caja" element={<ProtectedRoute roles={['admin', 'superadmin', 'cajero', 'gerente']}><POSLayout><CorteCaja /></POSLayout></ProtectedRoute>} />

                    {/* Vendedor - Dashboard de Precompras */}
                    <Route path="/vendedor" element={
                        <ProtectedRoute roles={['vendedor', 'admin', 'superadmin', 'gerente']}>
                            <POSLayout><PreventaPOS /></POSLayout>
                        </ProtectedRoute>
                    } />

                    {/* Redirección por defecto */}
                    <Route path="*" element={<Navigate to="/login" />} />
                </Routes>

                <Toaster position="top-right" />
            </BrowserRouter>
        </QueryClientProvider>
    );
}

export default App;


