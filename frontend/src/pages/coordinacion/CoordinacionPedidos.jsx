import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Package, MapPin, Clock, User, CheckCircle, XCircle, Truck,
    Phone, Eye, Filter, Search, RefreshCw, AlertTriangle, Navigation,
    ChevronDown, ChevronRight, Calendar, DollarSign, Plus, Send
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import MapaEntregas from './MapaEntregas';

const estadoColors = {
    pendiente: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
    aprobado: { bg: 'bg-blue-100', text: 'text-blue-800', icon: CheckCircle },
    preparando: { bg: 'bg-purple-100', text: 'text-purple-800', icon: Package },
    listo: { bg: 'bg-cyan-100', text: 'text-cyan-800', icon: Package },
    en_ruta: { bg: 'bg-indigo-100', text: 'text-indigo-800', icon: Truck },
    entregado: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
    cancelado: { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle }
};

const prioridadColors = {
    baja: 'bg-gray-100 text-gray-700',
    normal: 'bg-blue-100 text-blue-700',
    alta: 'bg-orange-100 text-orange-700',
    urgente: 'bg-red-100 text-red-700 animate-pulse'
};

const CoordinacionPedidos = () => {
    const queryClient = useQueryClient();
    const [filtros, setFiltros] = useState({
        estado: '',
        origen: '',
        busqueda: ''
    });
    const [vistaActiva, setVistaActiva] = useState('lista'); // 'lista' | 'mapa' | 'kanban'
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
    const [showAsignarModal, setShowAsignarModal] = useState(false);
    const [showNuevoPedidoModal, setShowNuevoPedidoModal] = useState(false);

    // Query para pedidos
    const { data: pedidos = [], isLoading, refetch } = useQuery({
        queryKey: ['coordinacion-pedidos', filtros],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (filtros.estado) params.append('estado', filtros.estado);
            if (filtros.origen) params.append('origen', filtros.origen);
            const { data } = await api.get(`/coordinacion/pedidos?${params}`);
            return data;
        },
        refetchInterval: 30000 // Refrescar cada 30 segundos
    });

    // Query para estadísticas
    const { data: stats } = useQuery({
        queryKey: ['coordinacion-stats'],
        queryFn: async () => {
            const { data } = await api.get('/coordinacion/estadisticas');
            return data;
        }
    });

    // Query para ruteros disponibles
    const { data: ruteros = [] } = useQuery({
        queryKey: ['ruteros-disponibles'],
        queryFn: async () => {
            const { data } = await api.get('/coordinacion/ruteros/disponibles');
            return data;
        }
    });

    // Mutaciones
    const aprobarPedido = useMutation({
        mutationFn: (id) => api.put(`/coordinacion/pedidos/${id}/aprobar`),
        onSuccess: () => {
            toast.success('Pedido aprobado');
            queryClient.invalidateQueries(['coordinacion-pedidos']);
        },
        onError: (err) => toast.error(err.response?.data?.error || 'Error al aprobar')
    });

    const rechazarPedido = useMutation({
        mutationFn: ({ id, motivo }) => api.put(`/coordinacion/pedidos/${id}/rechazar`, { motivo }),
        onSuccess: () => {
            toast.success('Pedido rechazado');
            queryClient.invalidateQueries(['coordinacion-pedidos']);
        }
    });

    const asignarRutero = useMutation({
        mutationFn: ({ pedidoId, rutero_id, ruta_id, fecha_entrega_estimada }) =>
            api.put(`/coordinacion/pedidos/${pedidoId}/asignar-rutero`, { rutero_id, ruta_id, fecha_entrega_estimada }),
        onSuccess: () => {
            toast.success('Rutero asignado');
            setShowAsignarModal(false);
            queryClient.invalidateQueries(['coordinacion-pedidos']);
        }
    });

    // Filtrar pedidos por búsqueda local
    const pedidosFiltrados = pedidos.filter(p => {
        if (!filtros.busqueda) return true;
        const busqueda = filtros.busqueda.toLowerCase();
        return (
            p.folio?.toLowerCase().includes(busqueda) ||
            p.cliente_nombre?.toLowerCase().includes(busqueda) ||
            p.direccion_entrega?.toLowerCase().includes(busqueda)
        );
    });

    // Agrupar por estado para Kanban
    const pedidosPorEstado = {
        pendiente: pedidosFiltrados.filter(p => p.estado === 'pendiente'),
        aprobado: pedidosFiltrados.filter(p => p.estado === 'aprobado'),
        preparando: pedidosFiltrados.filter(p => p.estado === 'preparando'),
        en_ruta: pedidosFiltrados.filter(p => p.estado === 'en_ruta'),
        entregado: pedidosFiltrados.filter(p => p.estado === 'entregado')
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
            {/* Header */}
            <div className="bg-slate-800/50 border-b border-slate-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <Package className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                                Coordinación de Pedidos
                            </h1>
                            <p className="text-sm text-slate-400">Gestión y asignación de entregas</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowNuevoPedidoModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg hover:opacity-90 transition-all"
                        >
                            <Plus className="w-5 h-5" />
                            <span>Nuevo Pedido</span>
                        </button>
                        <button
                            onClick={() => refetch()}
                            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                        >
                            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* KPIs */}
            <div className="px-6 py-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {[
                        { label: 'Pendientes', value: stats?.estados?.pendiente?.cantidad || 0, color: 'yellow', icon: Clock },
                        { label: 'Aprobados', value: stats?.estados?.aprobado?.cantidad || 0, color: 'blue', icon: CheckCircle },
                        { label: 'En Preparación', value: stats?.estados?.preparando?.cantidad || 0, color: 'purple', icon: Package },
                        { label: 'En Ruta', value: stats?.estados?.en_ruta?.cantidad || 0, color: 'indigo', icon: Truck },
                        { label: 'Entregados Hoy', value: stats?.estados?.entregado?.cantidad || 0, color: 'green', icon: CheckCircle },
                        { label: 'Monto Total', value: `$${((stats?.estados?.entregado?.monto || 0) / 1000).toFixed(1)}k`, color: 'emerald', icon: DollarSign }
                    ].map((kpi, i) => (
                        <div key={i} className={`bg-${kpi.color}-500/10 border border-${kpi.color}-500/20 rounded-xl p-4`}>
                            <div className="flex items-center justify-between">
                                <kpi.icon className={`w-5 h-5 text-${kpi.color}-400`} />
                                <span className="text-2xl font-bold">{kpi.value}</span>
                            </div>
                            <p className="text-sm text-slate-400 mt-1">{kpi.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Barra de filtros y vista */}
            <div className="px-6 py-3 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    {/* Búsqueda */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar folio, cliente..."
                            value={filtros.busqueda}
                            onChange={(e) => setFiltros(f => ({ ...f, busqueda: e.target.value }))}
                            className="pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent w-64"
                        />
                    </div>

                    {/* Filtro estado */}
                    <select
                        value={filtros.estado}
                        onChange={(e) => setFiltros(f => ({ ...f, estado: e.target.value }))}
                        className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500"
                    >
                        <option value="">Todos los estados</option>
                        <option value="pendiente">Pendientes</option>
                        <option value="aprobado">Aprobados</option>
                        <option value="preparando">En Preparación</option>
                        <option value="en_ruta">En Ruta</option>
                        <option value="entregado">Entregados</option>
                        <option value="cancelado">Cancelados</option>
                    </select>

                    {/* Filtro origen */}
                    <select
                        value={filtros.origen}
                        onChange={(e) => setFiltros(f => ({ ...f, origen: e.target.value }))}
                        className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg focus:ring-2 focus:ring-violet-500"
                    >
                        <option value="">Todos los orígenes</option>
                        <option value="telemarketing">Telemarketing</option>
                        <option value="sucursal">Sucursal</option>
                        <option value="ecommerce">E-commerce</option>
                        <option value="rutero">Rutero</option>
                    </select>
                </div>

                {/* Selector de vista */}
                <div className="flex items-center bg-slate-700/50 rounded-lg p-1">
                    {['lista', 'kanban', 'mapa'].map(vista => (
                        <button
                            key={vista}
                            onClick={() => setVistaActiva(vista)}
                            className={`px-4 py-2 rounded-lg capitalize transition-all ${vistaActiva === vista
                                    ? 'bg-violet-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            {vista === 'mapa' && <MapPin className="w-4 h-4 inline mr-2" />}
                            {vista}
                        </button>
                    ))}
                </div>
            </div>

            {/* Contenido principal */}
            <div className="px-6 pb-6">
                {vistaActiva === 'lista' && (
                    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-slate-700/50">
                                <tr>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Folio</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Cliente</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Dirección</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Estado</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Prioridad</th>
                                    <th className="text-left px-4 py-3 text-sm font-medium text-slate-300">Rutero</th>
                                    <th className="text-right px-4 py-3 text-sm font-medium text-slate-300">Total</th>
                                    <th className="text-center px-4 py-3 text-sm font-medium text-slate-300">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pedidosFiltrados.map(pedido => {
                                    const estadoConfig = estadoColors[pedido.estado] || estadoColors.pendiente;
                                    const EstadoIcon = estadoConfig.icon;

                                    return (
                                        <tr key={pedido.id} className="border-t border-slate-700 hover:bg-slate-700/30">
                                            <td className="px-4 py-3">
                                                <span className="font-mono text-violet-400">{pedido.folio}</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium">{pedido.cliente_nombre || 'Sin cliente'}</p>
                                                    <p className="text-xs text-slate-400">{pedido.telefono_entrega}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 max-w-xs truncate text-sm text-slate-300">
                                                {pedido.direccion_entrega || '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${estadoConfig.bg} ${estadoConfig.text}`}>
                                                    <EstadoIcon className="w-3 h-3" />
                                                    {pedido.estado}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded text-xs font-medium ${prioridadColors[pedido.prioridad]}`}>
                                                    {pedido.prioridad}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {pedido.rutero_nombre || (
                                                    <span className="text-slate-500">Sin asignar</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">
                                                ${parseFloat(pedido.total).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setPedidoSeleccionado(pedido)}
                                                        className="p-1.5 bg-slate-600 hover:bg-slate-500 rounded-lg transition-colors"
                                                        title="Ver detalles"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>

                                                    {pedido.estado === 'pendiente' && (
                                                        <>
                                                            <button
                                                                onClick={() => aprobarPedido.mutate(pedido.id)}
                                                                className="p-1.5 bg-green-600 hover:bg-green-500 rounded-lg transition-colors"
                                                                title="Aprobar"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const motivo = prompt('Motivo del rechazo:');
                                                                    if (motivo) rechazarPedido.mutate({ id: pedido.id, motivo });
                                                                }}
                                                                className="p-1.5 bg-red-600 hover:bg-red-500 rounded-lg transition-colors"
                                                                title="Rechazar"
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    )}

                                                    {pedido.estado === 'aprobado' && (
                                                        <button
                                                            onClick={() => {
                                                                setPedidoSeleccionado(pedido);
                                                                setShowAsignarModal(true);
                                                            }}
                                                            className="p-1.5 bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors"
                                                            title="Asignar rutero"
                                                        >
                                                            <Truck className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}

                                {pedidosFiltrados.length === 0 && (
                                    <tr>
                                        <td colSpan="8" className="px-4 py-12 text-center text-slate-400">
                                            <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                            <p>No hay pedidos que mostrar</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {vistaActiva === 'kanban' && (
                    <div className="grid grid-cols-5 gap-4 overflow-x-auto">
                        {Object.entries(pedidosPorEstado).map(([estado, pedidosEstado]) => {
                            const config = estadoColors[estado];
                            return (
                                <div key={estado} className="bg-slate-800/50 rounded-xl border border-slate-700 min-w-[280px]">
                                    <div className={`px-4 py-3 border-b border-slate-700 ${config.bg} ${config.text} rounded-t-xl`}>
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium capitalize">{estado.replace('_', ' ')}</span>
                                            <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                                                {pedidosEstado.length}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-3 space-y-3 max-h-[60vh] overflow-y-auto">
                                        {pedidosEstado.map(pedido => (
                                            <div
                                                key={pedido.id}
                                                onClick={() => setPedidoSeleccionado(pedido)}
                                                className={`bg-slate-700/50 border border-slate-600 rounded-lg p-3 cursor-pointer hover:border-violet-500 transition-colors ${pedido.prioridad === 'urgente' ? 'ring-2 ring-red-500/50' : ''
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-mono text-sm text-violet-400">{pedido.folio}</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-xs ${prioridadColors[pedido.prioridad]}`}>
                                                        {pedido.prioridad}
                                                    </span>
                                                </div>
                                                <p className="font-medium text-sm truncate">{pedido.cliente_nombre || 'Sin cliente'}</p>
                                                <p className="text-xs text-slate-400 truncate mt-1">
                                                    <MapPin className="w-3 h-3 inline mr-1" />
                                                    {pedido.direccion_entrega || 'Sin dirección'}
                                                </p>
                                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-600">
                                                    <span className="text-xs text-slate-400">
                                                        {pedido.rutero_nombre || 'Sin rutero'}
                                                    </span>
                                                    <span className="font-medium text-emerald-400">
                                                        ${parseFloat(pedido.total).toFixed(0)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}

                                        {pedidosEstado.length === 0 && (
                                            <p className="text-center text-slate-500 py-4 text-sm">Sin pedidos</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {vistaActiva === 'mapa' && (
                    <MapaEntregas
                        pedidos={pedidosFiltrados}
                        ruteros={ruteros}
                        onPedidoClick={setPedidoSeleccionado}
                    />
                )}
            </div>

            {/* Modal Detalle Pedido */}
            {pedidoSeleccionado && !showAsignarModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-slate-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-bold">{pedidoSeleccionado.folio}</h2>
                                    <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm ${estadoColors[pedidoSeleccionado.estado]?.bg} ${estadoColors[pedidoSeleccionado.estado]?.text}`}>
                                        {pedidoSeleccionado.estado}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setPedidoSeleccionado(null)}
                                    className="p-2 hover:bg-slate-700 rounded-lg"
                                >
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Info cliente */}
                            <div>
                                <h3 className="text-sm font-medium text-slate-400 mb-2">Cliente</h3>
                                <div className="bg-slate-700/50 rounded-xl p-4">
                                    <p className="font-medium">{pedidoSeleccionado.cliente_nombre || 'Sin nombre'}</p>
                                    <p className="text-sm text-slate-400 mt-1">
                                        <Phone className="w-4 h-4 inline mr-1" />
                                        {pedidoSeleccionado.telefono_entrega || 'Sin teléfono'}
                                    </p>
                                    <p className="text-sm text-slate-400 mt-1">
                                        <MapPin className="w-4 h-4 inline mr-1" />
                                        {pedidoSeleccionado.direccion_entrega || 'Sin dirección'}
                                    </p>
                                </div>
                            </div>

                            {/* Info entrega */}
                            <div>
                                <h3 className="text-sm font-medium text-slate-400 mb-2">Entrega</h3>
                                <div className="bg-slate-700/50 rounded-xl p-4 grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-400">Rutero asignado</p>
                                        <p className="font-medium">{pedidoSeleccionado.rutero_nombre || 'Sin asignar'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Fecha estimada</p>
                                        <p className="font-medium">
                                            {pedidoSeleccionado.fecha_entrega_estimada
                                                ? new Date(pedidoSeleccionado.fecha_entrega_estimada).toLocaleDateString('es-MX')
                                                : 'Sin definir'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Totales */}
                            <div>
                                <h3 className="text-sm font-medium text-slate-400 mb-2">Totales</h3>
                                <div className="bg-slate-700/50 rounded-xl p-4 space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Subtotal</span>
                                        <span>${parseFloat(pedidoSeleccionado.subtotal).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Impuestos</span>
                                        <span>${parseFloat(pedidoSeleccionado.impuestos).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Envío</span>
                                        <span>${parseFloat(pedidoSeleccionado.costo_envio || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-slate-600 font-bold text-lg">
                                        <span>Total</span>
                                        <span className="text-emerald-400">${parseFloat(pedidoSeleccionado.total).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Acciones */}
                            <div className="flex gap-3">
                                {pedidoSeleccionado.estado === 'pendiente' && (
                                    <>
                                        <button
                                            onClick={() => {
                                                aprobarPedido.mutate(pedidoSeleccionado.id);
                                                setPedidoSeleccionado(null);
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-500 rounded-xl font-medium transition-colors"
                                        >
                                            <CheckCircle className="w-5 h-5" />
                                            Aprobar
                                        </button>
                                        <button
                                            onClick={() => {
                                                const motivo = prompt('Motivo del rechazo:');
                                                if (motivo) {
                                                    rechazarPedido.mutate({ id: pedidoSeleccionado.id, motivo });
                                                    setPedidoSeleccionado(null);
                                                }
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-medium transition-colors"
                                        >
                                            <XCircle className="w-5 h-5" />
                                            Rechazar
                                        </button>
                                    </>
                                )}

                                {pedidoSeleccionado.estado === 'aprobado' && (
                                    <button
                                        onClick={() => setShowAsignarModal(true)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-500 rounded-xl font-medium transition-colors"
                                    >
                                        <Truck className="w-5 h-5" />
                                        Asignar Rutero
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Asignar Rutero */}
            {showAsignarModal && pedidoSeleccionado && (
                <AsignarRuteroModal
                    pedido={pedidoSeleccionado}
                    ruteros={ruteros}
                    onClose={() => {
                        setShowAsignarModal(false);
                        setPedidoSeleccionado(null);
                    }}
                    onAsignar={(data) => asignarRutero.mutate({ pedidoId: pedidoSeleccionado.id, ...data })}
                />
            )}
        </div>
    );
};

// Componente Modal para Asignar Rutero
const AsignarRuteroModal = ({ pedido, ruteros, onClose, onAsignar }) => {
    const [ruteroId, setRuteroId] = useState('');
    const [fechaEntrega, setFechaEntrega] = useState(
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 w-full max-w-md">
                <div className="p-6 border-b border-slate-700">
                    <h2 className="text-xl font-bold">Asignar Rutero</h2>
                    <p className="text-sm text-slate-400 mt-1">Pedido: {pedido.folio}</p>
                </div>

                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Seleccionar Rutero
                        </label>
                        <select
                            value={ruteroId}
                            onChange={(e) => setRuteroId(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:ring-2 focus:ring-violet-500"
                        >
                            <option value="">Seleccione un rutero...</option>
                            {ruteros.map(rutero => (
                                <option key={rutero.id} value={rutero.id}>
                                    {rutero.nombre} ({rutero.pedidos_asignados || 0} pedidos asignados)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Fecha de Entrega Estimada
                        </label>
                        <input
                            type="date"
                            value={fechaEntrega}
                            onChange={(e) => setFechaEntrega(e.target.value)}
                            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-xl focus:ring-2 focus:ring-violet-500"
                        />
                    </div>
                </div>

                <div className="p-6 border-t border-slate-700 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onAsignar({
                            rutero_id: ruteroId,
                            fecha_entrega_estimada: fechaEntrega
                        })}
                        disabled={!ruteroId}
                        className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
                    >
                        Asignar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CoordinacionPedidos;
