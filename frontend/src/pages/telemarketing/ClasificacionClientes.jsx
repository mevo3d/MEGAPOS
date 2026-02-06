import React, { useState, useEffect } from 'react';
import {
    Users, Tag, Filter, Search, Star, TrendingUp,
    Crown, UserPlus, Building, Truck, UserX, ShoppingCart,
    RefreshCw, ChevronDown, X, Plus, Edit2, Save, Sparkles
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';

// Iconos para tipos de cliente
const ICONS_MAP = {
    'user-plus': UserPlus,
    'shopping-cart': ShoppingCart,
    'repeat': RefreshCw,
    'star': Star,
    'crown': Crown,
    'building': Building,
    'truck': Truck,
    'user-x': UserX,
    'user': Users
};

// Colores para potencial de compra
const POTENCIAL_COLORS = {
    bajo: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Bajo' },
    medio: { bg: 'bg-blue-100', text: 'text-blue-600', label: 'Medio' },
    alto: { bg: 'bg-green-100', text: 'text-green-600', label: 'Alto' },
    premium: { bg: 'bg-purple-100', text: 'text-purple-600', label: 'Premium' }
};

// Colores para frecuencia
const FRECUENCIA_COLORS = {
    nuevo: { bg: 'bg-cyan-100', text: 'text-cyan-600', label: 'Nuevo' },
    ocasional: { bg: 'bg-amber-100', text: 'text-amber-600', label: 'Ocasional' },
    regular: { bg: 'bg-emerald-100', text: 'text-emerald-600', label: 'Regular' },
    frecuente: { bg: 'bg-indigo-100', text: 'text-indigo-600', label: 'Frecuente' },
    vip: { bg: 'bg-pink-100', text: 'text-pink-600', label: 'VIP' }
};

export default function ClasificacionClientes() {
    const [loading, setLoading] = useState(true);
    const [clientes, setClientes] = useState([]);
    const [tiposCliente, setTiposCliente] = useState([]);
    const [etiquetas, setEtiquetas] = useState([]);
    const [estadisticas, setEstadisticas] = useState(null);
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showNewEtiqueta, setShowNewEtiqueta] = useState(false);
    const [newEtiqueta, setNewEtiqueta] = useState({ nombre: '', color: '#8b5cf6' });

    // Filtros
    const [filtros, setFiltros] = useState({
        busqueda: '',
        tipo_cliente_id: '',
        potencial_compra: '',
        frecuencia_compra: '',
        etiqueta_id: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        fetchClientes();
    }, [filtros]);

    const fetchData = async () => {
        try {
            const [tiposRes, etiquetasRes, estadisticasRes] = await Promise.all([
                api.get('/clasificacionClientes/tipos'),
                api.get('/clasificacionClientes/etiquetas'),
                api.get('/clasificacionClientes/estadisticas')
            ]);
            setTiposCliente(tiposRes.data);
            setEtiquetas(etiquetasRes.data);
            setEstadisticas(estadisticasRes.data);
            await fetchClientes();
        } catch (error) {
            console.error('Error cargando datos:', error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const fetchClientes = async () => {
        try {
            const params = new URLSearchParams();
            Object.entries(filtros).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });
            const res = await api.get(`/clasificacionClientes/clientes?${params.toString()}`);
            setClientes(res.data);
        } catch (error) {
            console.error('Error cargando clientes:', error);
        }
    };

    const handleUpdateClasificacion = async (clienteId, data) => {
        try {
            await api.put(`/clasificacionClientes/clientes/${clienteId}`, data);
            toast.success('Clasificación actualizada');
            fetchClientes();
            if (selectedCliente?.id === clienteId) {
                setSelectedCliente({ ...selectedCliente, ...data });
            }
        } catch (error) {
            toast.error('Error al actualizar');
        }
    };

    const handleToggleEtiqueta = async (clienteId, etiquetaId, hasEtiqueta) => {
        try {
            if (hasEtiqueta) {
                await api.delete(`/clasificacionClientes/clientes/${clienteId}/etiquetas/${etiquetaId}`);
            } else {
                await api.post(`/clasificacionClientes/clientes/${clienteId}/etiquetas/${etiquetaId}`);
            }
            fetchClientes();
            toast.success(hasEtiqueta ? 'Etiqueta removida' : 'Etiqueta agregada');
        } catch (error) {
            toast.error('Error al modificar etiqueta');
        }
    };

    const handleCreateEtiqueta = async () => {
        if (!newEtiqueta.nombre.trim()) return;
        try {
            await api.post('/clasificacionClientes/etiquetas', newEtiqueta);
            toast.success('Etiqueta creada');
            setNewEtiqueta({ nombre: '', color: '#8b5cf6' });
            setShowNewEtiqueta(false);
            fetchData();
        } catch (error) {
            toast.error('Error al crear etiqueta');
        }
    };

    const handleClasificacionAutomatica = async () => {
        try {
            await api.post('/clasificacionClientes/clasificacion-automatica');
            toast.success('Clasificación automática completada');
            fetchData();
        } catch (error) {
            toast.error('Error en clasificación automática');
        }
    };

    const IconComponent = ({ iconName, className }) => {
        const Icon = ICONS_MAP[iconName] || Users;
        return <Icon className={className} />;
    };

    if (loading) return <Loading />;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                            <Users className="w-6 h-6 text-white" />
                        </div>
                        Clasificación de Clientes
                    </h1>
                    <p className="text-slate-500 mt-1">Gestiona tipos, etiquetas y segmentación de clientes</p>
                </div>
                <Button
                    onClick={handleClasificacionAutomatica}
                    className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg"
                >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Clasificación Automática
                </Button>
            </div>

            {/* Estadísticas Cards */}
            {estadisticas && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="bg-white/80 backdrop-blur border-0 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">Total Clientes</p>
                                    <p className="text-3xl font-bold text-slate-800">{clientes.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <Users className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/80 backdrop-blur border-0 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">Necesitan Atención</p>
                                    <p className="text-3xl font-bold text-amber-600">{estadisticas.necesitan_atencion}</p>
                                </div>
                                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6 text-amber-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/80 backdrop-blur border-0 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">Tipos Configurados</p>
                                    <p className="text-3xl font-bold text-violet-600">{tiposCliente.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-violet-100 rounded-full flex items-center justify-center">
                                    <Star className="w-6 h-6 text-violet-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-white/80 backdrop-blur border-0 shadow-lg hover:shadow-xl transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-500">Etiquetas Activas</p>
                                    <p className="text-3xl font-bold text-emerald-600">{etiquetas.length}</p>
                                </div>
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                                    <Tag className="w-6 h-6 text-emerald-600" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tipos de Cliente Grid */}
            <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Star className="w-5 h-5" /> Tipos de Cliente
                </h3>
                <div className="flex flex-wrap gap-3">
                    {tiposCliente.map(tipo => (
                        <button
                            key={tipo.id}
                            onClick={() => setFiltros({ ...filtros, tipo_cliente_id: filtros.tipo_cliente_id === tipo.id.toString() ? '' : tipo.id.toString() })}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all shadow-sm hover:shadow-md ${filtros.tipo_cliente_id === tipo.id.toString()
                                    ? 'border-violet-500 bg-violet-50 text-violet-700'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                        >
                            <div
                                className="w-6 h-6 rounded-full flex items-center justify-center"
                                style={{ backgroundColor: tipo.color + '20' }}
                            >
                                <IconComponent iconName={tipo.icono} className="w-3 h-3" style={{ color: tipo.color }} />
                            </div>
                            <span className="font-medium">{tipo.nombre}</span>
                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded-full">{tipo.total_clientes || 0}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Filtros y Búsqueda */}
            <Card className="mb-6 bg-white/80 backdrop-blur border-0 shadow-lg">
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, teléfono o email..."
                                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                value={filtros.busqueda}
                                onChange={e => setFiltros({ ...filtros, busqueda: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-3">
                            <select
                                className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                                value={filtros.potencial_compra}
                                onChange={e => setFiltros({ ...filtros, potencial_compra: e.target.value })}
                            >
                                <option value="">Potencial: Todos</option>
                                <option value="bajo">Bajo</option>
                                <option value="medio">Medio</option>
                                <option value="alto">Alto</option>
                                <option value="premium">Premium</option>
                            </select>
                            <select
                                className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                                value={filtros.frecuencia_compra}
                                onChange={e => setFiltros({ ...filtros, frecuencia_compra: e.target.value })}
                            >
                                <option value="">Frecuencia: Todas</option>
                                <option value="nuevo">Nuevo</option>
                                <option value="ocasional">Ocasional</option>
                                <option value="regular">Regular</option>
                                <option value="frecuente">Frecuente</option>
                                <option value="vip">VIP</option>
                            </select>
                            <select
                                className="px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
                                value={filtros.etiqueta_id}
                                onChange={e => setFiltros({ ...filtros, etiqueta_id: e.target.value })}
                            >
                                <option value="">Etiqueta: Todas</option>
                                {etiquetas.map(e => (
                                    <option key={e.id} value={e.id}>{e.nombre}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Lista de Clientes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {clientes.map(cliente => (
                    <Card
                        key={cliente.id}
                        className="bg-white/90 backdrop-blur border-0 shadow-md hover:shadow-xl transition-all cursor-pointer group"
                        onClick={() => { setSelectedCliente(cliente); setShowModal(true); }}
                    >
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center shadow"
                                        style={{
                                            backgroundColor: cliente.tipo_cliente_color ? cliente.tipo_cliente_color + '20' : '#e2e8f0',
                                            color: cliente.tipo_cliente_color || '#64748b'
                                        }}
                                    >
                                        <IconComponent iconName={cliente.tipo_cliente_icono || 'user'} className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 group-hover:text-violet-600 transition-colors">
                                            {cliente.nombre}
                                        </h3>
                                        <p className="text-sm text-slate-500">{cliente.telefono || 'Sin teléfono'}</p>
                                    </div>
                                </div>
                                <Edit2 className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>

                            {/* Badges */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                {cliente.tipo_cliente_nombre && (
                                    <span
                                        className="text-xs px-2 py-1 rounded-full font-medium"
                                        style={{
                                            backgroundColor: cliente.tipo_cliente_color + '20',
                                            color: cliente.tipo_cliente_color
                                        }}
                                    >
                                        {cliente.tipo_cliente_nombre}
                                    </span>
                                )}
                                {cliente.potencial_compra && POTENCIAL_COLORS[cliente.potencial_compra] && (
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${POTENCIAL_COLORS[cliente.potencial_compra].bg} ${POTENCIAL_COLORS[cliente.potencial_compra].text}`}>
                                        Potencial: {POTENCIAL_COLORS[cliente.potencial_compra].label}
                                    </span>
                                )}
                                {cliente.frecuencia_compra && FRECUENCIA_COLORS[cliente.frecuencia_compra] && (
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${FRECUENCIA_COLORS[cliente.frecuencia_compra].bg} ${FRECUENCIA_COLORS[cliente.frecuencia_compra].text}`}>
                                        {FRECUENCIA_COLORS[cliente.frecuencia_compra].label}
                                    </span>
                                )}
                            </div>

                            {/* Etiquetas */}
                            {cliente.etiquetas && cliente.etiquetas.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {cliente.etiquetas.slice(0, 3).map(etiq => (
                                        <span
                                            key={etiq.id}
                                            className="text-xs px-2 py-0.5 rounded-full text-white"
                                            style={{ backgroundColor: etiq.color }}
                                        >
                                            {etiq.nombre}
                                        </span>
                                    ))}
                                    {cliente.etiquetas.length > 3 && (
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                                            +{cliente.etiquetas.length - 3}
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Stats */}
                            <div className="flex justify-between mt-4 pt-3 border-t border-slate-100 text-sm">
                                <div>
                                    <span className="text-slate-400">Total compras:</span>
                                    <span className="ml-1 font-bold text-slate-700">
                                        ${parseFloat(cliente.total_compras || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Compras:</span>
                                    <span className="ml-1 font-bold text-slate-700">{cliente.cantidad_compras || 0}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {clientes.length === 0 && (
                <div className="text-center py-16">
                    <Users className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500 text-lg">No se encontraron clientes con los filtros seleccionados</p>
                </div>
            )}

            {/* Modal de Edición */}
            {showModal && selectedCliente && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gradient-to-r from-violet-500 to-purple-600 text-white p-6 rounded-t-2xl">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold">{selectedCliente.nombre}</h2>
                                    <p className="text-violet-100">{selectedCliente.email || selectedCliente.telefono}</p>
                                </div>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Tipo de Cliente */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de Cliente</label>
                                <div className="flex flex-wrap gap-2">
                                    {tiposCliente.map(tipo => (
                                        <button
                                            key={tipo.id}
                                            onClick={() => handleUpdateClasificacion(selectedCliente.id, { tipo_cliente_id: tipo.id })}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 transition-all ${selectedCliente.tipo_cliente_id === tipo.id
                                                    ? 'border-violet-500 bg-violet-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <div
                                                className="w-6 h-6 rounded-full flex items-center justify-center"
                                                style={{ backgroundColor: tipo.color + '20' }}
                                            >
                                                <IconComponent iconName={tipo.icono} className="w-3 h-3" style={{ color: tipo.color }} />
                                            </div>
                                            <span className="text-sm font-medium">{tipo.nombre}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Potencial de Compra */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Potencial de Compra</label>
                                <div className="flex gap-2">
                                    {Object.entries(POTENCIAL_COLORS).map(([key, config]) => (
                                        <button
                                            key={key}
                                            onClick={() => handleUpdateClasificacion(selectedCliente.id, { potencial_compra: key })}
                                            className={`px-4 py-2 rounded-lg border-2 transition-all ${selectedCliente.potencial_compra === key
                                                    ? 'border-violet-500 bg-violet-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                } ${config.bg} ${config.text}`}
                                        >
                                            {config.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Frecuencia de Compra */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Frecuencia de Compra</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(FRECUENCIA_COLORS).map(([key, config]) => (
                                        <button
                                            key={key}
                                            onClick={() => handleUpdateClasificacion(selectedCliente.id, { frecuencia_compra: key })}
                                            className={`px-4 py-2 rounded-lg border-2 transition-all ${selectedCliente.frecuencia_compra === key
                                                    ? 'border-violet-500 bg-violet-50'
                                                    : 'border-slate-200 hover:border-slate-300'
                                                } ${config.bg} ${config.text}`}
                                        >
                                            {config.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Etiquetas */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-semibold text-slate-700">Etiquetas</label>
                                    <button
                                        onClick={() => setShowNewEtiqueta(!showNewEtiqueta)}
                                        className="text-sm text-violet-600 hover:text-violet-700 flex items-center gap-1"
                                    >
                                        <Plus className="w-4 h-4" /> Nueva etiqueta
                                    </button>
                                </div>

                                {showNewEtiqueta && (
                                    <div className="flex gap-2 mb-3 p-3 bg-slate-50 rounded-lg">
                                        <input
                                            type="text"
                                            placeholder="Nombre de etiqueta"
                                            className="flex-1 px-3 py-2 border rounded-lg text-sm"
                                            value={newEtiqueta.nombre}
                                            onChange={e => setNewEtiqueta({ ...newEtiqueta, nombre: e.target.value })}
                                        />
                                        <input
                                            type="color"
                                            className="w-10 h-10 rounded cursor-pointer"
                                            value={newEtiqueta.color}
                                            onChange={e => setNewEtiqueta({ ...newEtiqueta, color: e.target.value })}
                                        />
                                        <Button onClick={handleCreateEtiqueta} size="sm" className="bg-violet-500 hover:bg-violet-600">
                                            <Save className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-2">
                                    {etiquetas.map(etiq => {
                                        const hasEtiqueta = selectedCliente.etiquetas?.some(e => e.id === etiq.id);
                                        return (
                                            <button
                                                key={etiq.id}
                                                onClick={() => handleToggleEtiqueta(selectedCliente.id, etiq.id, hasEtiqueta)}
                                                className={`px-3 py-1.5 rounded-full text-sm transition-all border-2 ${hasEtiqueta
                                                        ? 'text-white border-transparent'
                                                        : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                style={hasEtiqueta ? { backgroundColor: etiq.color } : {}}
                                            >
                                                {hasEtiqueta && <span className="mr-1">✓</span>}
                                                {etiq.nombre}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Notas CRM */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Notas del CRM</label>
                                <textarea
                                    className="w-full p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500"
                                    rows="3"
                                    placeholder="Notas importantes sobre este cliente..."
                                    defaultValue={selectedCliente.notas_crm || ''}
                                    onBlur={e => {
                                        if (e.target.value !== selectedCliente.notas_crm) {
                                            handleUpdateClasificacion(selectedCliente.id, { notas_crm: e.target.value });
                                        }
                                    }}
                                />
                            </div>

                            {/* Stats del cliente */}
                            <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-slate-800">
                                        ${parseFloat(selectedCliente.total_compras || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-sm text-slate-500">Total Compras</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-slate-800">{selectedCliente.cantidad_compras || 0}</p>
                                    <p className="text-sm text-slate-500">Nº Compras</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-slate-800">
                                        {selectedCliente.ultima_compra
                                            ? new Date(selectedCliente.ultima_compra).toLocaleDateString('es-MX')
                                            : 'N/A'}
                                    </p>
                                    <p className="text-sm text-slate-500">Última Compra</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
