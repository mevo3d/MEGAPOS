import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    Building2, MapPin, Users, TrendingUp, Package, Truck,
    DollarSign, Activity, BarChart3, Settings, Bell,
    RefreshCw, ChevronRight, ArrowUpRight, ArrowDownRight,
    Clock, CheckCircle, AlertTriangle, Eye, Map, Phone,
    ShoppingCart, CreditCard, Target, Zap, Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';
import { ThemeToggle } from '../../../components/ui/ThemeToggle';
import { useThemeStore } from '../../../context/themeStore';

const SuperAdminDashboard = () => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    // Queries para datos del dashboard
    const { data: stats, isLoading: loadingStats, refetch: refetchStats } = useQuery({
        queryKey: ['superadmin-stats'],
        queryFn: async () => {
            // Llamar múltiples endpoints y consolidar
            const [ventasRes, inventarioRes, coordRes, empleadosRes] = await Promise.all([
                api.get('/ventas/resumen?periodo=hoy').catch(() => ({ data: {} })),
                api.get('/inventario/alertas').catch(() => ({ data: [] })),
                api.get('/coordinacion/estadisticas').catch(() => ({ data: {} })),
                api.get('/auth/usuarios').catch(() => ({ data: [] }))
            ]);

            return {
                ventas: ventasRes.data,
                alertasInventario: inventarioRes.data?.length || 0,
                coordinacion: coordRes.data,
                totalEmpleados: empleadosRes.data?.length || 0
            };
        },
        refetchInterval: 60000 // Refrescar cada minuto
    });

    // Query para sucursales
    const { data: sucursales = [] } = useQuery({
        queryKey: ['superadmin-sucursales'],
        queryFn: async () => {
            const { data } = await api.get('/sucursales');
            return data;
        }
    });

    // Query para ruteros en tiempo real
    const { data: ruteros = [] } = useQuery({
        queryKey: ['ruteros-ubicacion'],
        queryFn: async () => {
            const { data } = await api.get('/coordinacion/tracking/ruteros');
            return data;
        },
        refetchInterval: 30000 // Cada 30 segundos
    });

    // Query para zonas de precio
    const { data: zonas = [] } = useQuery({
        queryKey: ['zonas-precio'],
        queryFn: async () => {
            const { data } = await api.get('/admin/zonas-precio');
            return data;
        }
    });

    // Inicializar mapa de cobertura
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;
        if (typeof window.L === 'undefined') return;

        const L = window.L;
        mapInstanceRef.current = L.map(mapRef.current).setView([20.6597, -103.3496], 10);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(mapInstanceRef.current);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Actualizar marcadores de ruteros en mapa
    useEffect(() => {
        if (!mapInstanceRef.current || typeof window.L === 'undefined') return;

        const L = window.L;
        const map = mapInstanceRef.current;

        // Limpiar marcadores anteriores
        map.eachLayer(layer => {
            if (layer instanceof L.Marker || layer instanceof L.Circle) {
                map.removeLayer(layer);
            }
        });

        // Dibujar zonas de cobertura
        zonas.forEach(zona => {
            // Por simplicidad, dibujamos círculos concéntricos desde el centro
            if (zona.distancia_max_km) {
                L.circle([20.6597, -103.3496], {
                    radius: zona.distancia_max_km * 1000,
                    color: getZonaColor(zona.porcentaje_incremento),
                    fillOpacity: 0.1,
                    weight: 2
                }).addTo(map).bindPopup(`
          <b>${zona.nombre}</b><br>
          Incremento: ${zona.porcentaje_incremento}%<br>
          Cargo fijo: $${zona.monto_fijo_extra}
        `);
            }
        });

        // Marcadores de ruteros
        ruteros.forEach(rutero => {
            if (!rutero.lat || !rutero.lng) return;

            const icon = L.divIcon({
                html: `
          <div style="
            background: ${rutero.estado_ubicacion === 'en_ruta' ? '#22c55e' : '#6366f1'};
            width: 36px;
            height: 36px;
            border-radius: 50%;
            border: 3px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">
            <span style="font-size: 18px;">🚚</span>
          </div>
        `,
                iconSize: [36, 36],
                iconAnchor: [18, 18]
            });

            L.marker([rutero.lat, rutero.lng], { icon })
                .addTo(map)
                .bindPopup(`
          <b>${rutero.rutero_nombre}</b><br>
          Estado: ${rutero.estado_ubicacion || 'Inactivo'}<br>
          Pedido: ${rutero.pedido_folio || 'Sin pedido'}<br>
          ${rutero.rutero_telefono ? `📞 ${rutero.rutero_telefono}` : ''}
        `);
        });

        // Marcadores de sucursales
        sucursales.forEach(suc => {
            if (!suc.lat || !suc.lng) return;

            const icon = L.divIcon({
                html: `
          <div style="
            background: #8b5cf6;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            border: 2px solid white;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <span style="font-size: 16px;">🏪</span>
          </div>
        `,
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            L.marker([suc.lat || 20.6597, suc.lng || -103.3496], { icon })
                .addTo(map)
                .bindPopup(`<b>${suc.nombre}</b><br>${suc.direccion || ''}`);
        });

    }, [ruteros, zonas, sucursales]);

    const getZonaColor = (porcentaje) => {
        if (porcentaje <= 0) return '#22c55e';
        if (porcentaje <= 5) return '#84cc16';
        if (porcentaje <= 10) return '#eab308';
        if (porcentaje <= 15) return '#f97316';
        return '#ef4444';
    };

    // Métricas principales
    const metricas = [
        {
            label: 'Ventas Hoy',
            value: `$${((stats?.ventas?.total || 0) / 1000).toFixed(1)}k`,
            change: '+12%',
            isPositive: true,
            icon: DollarSign,
            color: 'emerald'
        },
        {
            label: 'Transacciones',
            value: stats?.ventas?.cantidad || 0,
            change: '+8%',
            isPositive: true,
            icon: ShoppingCart,
            color: 'blue'
        },
        {
            label: 'Entregas Pendientes',
            value: stats?.coordinacion?.estados?.pendiente?.cantidad || 0,
            change: stats?.coordinacion?.estados?.en_ruta?.cantidad || 0,
            sublabel: 'en ruta',
            icon: Truck,
            color: 'violet'
        },
        {
            label: 'Ruteros Activos',
            value: ruteros.filter(r => r.estado_ubicacion === 'en_ruta').length,
            change: `/${ruteros.length} total`,
            icon: Users,
            color: 'cyan'
        },
        {
            label: 'Alertas Stock',
            value: stats?.alertasInventario || 0,
            isWarning: (stats?.alertasInventario || 0) > 5,
            icon: AlertTriangle,
            color: 'amber'
        },
        {
            label: 'Sucursales',
            value: sucursales.filter(s => s.activa).length,
            change: 'activas',
            icon: Building2,
            color: 'purple'
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            {/* Header */}
            <div className="bg-slate-800/50 border-b border-slate-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Globe className="w-7 h-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                                Panel SuperAdmin
                            </h1>
                            <p className="text-sm text-slate-400">Vista ejecutiva del sistema</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Theme Toggle */}
                        <ThemeToggle />

                        <button className="relative p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
                            <Bell className="w-5 h-5" />
                            {(stats?.alertasInventario || 0) > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                                    {stats?.alertasInventario}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => refetchStats()}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
                            Actualizar
                        </button>
                        <Link
                            to="/admin"
                            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors"
                        >
                            <Settings className="w-4 h-4" />
                            Configuración
                        </Link>
                    </div>
                </div>
            </div>

            {/* Grid Principal */}
            <div className="p-6 space-y-6">
                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {metricas.map((m, i) => (
                        <div
                            key={i}
                            className={`bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:border-${m.color}-500/50 transition-colors`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className={`w-10 h-10 rounded-lg bg-${m.color}-500/20 flex items-center justify-center`}>
                                    <m.icon className={`w-5 h-5 text-${m.color}-400`} />
                                </div>
                                {m.isPositive !== undefined && (
                                    <div className={`flex items-center gap-1 text-xs ${m.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                        {m.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                        {m.change}
                                    </div>
                                )}
                                {m.sublabel && (
                                    <span className="text-xs text-slate-400">{m.change} {m.sublabel}</span>
                                )}
                                {m.isWarning && (
                                    <span className="animate-pulse text-amber-400">⚠️</span>
                                )}
                            </div>
                            <p className="text-2xl font-bold">{m.value}</p>
                            <p className="text-sm text-slate-400">{m.label}</p>
                        </div>
                    ))}
                </div>

                {/* Fila: Mapa + Accesos Rápidos */}
                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Mapa de Cobertura */}
                    <div className="lg:col-span-2 bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Map className="w-5 h-5 text-violet-400" />
                                <span className="font-medium">Mapa de Cobertura y GPS</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs">
                                <span className="flex items-center gap-1">
                                    <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
                                    Ruteros en ruta
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="w-3 h-3 rounded-full bg-violet-500"></span>
                                    Sucursales
                                </span>
                            </div>
                        </div>

                        {typeof window !== 'undefined' && typeof window.L !== 'undefined' ? (
                            <div ref={mapRef} className="h-[400px]" />
                        ) : (
                            <div className="h-[400px] flex items-center justify-center bg-slate-900/50">
                                <div className="text-center">
                                    <MapPin className="w-12 h-12 mx-auto text-slate-500 mb-2" />
                                    <p className="text-slate-400">Mapa requiere Leaflet</p>
                                </div>
                            </div>
                        )}

                        {/* Leyenda de zonas */}
                        <div className="px-4 py-3 border-t border-slate-700 flex items-center gap-4 overflow-x-auto">
                            <span className="text-sm text-slate-400">Zonas de precio:</span>
                            {zonas.slice(0, 5).map(zona => (
                                <div key={zona.id} className="flex items-center gap-2">
                                    <div
                                        className="w-4 h-4 rounded-full border-2"
                                        style={{ borderColor: getZonaColor(zona.porcentaje_incremento) }}
                                    />
                                    <span className="text-xs">{zona.nombre} (+{zona.porcentaje_incremento}%)</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Accesos Rápidos */}
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-4">
                        <h3 className="font-medium mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-400" />
                            Accesos Rápidos
                        </h3>

                        <div className="space-y-2">
                            {[
                                { label: 'Coordinación de Pedidos', icon: Package, to: '/coordinacion', badge: stats?.coordinacion?.estados?.pendiente?.cantidad },
                                { label: 'Gestión de Inventario', icon: Package, to: '/cedis' },
                                { label: 'Telemarketing', icon: Phone, to: '/telemarketing' },
                                { label: 'Usuarios del Sistema', icon: Users, to: '/admin', tab: 'usuarios' },
                                { label: 'Gestión de Tiendas', icon: Building2, to: '/admin', tab: 'tiendas' },
                                { label: 'Reportes', icon: BarChart3, to: '/admin', tab: 'reportes' },
                                { label: 'Configuración', icon: Settings, to: '/admin', tab: 'config' }
                            ].map((item, i) => (
                                <Link
                                    key={i}
                                    to={item.to}
                                    className="flex items-center justify-between p-3 bg-slate-700/30 hover:bg-slate-700 rounded-xl transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <item.icon className="w-5 h-5 text-slate-400 group-hover:text-violet-400" />
                                        <span>{item.label}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {item.badge && (
                                            <span className="px-2 py-0.5 bg-violet-600 rounded-full text-xs">{item.badge}</span>
                                        )}
                                        <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Fila: Estado de Sucursales + Ruteros */}
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Estado de Sucursales */}
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-violet-400" />
                                <span className="font-medium">Estado de Sucursales</span>
                            </div>
                            <Link to="/admin" className="text-sm text-violet-400 hover:text-violet-300">
                                Ver todas
                            </Link>
                        </div>

                        <div className="divide-y divide-slate-700">
                            {sucursales.slice(0, 5).map(suc => (
                                <div key={suc.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-700/30">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${suc.activa ? 'bg-green-500' : 'bg-red-500'}`} />
                                        <div>
                                            <p className="font-medium">{suc.nombre}</p>
                                            <p className="text-xs text-slate-400">{suc.tipo}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-medium text-emerald-400">$0</p>
                                        <p className="text-xs text-slate-400">ventas hoy</p>
                                    </div>
                                </div>
                            ))}

                            {sucursales.length === 0 && (
                                <div className="px-4 py-8 text-center text-slate-400">
                                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No hay sucursales registradas</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Ruteros en Tiempo Real */}
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Truck className="w-5 h-5 text-violet-400" />
                                <span className="font-medium">Ruteros en Tiempo Real</span>
                            </div>
                            <span className="text-sm text-slate-400">
                                {ruteros.filter(r => r.estado_ubicacion === 'en_ruta').length} activos
                            </span>
                        </div>

                        <div className="divide-y divide-slate-700 max-h-[300px] overflow-y-auto">
                            {ruteros.map(rutero => (
                                <div key={rutero.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-700/30">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${rutero.estado_ubicacion === 'en_ruta'
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-slate-700 text-slate-400'
                                            }`}>
                                            🚚
                                        </div>
                                        <div>
                                            <p className="font-medium">{rutero.rutero_nombre}</p>
                                            <p className="text-xs text-slate-400">
                                                {rutero.pedido_folio ? `Entregando: ${rutero.pedido_folio}` : 'Sin pedido activo'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded-full text-xs ${rutero.estado_ubicacion === 'en_ruta'
                                            ? 'bg-green-500/20 text-green-400'
                                            : rutero.estado_ubicacion === 'disponible'
                                                ? 'bg-blue-500/20 text-blue-400'
                                                : 'bg-slate-700 text-slate-400'
                                            }`}>
                                            {rutero.estado_ubicacion || 'Inactivo'}
                                        </span>
                                        {rutero.bateria && (
                                            <span className="text-xs text-slate-400">🔋 {rutero.bateria}%</span>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {ruteros.length === 0 && (
                                <div className="px-4 py-8 text-center text-slate-400">
                                    <Truck className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p>No hay ruteros con ubicación activa</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Métricas de Telemarketing */}
                <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <Phone className="w-6 h-6 text-violet-400" />
                            <h2 className="text-xl font-bold">Métricas Telemarketing</h2>
                        </div>
                        <Link to="/telemarketing/estadisticas" className="text-sm text-violet-400 hover:text-violet-300">
                            Ver detalles →
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Llamadas Hoy', value: '0', icon: Phone, color: 'blue' },
                            { label: 'Pedidos Generados', value: stats?.coordinacion?.origenes?.telemarketing || 0, icon: ShoppingCart, color: 'green' },
                            { label: 'Tasa Conversión', value: '0%', icon: Target, color: 'violet' },
                            { label: 'Clientes Contactados', value: '0', icon: Users, color: 'cyan' }
                        ].map((item, i) => (
                            <div key={i} className={`bg-${item.color}-500/10 rounded-xl p-4 border border-${item.color}-500/20`}>
                                <item.icon className={`w-5 h-5 text-${item.color}-400 mb-2`} />
                                <p className="text-2xl font-bold">{item.value}</p>
                                <p className="text-sm text-slate-400">{item.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
