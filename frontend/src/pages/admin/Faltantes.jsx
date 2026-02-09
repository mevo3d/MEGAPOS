import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import {
    AlertTriangle, Package, Search, Plus, Check, X,
    Truck, Clock, Send, Building, AlertCircle, Loader2
} from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../context/authStore';

export default function Faltantes() {
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(true);
    const [faltantes, setFaltantes] = useState([]);
    const [solicitudes, setSolicitudes] = useState([]);
    const [pendientesCedis, setPendientesCedis] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [cantidad, setCantidad] = useState('');
    const [urgencia, setUrgencia] = useState('normal');
    const [notas, setNotas] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Determinar si es vista CEDIS o Sucursal
    const isCedis = user?.sucursal_id === 1 || user?.rol === 'superadmin' || user?.rol === 'admin';

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (isCedis) {
                // Vista CEDIS: cargar todas las solicitudes pendientes
                const res = await api.get('/faltantes/pendientes');
                setPendientesCedis(res.data.porSucursal || []);
            } else {
                // Vista Sucursal: cargar faltantes de esta sucursal
                const res = await api.get(`/faltantes/sucursal/${user?.sucursal_id}`);
                setFaltantes(res.data.faltantes || []);
                setSolicitudes(res.data.solicitudes || []);
            }
        } catch (error) {
            console.error('Error cargando datos:', error);
            toast.error('Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (term) => {
        setSearchTerm(term);
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const res = await api.get(`/faltantes/productos/buscar?q=${term}`);
            setSearchResults(res.data || []);
        } catch (error) {
            console.error('Error buscando:', error);
        }
    };

    const handleSolicitar = async () => {
        if (!selectedProduct || !cantidad) {
            toast.error('Selecciona un producto y cantidad');
            return;
        }
        setSubmitting(true);
        try {
            await api.post('/faltantes/solicitar', {
                sucursal_id: user?.sucursal_id,
                producto_id: selectedProduct.id,
                cantidad: parseInt(cantidad),
                urgencia,
                notas
            });
            toast.success('Solicitud enviada a CEDIS');
            setModalOpen(false);
            resetForm();
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al solicitar');
        } finally {
            setSubmitting(false);
        }
    };

    const handleAprobar = async (id, cantidadAprobada) => {
        try {
            await api.put(`/faltantes/${id}/aprobar`, { cantidad_aprobada: cantidadAprobada });
            toast.success('Solicitud aprobada');
            loadData();
        } catch (error) {
            toast.error('Error al aprobar');
        }
    };

    const handleRechazar = async (id) => {
        try {
            await api.put(`/faltantes/${id}/rechazar`, { motivo: 'Sin stock disponible' });
            toast.success('Solicitud rechazada');
            loadData();
        } catch (error) {
            toast.error('Error al rechazar');
        }
    };

    const handleDespacharTodo = async (sucursalSolicitudes) => {
        const aprobadas = sucursalSolicitudes.filter(s => s.estado === 'aprobada');
        if (aprobadas.length === 0) {
            toast.error('No hay solicitudes aprobadas para despachar');
            return;
        }
        try {
            await api.post('/faltantes/despachar', {
                solicitud_ids: aprobadas.map(s => s.id)
            });
            toast.success('Traspasos generados exitosamente');
            loadData();
        } catch (error) {
            toast.error('Error al despachar');
        }
    };

    const resetForm = () => {
        setSelectedProduct(null);
        setCantidad('');
        setUrgencia('normal');
        setNotas('');
        setSearchTerm('');
        setSearchResults([]);
    };

    const getUrgenciaColor = (urg) => {
        switch (urg) {
            case 'urgente': return 'bg-red-100 text-red-700 border-red-200';
            case 'alta': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'normal': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'baja': return 'bg-gray-100 text-gray-600 border-gray-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const getEstadoStyle = (estado) => {
        switch (estado) {
            case 'pendiente': return 'bg-yellow-100 text-yellow-700';
            case 'aprobada': return 'bg-green-100 text-green-700';
            case 'rechazada': return 'bg-red-100 text-red-700';
            case 'despachada': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // =========================================
    // VISTA CEDIS - Panel de gestión
    // =========================================
    if (isCedis) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Building className="text-orange-600" />
                            Panel de Solicitudes - CEDIS
                        </h2>
                        <p className="text-gray-500 text-sm">Gestiona las solicitudes de productos de todas las sucursales</p>
                    </div>
                    <Button onClick={loadData} variant="outline">
                        <Loader2 className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </Button>
                </div>

                {pendientesCedis.length === 0 ? (
                    <Card className="glass">
                        <CardContent className="py-12 text-center text-gray-500">
                            <Check className="w-16 h-16 mx-auto mb-4 text-green-300" />
                            <p className="text-lg font-medium">¡Todo al día!</p>
                            <p className="text-sm">No hay solicitudes pendientes de las sucursales.</p>
                        </CardContent>
                    </Card>
                ) : (
                    pendientesCedis.map((grupo) => (
                        <Card key={grupo.sucursal_id} className="glass border-0 shadow-lg">
                            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                                <div className="flex justify-between items-center">
                                    <CardTitle className="flex items-center gap-2">
                                        <Building className="w-5 h-5 text-blue-600" />
                                        {grupo.sucursal_nombre}
                                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                            {grupo.solicitudes.length} solicitudes
                                        </span>
                                    </CardTitle>
                                    <Button
                                        size="sm"
                                        onClick={() => handleDespacharTodo(grupo.solicitudes)}
                                        className="gradient-primary"
                                    >
                                        <Truck className="w-4 h-4 mr-1" /> Despachar Aprobados
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-600 font-semibold">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Producto</th>
                                            <th className="px-4 py-3 text-center">Solicitado</th>
                                            <th className="px-4 py-3 text-center">Stock CEDIS</th>
                                            <th className="px-4 py-3 text-center">Urgencia</th>
                                            <th className="px-4 py-3 text-center">Estado</th>
                                            <th className="px-4 py-3 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {grupo.solicitudes.map((sol) => (
                                            <tr key={sol.id} className="hover:bg-blue-50/30">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">{sol.producto_nombre}</div>
                                                    <div className="text-xs text-gray-400">{sol.producto_sku}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold">{sol.cantidad_solicitada}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`font-bold ${(sol.stock_cedis || 0) >= sol.cantidad_solicitada ? 'text-green-600' : 'text-red-600'}`}>
                                                        {sol.stock_cedis || 0}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold border ${getUrgenciaColor(sol.urgencia)}`}>
                                                        {sol.urgencia.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getEstadoStyle(sol.estado)}`}>
                                                        {sol.estado}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {sol.estado === 'pendiente' && (
                                                        <div className="flex gap-1 justify-center">
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-green-600 hover:bg-green-50"
                                                                onClick={() => handleAprobar(sol.id, sol.cantidad_solicitada)}
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-red-600 hover:bg-red-50"
                                                                onClick={() => handleRechazar(sol.id)}
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {sol.estado === 'aprobada' && (
                                                        <span className="text-xs text-green-600">Listo para despachar</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        );
    }

    // =========================================
    // VISTA SUCURSAL - Productos faltantes y solicitudes
    // =========================================
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <AlertTriangle className="text-orange-600" />
                        Productos Faltantes
                    </h2>
                    <p className="text-gray-500 text-sm">Productos con stock bajo el mínimo y solicitudes a CEDIS</p>
                </div>
                <Button onClick={() => setModalOpen(true)} className="gradient-primary">
                    <Plus className="w-4 h-4 mr-2" /> Solicitar Producto
                </Button>
            </div>

            {/* Productos con stock bajo */}
            <Card className="glass border-0 shadow-lg">
                <CardHeader>
                    <CardTitle className="text-orange-700 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Stock Bajo Mínimo ({faltantes.length})
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {faltantes.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <Check className="w-12 h-12 mx-auto mb-2 text-green-300" />
                            <p>Todos los productos tienen stock suficiente</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Producto</th>
                                        <th className="px-4 py-2 text-center">Stock Actual</th>
                                        <th className="px-4 py-2 text-center">Stock Mínimo</th>
                                        <th className="px-4 py-2 text-center">Faltante</th>
                                        <th className="px-4 py-2 text-center">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {faltantes.map((item) => (
                                        <tr key={item.inventario_id} className="hover:bg-red-50/30">
                                            <td className="px-4 py-3">
                                                <div className="font-medium">{item.nombre}</div>
                                                <div className="text-xs text-gray-400">{item.sku}</div>
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-red-600">{item.stock_actual}</td>
                                            <td className="px-4 py-3 text-center text-gray-600">{item.stock_minimo}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full font-bold">
                                                    -{item.cantidad_faltante}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {item.solicitud_pendiente_id ? (
                                                    <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs">
                                                        Solicitado ({item.cantidad_solicitada})
                                                    </span>
                                                ) : (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedProduct(item);
                                                            setCantidad(item.cantidad_faltante.toString());
                                                            setModalOpen(true);
                                                        }}
                                                    >
                                                        <Send className="w-3 h-3 mr-1" /> Solicitar
                                                    </Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Historial de solicitudes */}
            <Card className="glass">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-600" />
                        Mis Solicitudes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {solicitudes.length === 0 ? (
                        <p className="text-center py-4 text-gray-500">No hay solicitudes recientes</p>
                    ) : (
                        <div className="space-y-2">
                            {solicitudes.slice(0, 10).map((sol) => (
                                <div key={sol.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div>
                                        <span className="font-medium">{sol.producto_nombre}</span>
                                        <span className="text-gray-400 ml-2">x{sol.cantidad_solicitada}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getEstadoStyle(sol.estado)}`}>
                                            {sol.estado}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {new Date(sol.fecha_solicitud).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Modal para solicitar producto */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Plus className="w-5 h-5 text-blue-600" />
                                Solicitar Producto a CEDIS
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Búsqueda de producto */}
                            {!selectedProduct ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Producto</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <Input
                                            placeholder="Nombre, SKU o código de barras..."
                                            value={searchTerm}
                                            onChange={(e) => handleSearch(e.target.value)}
                                            className="pl-10"
                                        />
                                    </div>
                                    {searchResults.length > 0 && (
                                        <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                                            {searchResults.map((prod) => (
                                                <button
                                                    key={prod.id}
                                                    onClick={() => setSelectedProduct(prod)}
                                                    className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b last:border-b-0"
                                                >
                                                    <div className="font-medium">{prod.nombre}</div>
                                                    <div className="text-xs text-gray-400">{prod.sku}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-blue-50 p-3 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="font-medium">{selectedProduct.nombre}</div>
                                            <div className="text-xs text-gray-500">{selectedProduct.sku}</div>
                                        </div>
                                        <Button size="sm" variant="ghost" onClick={() => setSelectedProduct(null)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                                <Input
                                    type="number"
                                    value={cantidad}
                                    onChange={(e) => setCantidad(e.target.value)}
                                    placeholder="Cantidad a solicitar"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Urgencia</label>
                                <select
                                    value={urgencia}
                                    onChange={(e) => setUrgencia(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="baja">Baja</option>
                                    <option value="normal">Normal</option>
                                    <option value="alta">Alta</option>
                                    <option value="urgente">Urgente</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                                <textarea
                                    value={notas}
                                    onChange={(e) => setNotas(e.target.value)}
                                    className="w-full border rounded-lg px-3 py-2"
                                    rows={2}
                                    placeholder="Información adicional..."
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button variant="outline" onClick={() => { setModalOpen(false); resetForm(); }} className="flex-1">
                                    Cancelar
                                </Button>
                                <Button onClick={handleSolicitar} disabled={submitting} className="flex-1 gradient-primary">
                                    {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                                    Enviar Solicitud
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
