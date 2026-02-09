import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../context/authStore';
import { useThemeStore } from '../../context/themeStore';
import api from '../../utils/api';
import { ThemeToggle } from '../../components/ui/ThemeToggle';
import {
    ShoppingCart, Package, Truck, ClipboardList,
    LogOut, User, Plus, CheckCircle, Clock, AlertCircle,
    Building2, DollarSign, FileText, AlertTriangle, Search,
    RefreshCw, ArrowRightLeft, Eye, Edit, Trash2,
    Phone, Mail, MapPin, Hash, TrendingUp, BarChart3,
    Bell, Settings, ChevronRight, Zap, Globe
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ComprasPanel() {
    const { user, logout } = useAuthStore();
    const { theme, initTheme } = useThemeStore();
    const isDark = theme === 'dark';

    const [activeTab, setActiveTab] = useState('dashboard');
    const [searchTerm, setSearchTerm] = useState('');
    const [soloStockBajo, setSoloStockBajo] = useState(false);

    // Modal state
    const [showProveedorModal, setShowProveedorModal] = useState(false);
    const [editingProveedor, setEditingProveedor] = useState(null);
    const [proveedorForm, setProveedorForm] = useState({
        nombre: '', rfc: '', telefono: '', email: '', direccion: '', contacto_nombre: ''
    });

    // Inicializar tema al montar
    useEffect(() => {
        initTheme();
    }, []);

    // Queries con React Query
    const { data: stats = {}, isLoading: loadingStats, refetch: refetchStats } = useQuery({
        queryKey: ['compras-stats'],
        queryFn: async () => {
            const res = await api.get('/compras/estadisticas');
            return res.data.data || {};
        },
        refetchInterval: 60000
    });

    const { data: ordenes = [], isLoading: loadingOrdenes, refetch: refetchOrdenes } = useQuery({
        queryKey: ['compras-ordenes'],
        queryFn: async () => {
            const res = await api.get('/compras');
            return res.data.ordenes || res.data || [];
        },
        enabled: activeTab === 'ordenes'
    });

    const { data: proveedores = [], isLoading: loadingProveedores, refetch: refetchProveedores } = useQuery({
        queryKey: ['compras-proveedores'],
        queryFn: async () => {
            const res = await api.get('/proveedores');
            return res.data.proveedores || res.data || [];
        },
        enabled: activeTab === 'proveedores' || activeTab === 'dashboard'
    });

    const { data: facturas = [], isLoading: loadingFacturas } = useQuery({
        queryKey: ['compras-facturas'],
        queryFn: async () => {
            const res = await api.get('/compras/facturas');
            return res.data.data || [];
        },
        enabled: activeTab === 'facturas'
    });

    const { data: traspasos = [], isLoading: loadingTraspasos } = useQuery({
        queryKey: ['compras-traspasos'],
        queryFn: async () => {
            const res = await api.get('/compras/traspasos');
            return res.data.data || [];
        },
        enabled: activeTab === 'traspasos'
    });

    const { data: inventarioData = { data: [], sucursales: [] }, isLoading: loadingInventario, refetch: refetchInventario } = useQuery({
        queryKey: ['compras-inventario', searchTerm, soloStockBajo],
        queryFn: async () => {
            const res = await api.get('/compras/inventario-global', {
                params: { busqueda: searchTerm, solo_bajo_stock: soloStockBajo }
            });
            return { data: res.data.data || [], sucursales: res.data.sucursales || [] };
        },
        enabled: activeTab === 'inventario'
    });

    const cambiarEstado = async (ordenId, nuevoEstado) => {
        try {
            await api.put(`/compras/${ordenId}/estado`, { estado: nuevoEstado });
            toast.success('Estado actualizado');
            refetchOrdenes();
            refetchStats();
        } catch (error) {
            toast.error('Error actualizando estado');
        }
    };

    const handleSaveProveedor = async () => {
        try {
            if (editingProveedor) {
                await api.put(`/proveedores/${editingProveedor.id}`, proveedorForm);
                toast.success('Proveedor actualizado');
            } else {
                await api.post('/proveedores', proveedorForm);
                toast.success('Proveedor creado');
            }
            setShowProveedorModal(false);
            setEditingProveedor(null);
            setProveedorForm({ nombre: '', rfc: '', telefono: '', email: '', direccion: '', contacto_nombre: '' });
            refetchProveedores();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error guardando proveedor');
        }
    };

    const handleDeleteProveedor = async (id) => {
        if (!window.confirm('¿Eliminar este proveedor?')) return;
        try {
            await api.delete(`/proveedores/${id}`);
            toast.success('Proveedor eliminado');
            refetchProveedores();
        } catch (error) {
            toast.error('Error eliminando proveedor');
        }
    };

    const openEditProveedor = (prov) => {
        setEditingProveedor(prov);
        setProveedorForm({
            nombre: prov.nombre || '',
            rfc: prov.rfc || '',
            telefono: prov.telefono || '',
            email: prov.email || '',
            direccion: prov.direccion || '',
            contacto_nombre: prov.contacto_nombre || ''
        });
        setShowProveedorModal(true);
    };

    const getEstadoBadge = (estado) => {
        const estilos = {
            borrador: isDark ? 'bg-slate-600 text-slate-200' : 'bg-gray-200 text-gray-700',
            emitida: 'bg-amber-100 text-amber-800 border border-amber-300',
            enviada: 'bg-blue-100 text-blue-800 border border-blue-300',
            en_transito: 'bg-violet-100 text-violet-800 border border-violet-300',
            recibida: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
            recibida_parcial: 'bg-teal-100 text-teal-800 border border-teal-300',
            cancelada: 'bg-red-100 text-red-800 border border-red-300',
            pendiente: 'bg-amber-100 text-amber-800 border border-amber-300',
            completado: 'bg-emerald-100 text-emerald-800 border border-emerald-300'
        };
        return estilos[estado] || (isDark ? 'bg-slate-600 text-slate-200' : 'bg-gray-200 text-gray-700');
    };

    // Métricas para el dashboard
    const metricas = [
        { label: 'Órdenes Borrador', value: stats.ordenes?.borradores || 0, icon: Clock, color: 'amber' },
        { label: 'En Tránsito', value: stats.ordenes?.en_transito || 0, icon: Truck, color: 'blue' },
        { label: 'Recibidas', value: stats.ordenes?.recibidas || 0, icon: CheckCircle, color: 'emerald' },
        { label: 'Proveedores', value: stats.proveedores?.activos || 0, icon: Building2, color: 'violet' },
        { label: 'Stock Bajo', value: stats.inventario?.productos_bajo_stock || 0, icon: AlertTriangle, color: 'red', isWarning: true },
        { label: 'Total Ordenado', value: `$${((stats.ordenes?.valor_total || 0) / 1000).toFixed(1)}k`, icon: DollarSign, color: 'cyan' }
    ];

    const tabs = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'ordenes', label: 'Órdenes', icon: ClipboardList },
        { id: 'proveedores', label: 'Proveedores', icon: Building2 },
        { id: 'inventario', label: 'Inventario Global', icon: Package },
        { id: 'facturas', label: 'Facturas', icon: FileText },
        { id: 'traspasos', label: 'Traspasos', icon: ArrowRightLeft }
    ];

    // Clases condicionales para tema
    const styles = {
        page: isDark
            ? 'min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white'
            : 'min-h-screen bg-gray-50 text-gray-900',
        header: isDark
            ? 'bg-slate-800/50 border-b border-slate-700'
            : 'bg-gradient-to-r from-orange-500 to-red-600 text-white',
        headerTitle: isDark
            ? 'text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent'
            : 'text-2xl font-bold text-white',
        headerSubtitle: isDark ? 'text-sm text-slate-400' : 'text-sm text-orange-100',
        card: isDark
            ? 'bg-slate-800/50 border border-slate-700 rounded-xl'
            : 'bg-white border border-gray-200 rounded-xl shadow-sm',
        cardHeader: isDark
            ? 'px-4 py-3 border-b border-slate-700'
            : 'px-4 py-3 border-b border-gray-200 bg-gray-50',
        tabContainer: isDark
            ? 'bg-slate-800/50 border border-slate-700 rounded-xl p-1'
            : 'bg-white border border-gray-200 rounded-xl p-1 shadow-sm',
        tabActive: isDark
            ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
            : 'bg-orange-500 text-white shadow-md',
        tabInactive: isDark
            ? 'text-slate-400 hover:text-white hover:bg-slate-700'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
        button: isDark
            ? 'bg-slate-700 hover:bg-slate-600'
            : 'bg-gray-100 hover:bg-gray-200',
        buttonPrimary: 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:opacity-90',
        input: isDark
            ? 'bg-slate-900/50 border border-slate-600 text-white placeholder-slate-500'
            : 'bg-white border border-gray-300 text-gray-900 placeholder-gray-400',
        tableHeader: isDark
            ? 'bg-slate-900/50 text-slate-400'
            : 'bg-gray-50 text-gray-500',
        tableRow: isDark
            ? 'hover:bg-slate-700/30 border-slate-700'
            : 'hover:bg-gray-50 border-gray-200',
        text: isDark ? 'text-white' : 'text-gray-900',
        textMuted: isDark ? 'text-slate-400' : 'text-gray-500',
        textMuted2: isDark ? 'text-slate-500' : 'text-gray-400',
        divider: isDark ? 'divide-slate-700' : 'divide-gray-200',
        modal: isDark
            ? 'bg-slate-800 border border-slate-700'
            : 'bg-white border border-gray-200',
        modalOverlay: isDark ? 'bg-black/70' : 'bg-black/50'
    };

    return (
        <div className={styles.page}>
            {/* Header */}
            <div className={`${styles.header} px-6 py-4`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                            <ShoppingCart className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className={styles.headerTitle}>
                                Panel de Compras
                            </h1>
                            <p className={styles.headerSubtitle}>
                                {user?.nombre} • Acceso Global a Todas las Sucursales
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Theme Toggle */}
                        <ThemeToggle />

                        <button className={`relative p-2 rounded-lg transition-colors ${styles.button} ${isDark ? 'text-white' : 'text-gray-700'}`}>
                            <Bell className="w-5 h-5" />
                            {(stats.inventario?.productos_bajo_stock || 0) > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white">
                                    {stats.inventario?.productos_bajo_stock}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => refetchStats()}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${styles.button} ${isDark ? 'text-white' : 'text-gray-700'}`}
                        >
                            <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
                            Actualizar
                        </button>
                        <button
                            onClick={logout}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${isDark ? 'bg-red-600/20 hover:bg-red-600/40 text-red-400' : 'bg-white/20 hover:bg-white/30 text-white'}`}
                        >
                            <LogOut className="w-4 h-4" />
                            Salir
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid Principal */}
            <div className="p-6 space-y-6">
                {/* Tabs */}
                <div className={`flex gap-2 overflow-x-auto ${styles.tabContainer}`}>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-shrink-0 py-2.5 px-4 rounded-lg font-medium flex items-center gap-2 transition-all text-sm
                                ${activeTab === tab.id ? styles.tabActive : styles.tabInactive}`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ======================= DASHBOARD TAB ======================= */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        {/* KPIs */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {metricas.map((m, i) => (
                                <div key={i} className={`${styles.card} p-4`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <div className={`w-10 h-10 rounded-lg bg-${m.color}-500/20 flex items-center justify-center`}>
                                            <m.icon className={`w-5 h-5 text-${m.color}-500`} />
                                        </div>
                                        {m.isWarning && (stats.inventario?.productos_bajo_stock || 0) > 0 && (
                                            <span className="animate-pulse text-amber-500">⚠️</span>
                                        )}
                                    </div>
                                    <p className={`text-2xl font-bold ${styles.text}`}>{m.value}</p>
                                    <p className={`text-sm ${styles.textMuted}`}>{m.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Accesos Rápidos */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <button
                                onClick={() => setActiveTab('ordenes')}
                                className={`${styles.card} p-6 hover:border-orange-500 transition-all flex items-center gap-4 text-left`}
                            >
                                <div className="w-14 h-14 bg-orange-500/20 rounded-xl flex items-center justify-center">
                                    <Plus className="w-7 h-7 text-orange-500" />
                                </div>
                                <div>
                                    <p className={`font-semibold ${styles.text}`}>Nueva Orden de Compra</p>
                                    <p className={`text-sm ${styles.textMuted}`}>Crear pedido a proveedor</p>
                                </div>
                                <ChevronRight className={`w-5 h-5 ${styles.textMuted2} ml-auto`} />
                            </button>

                            <button
                                onClick={() => { setSoloStockBajo(true); setActiveTab('inventario'); }}
                                className={`${styles.card} p-6 hover:border-red-500 transition-all flex items-center gap-4 text-left`}
                            >
                                <div className="w-14 h-14 bg-red-500/20 rounded-xl flex items-center justify-center">
                                    <AlertTriangle className="w-7 h-7 text-red-500" />
                                </div>
                                <div>
                                    <p className={`font-semibold ${styles.text}`}>Ver Faltantes</p>
                                    <p className={`text-sm ${styles.textMuted}`}>{stats.inventario?.productos_bajo_stock || 0} productos bajo stock</p>
                                </div>
                                <ChevronRight className={`w-5 h-5 ${styles.textMuted2} ml-auto`} />
                            </button>

                            <button
                                onClick={() => setActiveTab('traspasos')}
                                className={`${styles.card} p-6 hover:border-blue-500 transition-all flex items-center gap-4 text-left`}
                            >
                                <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                    <ArrowRightLeft className="w-7 h-7 text-blue-500" />
                                </div>
                                <div>
                                    <p className={`font-semibold ${styles.text}`}>Traspasos Activos</p>
                                    <p className={`text-sm ${styles.textMuted}`}>{stats.traspasos?.pendientes || 0} pendientes</p>
                                </div>
                                <ChevronRight className={`w-5 h-5 ${styles.textMuted2} ml-auto`} />
                            </button>
                        </div>

                        {/* Resumen Facturas */}
                        <div className={styles.card}>
                            <div className={`${styles.cardHeader} flex items-center gap-3`}>
                                <FileText className="w-5 h-5 text-orange-500" />
                                <span className={`font-medium ${styles.text}`}>Resumen de Facturas (30 días)</span>
                            </div>
                            <div className="p-4 grid grid-cols-3 gap-4">
                                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-bold text-blue-600">{stats.facturas?.importadas || 0}</p>
                                    <p className={`text-sm ${styles.textMuted}`}>Importadas</p>
                                </div>
                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-bold text-amber-600">{stats.facturas?.por_pagar || 0}</p>
                                    <p className={`text-sm ${styles.textMuted}`}>Por Pagar</p>
                                </div>
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-center">
                                    <p className="text-2xl font-bold text-emerald-600">{stats.facturas?.pagadas || 0}</p>
                                    <p className={`text-sm ${styles.textMuted}`}>Pagadas</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ======================= ORDENES TAB ======================= */}
                {activeTab === 'ordenes' && (
                    <div className={styles.card}>
                        <div className={`${styles.cardHeader} flex items-center justify-between`}>
                            <div className="flex items-center gap-3">
                                <ClipboardList className="w-5 h-5 text-orange-500" />
                                <span className={`font-medium ${styles.text}`}>Órdenes de Compra</span>
                            </div>
                            <button className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${styles.buttonPrimary}`}>
                                <Plus className="w-4 h-4" />
                                Nueva Orden
                            </button>
                        </div>
                        <div className={`divide-y ${styles.divider}`}>
                            {loadingOrdenes ? (
                                <div className={`p-8 text-center ${styles.textMuted}`}>Cargando...</div>
                            ) : ordenes.length === 0 ? (
                                <div className={`p-8 text-center ${styles.textMuted}`}>No hay órdenes de compra</div>
                            ) : (
                                ordenes.map(orden => (
                                    <div key={orden.id} className={`p-4 flex items-center justify-between transition-colors ${styles.tableRow}`}>
                                        <div>
                                            <p className={`font-medium ${styles.text}`}>
                                                Orden #{orden.id} - {orden.proveedor_nombre || 'Sin proveedor'}
                                            </p>
                                            <p className={`text-sm ${styles.textMuted}`}>
                                                {new Date(orden.created_at).toLocaleDateString()} •
                                                Total: ${parseFloat(orden.total_estimado || 0).toFixed(2)}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoBadge(orden.estado)}`}>
                                                {orden.estado}
                                            </span>
                                            {orden.estado === 'borrador' && (
                                                <button onClick={() => cambiarEstado(orden.id, 'emitida')} className="px-3 py-1 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600">
                                                    Emitir
                                                </button>
                                            )}
                                            {orden.estado === 'emitida' && (
                                                <button onClick={() => cambiarEstado(orden.id, 'enviada')} className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                                                    Marcar Enviada
                                                </button>
                                            )}
                                            {orden.estado === 'enviada' && (
                                                <button onClick={() => cambiarEstado(orden.id, 'recibida')} className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600">
                                                    Recibida
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* ======================= PROVEEDORES TAB ======================= */}
                {activeTab === 'proveedores' && (
                    <div className={styles.card}>
                        <div className={`${styles.cardHeader} flex items-center justify-between`}>
                            <div className="flex items-center gap-3">
                                <Building2 className="w-5 h-5 text-orange-500" />
                                <span className={`font-medium ${styles.text}`}>Proveedores ({proveedores.length})</span>
                            </div>
                            <button
                                onClick={() => { setEditingProveedor(null); setProveedorForm({ nombre: '', rfc: '', telefono: '', email: '', direccion: '', contacto_nombre: '' }); setShowProveedorModal(true); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${styles.buttonPrimary}`}
                            >
                                <Plus className="w-4 h-4" />
                                Nuevo Proveedor
                            </button>
                        </div>
                        {loadingProveedores ? (
                            <div className={`p-8 text-center ${styles.textMuted}`}>Cargando...</div>
                        ) : proveedores.length === 0 ? (
                            <div className="p-8 text-center">
                                <Building2 className={`w-12 h-12 mx-auto ${styles.textMuted2} mb-3`} />
                                <p className={styles.textMuted}>No hay proveedores registrados</p>
                                <p className={`text-sm ${styles.textMuted2} mt-2`}>Los proveedores se crean automáticamente al importar facturas</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className={`text-xs uppercase ${styles.tableHeader}`}>
                                        <tr>
                                            <th className="px-4 py-3 text-left">Nombre</th>
                                            <th className="px-4 py-3 text-left">RFC</th>
                                            <th className="px-4 py-3 text-left">Contacto</th>
                                            <th className="px-4 py-3 text-left">Teléfono</th>
                                            <th className="px-4 py-3 text-left">Email</th>
                                            <th className="px-4 py-3 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${styles.divider}`}>
                                        {proveedores.map(prov => (
                                            <tr key={prov.id} className={`transition-colors ${styles.tableRow}`}>
                                                <td className={`px-4 py-3 font-medium ${styles.text}`}>{prov.nombre}</td>
                                                <td className={`px-4 py-3 font-mono text-xs ${styles.textMuted}`}>{prov.rfc || '-'}</td>
                                                <td className={`px-4 py-3 ${styles.textMuted}`}>{prov.contacto_nombre || '-'}</td>
                                                <td className={`px-4 py-3 ${styles.textMuted}`}>{prov.telefono || '-'}</td>
                                                <td className={`px-4 py-3 ${styles.textMuted}`}>{prov.email || '-'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <button onClick={() => openEditProveedor(prov)} className={`p-2 rounded-lg transition-colors ${styles.button}`}>
                                                        <Edit className={`w-4 h-4 ${styles.textMuted}`} />
                                                    </button>
                                                    <button onClick={() => handleDeleteProveedor(prov.id)} className="p-2 hover:bg-red-500/20 rounded-lg transition-colors">
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ======================= INVENTARIO GLOBAL TAB ======================= */}
                {activeTab === 'inventario' && (
                    <div className={styles.card}>
                        <div className={`${styles.cardHeader} flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
                            <div className="flex items-center gap-3">
                                <Package className="w-5 h-5 text-orange-500" />
                                <span className={`font-medium ${styles.text}`}>Inventario Global - Todas las Sucursales</span>
                            </div>
                            <div className="flex gap-3 items-center">
                                <div className="relative">
                                    <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${styles.textMuted2}`} />
                                    <input
                                        type="text"
                                        placeholder="Buscar producto..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && refetchInventario()}
                                        className={`pl-10 pr-4 py-2 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-orange-500 ${styles.input}`}
                                    />
                                </div>
                                <label className={`flex items-center gap-2 text-sm cursor-pointer ${styles.textMuted}`}>
                                    <input
                                        type="checkbox"
                                        checked={soloStockBajo}
                                        onChange={(e) => setSoloStockBajo(e.target.checked)}
                                        className="rounded text-orange-500 focus:ring-orange-500"
                                    />
                                    Solo stock bajo
                                </label>
                                <button onClick={() => refetchInventario()} className={`p-2 rounded-lg transition-colors ${styles.button}`}>
                                    <RefreshCw className={`w-4 h-4 ${loadingInventario ? 'animate-spin' : ''} ${isDark ? 'text-white' : 'text-gray-700'}`} />
                                </button>
                            </div>
                        </div>
                        {loadingInventario ? (
                            <div className={`p-8 text-center ${styles.textMuted}`}>Cargando inventario...</div>
                        ) : inventarioData.data.length === 0 ? (
                            <div className={`p-8 text-center ${styles.textMuted}`}>No hay productos</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className={`text-xs uppercase sticky top-0 ${styles.tableHeader}`}>
                                        <tr>
                                            <th className="px-3 py-3 text-left">SKU</th>
                                            <th className="px-3 py-3 text-left">Producto</th>
                                            {inventarioData.sucursales.slice(0, 5).map(s => (
                                                <th key={s.id} className="px-3 py-3 text-center">{s.nombre}</th>
                                            ))}
                                            <th className="px-3 py-3 text-center bg-emerald-500/10 text-emerald-600 font-bold">TOTAL</th>
                                            <th className="px-3 py-3 text-center">Mínimo</th>
                                            <th className="px-3 py-3 text-center">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${styles.divider}`}>
                                        {inventarioData.data.map(prod => {
                                            const esBajoStock = prod.stock_total < prod.punto_reorden;
                                            return (
                                                <tr key={prod.id} className={`transition-colors ${styles.tableRow} ${esBajoStock ? 'bg-red-50 dark:bg-red-500/5' : ''}`}>
                                                    <td className={`px-3 py-2 font-mono text-xs ${styles.textMuted}`}>{prod.sku}</td>
                                                    <td className={`px-3 py-2 font-medium ${styles.text}`}>{prod.nombre}</td>
                                                    {inventarioData.sucursales.slice(0, 5).map(s => (
                                                        <td key={s.id} className={`px-3 py-2 text-center ${styles.text}`}>
                                                            {prod.stock_por_sucursal?.[s.nombre] || 0}
                                                        </td>
                                                    ))}
                                                    <td className="px-3 py-2 text-center font-bold text-emerald-600 bg-emerald-500/10">
                                                        {prod.stock_total}
                                                    </td>
                                                    <td className={`px-3 py-2 text-center ${styles.textMuted2}`}>{prod.punto_reorden}</td>
                                                    <td className="px-3 py-2 text-center">
                                                        {esBajoStock ? (
                                                            <span className="px-2 py-1 bg-red-100 text-red-700 border border-red-300 rounded-full text-xs font-medium">
                                                                ⚠️ Bajo
                                                            </span>
                                                        ) : (
                                                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full text-xs font-medium">
                                                                ✓ OK
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ======================= FACTURAS TAB ======================= */}
                {activeTab === 'facturas' && (
                    <div className={styles.card}>
                        <div className={`${styles.cardHeader} flex items-center gap-3`}>
                            <FileText className="w-5 h-5 text-orange-500" />
                            <span className={`font-medium ${styles.text}`}>Facturas Importadas</span>
                        </div>
                        {loadingFacturas ? (
                            <div className={`p-8 text-center ${styles.textMuted}`}>Cargando...</div>
                        ) : facturas.length === 0 ? (
                            <div className="p-8 text-center">
                                <FileText className={`w-12 h-12 mx-auto ${styles.textMuted2} mb-3`} />
                                <p className={styles.textMuted}>No hay facturas importadas</p>
                                <p className={`text-sm ${styles.textMuted2} mt-2`}>Importa facturas desde el panel de SuperAdmin</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className={`text-xs uppercase ${styles.tableHeader}`}>
                                        <tr>
                                            <th className="px-4 py-3 text-left">No. Factura</th>
                                            <th className="px-4 py-3 text-left">Proveedor</th>
                                            <th className="px-4 py-3 text-left">Fecha</th>
                                            <th className="px-4 py-3 text-right">Total</th>
                                            <th className="px-4 py-3 text-center">Estado</th>
                                            <th className="px-4 py-3 text-left">Importado por</th>
                                        </tr>
                                    </thead>
                                    <tbody className={`divide-y ${styles.divider}`}>
                                        {facturas.map(fac => (
                                            <tr key={fac.id} className={`transition-colors ${styles.tableRow}`}>
                                                <td className={`px-4 py-3 font-mono ${styles.text}`}>{fac.numero_factura || '-'}</td>
                                                <td className={`px-4 py-3 ${styles.text}`}>{fac.proveedor_nombre || 'Desconocido'}</td>
                                                <td className={`px-4 py-3 ${styles.textMuted}`}>{fac.fecha_emision ? new Date(fac.fecha_emision).toLocaleDateString() : '-'}</td>
                                                <td className="px-4 py-3 text-right font-medium text-emerald-600">${parseFloat(fac.total || 0).toFixed(2)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoBadge(fac.estado)}`}>
                                                        {fac.estado || 'procesada'}
                                                    </span>
                                                </td>
                                                <td className={`px-4 py-3 ${styles.textMuted2}`}>{fac.importado_por_nombre || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* ======================= TRASPASOS TAB ======================= */}
                {activeTab === 'traspasos' && (
                    <div className={styles.card}>
                        <div className={`${styles.cardHeader} flex items-center gap-3`}>
                            <ArrowRightLeft className="w-5 h-5 text-orange-500" />
                            <span className={`font-medium ${styles.text}`}>Traspasos en Tiempo Real</span>
                        </div>
                        {loadingTraspasos ? (
                            <div className={`p-8 text-center ${styles.textMuted}`}>Cargando...</div>
                        ) : traspasos.length === 0 ? (
                            <div className="p-8 text-center">
                                <ArrowRightLeft className={`w-12 h-12 mx-auto ${styles.textMuted2} mb-3`} />
                                <p className={styles.textMuted}>No hay traspasos recientes</p>
                            </div>
                        ) : (
                            <div className={`divide-y ${styles.divider}`}>
                                {traspasos.map(t => (
                                    <div key={t.id} className={`p-4 flex items-center justify-between transition-colors ${styles.tableRow}`}>
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                                                <ArrowRightLeft className="w-6 h-6 text-blue-500" />
                                            </div>
                                            <div>
                                                <p className={`font-medium ${styles.text}`}>
                                                    {t.sucursal_origen_nombre} → {t.sucursal_destino_nombre}
                                                </p>
                                                <p className={`text-sm ${styles.textMuted}`}>
                                                    {new Date(t.created_at).toLocaleDateString()} • {t.solicitado_por_nombre || 'Sistema'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoBadge(t.estado)}`}>
                                            {t.estado}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ======================= MODAL PROVEEDOR ======================= */}
            {showProveedorModal && (
                <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 ${styles.modalOverlay}`}>
                    <div className={`${styles.modal} rounded-2xl shadow-2xl w-full max-w-md`}>
                        <div className={`px-6 py-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                            <h3 className={`text-lg font-bold ${styles.text}`}>
                                {editingProveedor ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${styles.text}`}>Nombre *</label>
                                <input
                                    type="text"
                                    value={proveedorForm.nombre}
                                    onChange={(e) => setProveedorForm({ ...proveedorForm, nombre: e.target.value })}
                                    className={`w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${styles.input}`}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${styles.text}`}>RFC</label>
                                    <input
                                        type="text"
                                        value={proveedorForm.rfc}
                                        onChange={(e) => setProveedorForm({ ...proveedorForm, rfc: e.target.value })}
                                        className={`w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${styles.input}`}
                                    />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1 ${styles.text}`}>Teléfono</label>
                                    <input
                                        type="text"
                                        value={proveedorForm.telefono}
                                        onChange={(e) => setProveedorForm({ ...proveedorForm, telefono: e.target.value })}
                                        className={`w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${styles.input}`}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${styles.text}`}>Email</label>
                                <input
                                    type="email"
                                    value={proveedorForm.email}
                                    onChange={(e) => setProveedorForm({ ...proveedorForm, email: e.target.value })}
                                    className={`w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${styles.input}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${styles.text}`}>Contacto</label>
                                <input
                                    type="text"
                                    value={proveedorForm.contacto_nombre}
                                    onChange={(e) => setProveedorForm({ ...proveedorForm, contacto_nombre: e.target.value })}
                                    className={`w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${styles.input}`}
                                />
                            </div>
                            <div>
                                <label className={`block text-sm font-medium mb-1 ${styles.text}`}>Dirección</label>
                                <input
                                    type="text"
                                    value={proveedorForm.direccion}
                                    onChange={(e) => setProveedorForm({ ...proveedorForm, direccion: e.target.value })}
                                    className={`w-full rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 ${styles.input}`}
                                />
                            </div>
                        </div>
                        <div className={`flex justify-end gap-3 px-6 py-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                            <button
                                onClick={() => setShowProveedorModal(false)}
                                className={`px-4 py-2 rounded-lg transition-colors ${styles.button} ${isDark ? 'text-slate-300' : 'text-gray-700'}`}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveProveedor}
                                className={`px-4 py-2 rounded-lg font-medium ${styles.buttonPrimary}`}
                            >
                                {editingProveedor ? 'Guardar Cambios' : 'Crear Proveedor'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
