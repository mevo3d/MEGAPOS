import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Building, Plus, Edit, Trash2, Store, MapPin, Package, DollarSign, Users, Power } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const StoreManagement = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingStore, setEditingStore] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        nombre: '',
        direccion: '',
        telefono: '',
        tipo: 'sucursal',
        activo: true
    });

    // Query para obtener sucursales
    const { data: stores = [], isLoading, error } = useQuery({
        queryKey: ['sucursales'],
        queryFn: async () => {
            const response = await api.get('/sucursales');
            return response.data;
        }
    });

    // Query para obtener puntos de venta (cajas)
    const { data: cajas = [] } = useQuery({
        queryKey: ['puntosVenta'],
        queryFn: async () => {
            const response = await api.get('/puntosVenta');
            return response.data;
        }
    });

    // Query para obtener tipos de sucursal activos
    const { data: tiposSucursal = [] } = useQuery({
        queryKey: ['tiposSucursalActivos'],
        queryFn: async () => {
            const response = await api.get('/tiposSucursal/activos');
            return response.data;
        }
    });

    // Mutation para crear sucursal
    const createStoreMutation = useMutation({
        mutationFn: async (storeData) => {
            const response = await api.post('/sucursales', storeData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sucursales'] });
            toast.success('Tienda creada exitosamente');
            resetForm();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Error al crear tienda');
        }
    });

    // Mutation para actualizar sucursal
    const updateStoreMutation = useMutation({
        mutationFn: async ({ id, storeData }) => {
            const response = await api.put(`/sucursales/${id}`, storeData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sucursales'] });
            toast.success('Tienda actualizada exitosamente');
            resetForm();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Error al actualizar tienda');
        }
    });

    // Mutation para eliminar sucursal
    const deleteStoreMutation = useMutation({
        mutationFn: async (id) => {
            const response = await api.delete(`/sucursales/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sucursales'] });
            toast.success('Tienda eliminada exitosamente');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Error al eliminar tienda');
        }
    });

    // Mutation para crear punto de venta (caja)
    const createCajaMutation = useMutation({
        mutationFn: async (cajaData) => {
            const response = await api.post('/puntosVenta', cajaData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['puntosVenta'] });
            toast.success('Caja creada exitosamente');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Error al crear caja');
        }
    });

    // Mutation para actualizar punto de venta (caja)
    const updateCajaMutation = useMutation({
        mutationFn: async ({ id, cajaData }) => {
            const response = await api.put(`/puntosVenta/${id}`, cajaData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['puntosVenta'] });
            toast.success('Caja actualizada exitosamente');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Error al actualizar caja');
        }
    });

    // Mutation para eliminar punto de venta (caja)
    const deleteCajaMutation = useMutation({
        mutationFn: async (id) => {
            const response = await api.delete(`/puntosVenta/${id}`);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['puntosVenta'] });
            queryClient.invalidateQueries({ queryKey: ['empleados'] });
            toast.success('Caja eliminada exitosamente');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Error al eliminar caja');
        }
    });

    const resetForm = () => {
        setFormData({
            nombre: '',
            direccion: '',
            telefono: '',
            tipo: 'sucursal',
            activo: true
        });
        setShowCreateForm(false);
        setEditingStore(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingStore) {
            updateStoreMutation.mutate({ id: editingStore.id, storeData: formData });
        } else {
            createStoreMutation.mutate(formData);
        }
    };

    const handleEdit = (store) => {
        setEditingStore(store);
        setFormData({
            nombre: store.nombre,
            direccion: store.direccion || '',
            telefono: store.telefono || '',
            tipo: store.tipo,
            activo: store.activo
        });
        setShowCreateForm(true);
    };

    const handleDelete = (storeId) => {
        if (window.confirm('¿Está seguro de eliminar esta tienda?')) {
            deleteStoreMutation.mutate(storeId);
        }
    };

    const handleCreateCaja = (sucursalId) => {
        const nombre = prompt('Nombre de la caja (ej: Caja 1, Caja 2):');
        if (nombre) {
            const esMaestra = window.confirm('¿Es una caja MAESTRA? (Permite cobrar preventas)');
            createCajaMutation.mutate({
                nombre,
                sucursal_id: sucursalId,
                es_maestra: esMaestra ? 1 : 0,
                estado: 'cerrada'
            });
        }
    };

    const handleToggleCajaTipo = (caja) => {
        const nuevoTipo = caja.es_maestra ? 0 : 1;
        const tipoNombre = nuevoTipo ? 'MAESTRA' : 'PREVENTA';

        if (window.confirm(`¿Cambiar esta caja a tipo ${tipoNombre}?`)) {
            updateCajaMutation.mutate({
                id: caja.id,
                cajaData: {
                    es_maestra: nuevoTipo
                }
            });
        }
    };

    const handleDeleteCaja = async (caja) => {
        // Validar que la caja esté cerrada
        if (caja.estado === 'abierta') {
            toast.error('No se puede eliminar una caja que está abierta. Cierra la caja primero.');
            return;
        }

        // Mostrar advertencia completa
        const confirmMessage =
            `⚠️ ADVERTENCIA: Estás por eliminar la caja "${caja.nombre}"\n\n` +
            `• Si hay un usuario asignado a esta caja, será DESASIGNADO automáticamente.\n` +
            `• El historial de ventas y cortes de caja se MANTENDRÁ para auditoría.\n` +
            `• Esta acción NO se puede deshacer.\n\n` +
            `¿Estás seguro de continuar?`;

        if (window.confirm(confirmMessage)) {
            deleteCajaMutation.mutate(caja.id);
        }
    };

    const handleToggleActivoCaja = (caja) => {
        const nuevoEstado = !caja.activo;
        const mensaje = nuevoEstado
            ? `¿Activar la caja "${caja.nombre}"? Los cajeros podrán usarla.`
            : `¿Desactivar la caja "${caja.nombre}"? Los cajeros NO podrán usarla.`;

        if (window.confirm(mensaje)) {
            updateCajaMutation.mutate({
                id: caja.id,
                cajaData: {
                    activo: nuevoEstado ? 1 : 0
                }
            });
        }
    };


    const filteredStores = stores.filter(store =>
        store.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        store.tipo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStoreTypeInfo = (typeName) => {
        const tipo = tiposSucursal.find(t => t.nombre === typeName);
        if (tipo) {
            return { label: tipo.nombre, color: tipo.color, icon: tipo.icono };
        }
        // Fallback
        return { label: typeName, color: '#3B82F6', icon: 'Store' };
    };

    const getStoreStats = (sucursalId) => {
        const storeCajas = cajas.filter(caja => caja.sucursal_id === sucursalId);
        return {
            totalCajas: storeCajas.length,
            activeCajas: storeCajas.filter(caja => caja.estado === 'abierta').length
        };
    };

    if (isLoading) {
        return (
            <Card className="glass border-0 shadow-xl">
                <CardContent className="p-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-500 mt-2">Cargando tiendas...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="glass border-0 shadow-xl">
                <CardContent className="p-8">
                    <div className="text-center text-red-500">
                        <p>Error al cargar tiendas</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header con buscador y botón agregar */}
            <Card className="glass border-0 shadow-xl">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Building className="h-5 w-5 text-blue-600" />
                                Gestión de Tiendas y Cajas
                            </h2>
                            <p className="text-sm text-gray-500">Administra sucursales y puntos de venta</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <input
                                type="text"
                                placeholder="Buscar tiendas..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                            />
                            <Button
                                onClick={() => setShowCreateForm(true)}
                                className="hover-lift w-full sm:w-auto"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Agregar Tienda
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Formulario de creación/edición */}
            {showCreateForm && (
                <Card className="glass border-0 shadow-xl animate-slide-up">
                    <CardHeader>
                        <CardTitle>
                            {editingStore ? 'Editar Tienda' : 'Crear Nueva Tienda'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre de la tienda
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Ej: Sucursal Centro"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Tipo
                                    </label>
                                    <select
                                        required
                                        value={formData.tipo}
                                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Seleccione un tipo...</option>
                                        {tiposSucursal.map(type => (
                                            <option key={type.id} value={type.nombre}>
                                                {type.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Dirección
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.direccion}
                                        onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Dirección completa"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Teléfono
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.telefono}
                                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Teléfono de contacto"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="activo"
                                    checked={formData.activo}
                                    onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
                                    Tienda activa
                                </label>
                            </div>
                            <div className="flex gap-3 justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={resetForm}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createStoreMutation.isLoading || updateStoreMutation.isLoading}
                                >
                                    {createStoreMutation.isLoading || updateStoreMutation.isLoading
                                        ? 'Guardando...'
                                        : (editingStore ? 'Actualizar' : 'Crear')
                                    }
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Lista de tiendas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredStores.map((store) => {
                    const stats = getStoreStats(store.id);
                    const storeType = getStoreTypeInfo(store.tipo);

                    return (
                        <Card key={store.id} className="glass border-0 shadow-xl hover-lift">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                                            style={{ backgroundColor: storeType.color }}
                                        >
                                            <Building className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{store.nombre}</h3>
                                            <span
                                                className="inline-block px-2 py-1 rounded-full text-xs font-medium text-white"
                                                style={{ backgroundColor: storeType.color }}
                                            >
                                                {storeType.label}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className={`w-2 h-2 rounded-full ${store.activo ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        <span className="text-xs text-gray-500">{store.activo ? 'Activa' : 'Inactiva'}</span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="space-y-3">
                                    {store.direccion && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <MapPin className="h-4 w-4" />
                                            <span className="text-sm">{store.direccion}</span>
                                        </div>
                                    )}
                                    {store.telefono && (
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <span className="text-sm font-medium">Tel:</span>
                                            <span className="text-sm">{store.telefono}</span>
                                        </div>
                                    )}

                                    {/* Stats de cajas */}
                                    <div className="border-t border-gray-100 pt-3">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-gray-700">Cajas registradas</span>
                                            <span className="text-sm text-gray-500">{stats.totalCajas}</span>
                                        </div>
                                        <div className="flex justify-between items-center mb-3">
                                            <span className="text-sm font-medium text-gray-700">Cajas activas</span>
                                            <span className="text-sm font-semibold text-green-600">{stats.activeCajas}</span>
                                        </div>

                                        {/* Instrucciones */}
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
                                            <p className="text-[10px] text-blue-700 leading-relaxed">
                                                <strong>💡 Tip:</strong> Haz clic en los badges de <span className="bg-purple-100 px-1 rounded">Maestra</span> o <span className="bg-amber-100 px-1 rounded">Preventa</span> para cambiar el tipo de caja.
                                            </p>
                                        </div>

                                        {/* Lista de cajas detallada */}
                                        <div className="space-y-2 mb-3 max-h-40 overflow-y-auto custom-scrollbar">
                                            {cajas.filter(c => c.sucursal_id === store.id).map(caja => (
                                                <div key={caja.id} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded border border-gray-100 hover:bg-white transition-colors group">
                                                    <div className="flex items-center gap-2 flex-1">
                                                        <span className="font-medium text-gray-700">{caja.nombre}</span>
                                                        {caja.estado === 'abierta' && (
                                                            <span className="text-[9px] bg-yellow-100 text-yellow-700 px-1 py-0.5 rounded border border-yellow-200">
                                                                🔒 Bloqueada
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1 items-center">
                                                        <button
                                                            onClick={() => handleToggleCajaTipo(caja)}
                                                            className="transition-all hover:scale-105 active:scale-95"
                                                            title="Click para cambiar tipo de caja"
                                                        >
                                                            {caja.es_maestra ? (
                                                                <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-purple-200 cursor-pointer hover:bg-purple-200">
                                                                    Maestra
                                                                </span>
                                                            ) : (
                                                                <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded text-[10px] font-medium border border-amber-200 cursor-pointer hover:bg-amber-200">
                                                                    Preventa
                                                                </span>
                                                            )}
                                                        </button>
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${caja.estado === 'abierta'
                                                            ? 'bg-green-100 text-green-700 border-green-200'
                                                            : 'bg-gray-100 text-gray-600 border-gray-200'
                                                            }`}>
                                                            {caja.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
                                                        </span>
                                                        <button
                                                            onClick={() => handleToggleActivoCaja(caja)}
                                                            className={`transition-all ml-1 hover:scale-110 active:scale-95 ${caja.activo ? 'text-green-600 hover:text-green-700' : 'text-red-500 hover:text-red-700'
                                                                }`}
                                                            title={caja.activo ? 'Caja Activa - Click para desactivar' : 'Caja Inactiva - Click para activar'}
                                                        >
                                                            <Power className="h-3 w-3" />
                                                        </button>
                                                        {caja.estado === 'cerrada' && (
                                                            <button
                                                                onClick={() => handleDeleteCaja(caja)}
                                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:scale-110 active:scale-95"
                                                                title="Eliminar caja (solo si está cerrada)"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {cajas.filter(c => c.sucursal_id === store.id).length === 0 && (
                                                <div className="text-center text-xs text-gray-400 py-2 italic">
                                                    Sin cajas registradas
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Acciones */}
                                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleCreateCaja(store.id)}
                                            className="flex-1"
                                        >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Agregar Caja
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEdit(store)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDelete(store.id)}
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {filteredStores.length === 0 && (
                <Card className="glass border-0 shadow-xl">
                    <CardContent className="p-8">
                        <div className="text-center text-gray-500">
                            <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No se encontraron tiendas</p>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default StoreManagement;