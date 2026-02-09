import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Building2, PackageCheck, Map, AlertTriangle, TrendingUp, Clock, Package, MapPin, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Loading } from '../../components/ui/Loading';
import { ThemeToggle } from '../../components/ui/ThemeToggle';

export default function CedisDashboard() {
    const navigate = useNavigate();
    const [kpis, setKpis] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchKPIs();
    }, []);

    const fetchKPIs = async () => {
        try {
            const res = await api.get('/cedis/kpis');
            setKpis(res.data);
        } catch (error) {
            console.error('Error fetching KPIs', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loading />;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Panel de Gerente CEDIS</h1>
                <div className="flex items-center gap-4">
                    <ThemeToggle />
                    <div className="text-sm text-gray-500">
                        {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* KPIs Cards */}
            {kpis && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
                    {/* Órdenes Pendientes */}
                    <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <Package className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{kpis.ordenesPendientes}</p>
                            <p className="text-xs text-gray-500">Órdenes Pendientes</p>
                        </div>
                    </div>

                    {/* Recepciones del Mes */}
                    <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{kpis.recepcionesMes}</p>
                            <p className="text-xs text-gray-500">Recepciones (Mes)</p>
                            <p className="text-xs text-green-600">{kpis.unidadesRecibidasMes} unidades</p>
                        </div>
                    </div>

                    {/* Productos por Caducar */}
                    <div className={`bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4 ${kpis.productosPorCaducar > 0 ? 'border-l-4 border-l-amber-500' : ''}`}>
                        <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                            <Clock className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{kpis.productosPorCaducar}</p>
                            <p className="text-xs text-gray-500">Por Caducar (30 días)</p>
                            {kpis.unidadesPorCaducar > 0 && (
                                <p className="text-xs text-amber-600">{kpis.unidadesPorCaducar} unidades</p>
                            )}
                        </div>
                    </div>

                    {/* Stock Bajo */}
                    <div className={`bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4 ${kpis.stockBajo > 5 ? 'border-l-4 border-l-red-500' : ''}`}>
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{kpis.stockBajo}</p>
                            <p className="text-xs text-gray-500">Stock Bajo</p>
                        </div>
                    </div>

                    {/* Ubicaciones */}
                    <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                            <MapPin className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-800">{kpis.ubicacionesOcupadas}/{kpis.ubicacionesTotal}</p>
                            <p className="text-xs text-gray-500">Ubicaciones Usadas</p>
                            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                <div
                                    className="bg-indigo-600 h-1.5 rounded-full"
                                    style={{ width: `${kpis.ubicacionesTotal > 0 ? (kpis.ubicacionesOcupadas / kpis.ubicacionesTotal) * 100 : 0}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Alertas y Acciones Rápidas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Alertas */}
                <div className="lg:col-span-1">
                    <Card className="h-full">
                        <CardHeader className="bg-gradient-to-r from-red-50 to-amber-50 border-b">
                            <CardTitle className="flex items-center gap-2 text-red-700">
                                <AlertTriangle className="w-5 h-5" /> Alertas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-3">
                            {kpis?.productosCaducados > 0 && (
                                <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                    <div>
                                        <p className="text-sm font-bold text-red-800">¡Productos Caducados!</p>
                                        <p className="text-xs text-red-600">{kpis.productosCaducados} productos requieren atención</p>
                                    </div>
                                </div>
                            )}
                            {kpis?.productosPorCaducar > 0 && (
                                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                                    <div>
                                        <p className="text-sm font-bold text-amber-800">Próximos a Caducar</p>
                                        <p className="text-xs text-amber-600">{kpis.productosPorCaducar} productos en 30 días</p>
                                    </div>
                                </div>
                            )}
                            {kpis?.traspasosPendientes > 0 && (
                                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <Truck className="w-4 h-4 text-blue-500" />
                                    <div>
                                        <p className="text-sm font-bold text-blue-800">Traspasos Pendientes</p>
                                        <p className="text-xs text-blue-600">{kpis.traspasosPendientes} por enviar</p>
                                    </div>
                                </div>
                            )}
                            {(!kpis?.productosCaducados && !kpis?.productosPorCaducar && !kpis?.traspasosPendientes) && (
                                <div className="text-center py-8 text-gray-400">
                                    <p>✓ Sin alertas activas</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Actividad Reciente */}
                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                            <CardTitle className="flex items-center gap-2 text-blue-700">
                                <TrendingUp className="w-5 h-5" /> Actividad Reciente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {kpis?.actividadReciente?.length > 0 ? (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                        <tr>
                                            <th className="p-3 text-left">Fecha</th>
                                            <th className="p-3 text-left">Proveedor</th>
                                            <th className="p-3 text-center">Productos</th>
                                            <th className="p-3 text-center">Unidades</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {kpis.actividadReciente.map((act, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="p-3">
                                                    {new Date(act.fecha_recepcion).toLocaleDateString('es-MX')}
                                                </td>
                                                <td className="p-3 font-medium">{act.proveedor_nombre || 'Sin proveedor'}</td>
                                                <td className="p-3 text-center">{act.productos}</td>
                                                <td className="p-3 text-center font-bold text-blue-600">{act.unidades}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center py-8 text-gray-400">
                                    <p>Sin recepciones recientes</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Acciones Principales */}
            <h2 className="text-lg font-bold text-gray-700 mb-4">Acciones Rápidas</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card
                    className="hover:border-blue-500 cursor-pointer transition-all hover:shadow-lg transform hover:-translate-y-1"
                    onClick={() => navigate('/cedis/recepcion')}
                >
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-blue-700">
                            <PackageCheck className="w-6 h-6" />
                            Recepción de Mercancía
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-500 text-sm">Cotejo de Órdenes de Compra y entrada de stock.</p>
                        {kpis?.ordenesPendientes > 0 && (
                            <div className="mt-2 inline-flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">
                                <span className="font-bold">{kpis.ordenesPendientes}</span> pendientes
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card
                    className="hover:border-indigo-500 cursor-pointer transition-all hover:shadow-lg transform hover:-translate-y-1"
                    onClick={() => navigate('/cedis/ubicaciones')}
                >
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-indigo-700">
                            <Map className="w-6 h-6" />
                            Mapa de Almacén
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-500 text-sm">Gestión de Pasillos, Estantes y Ubicaciones.</p>
                        <div className="mt-2 inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full">
                            {kpis?.ubicacionesOcupadas || 0}/{kpis?.ubicacionesTotal || 0} ubicaciones
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="hover:border-gray-500 cursor-pointer transition-all hover:shadow-lg transform hover:-translate-y-1"
                    onClick={() => navigate('/inventario/traspasos')}
                >
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-gray-700">
                            <Building2 className="w-6 h-6" />
                            Traspasos
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-gray-500 text-sm">Validar envíos a sucursales.</p>
                        {kpis?.traspasosPendientes > 0 && (
                            <div className="mt-2 inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full">
                                <span className="font-bold">{kpis.traspasosPendientes}</span> por enviar
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
