import React, { useState, useEffect } from 'react';
import {
    Plus,
    Edit2,
    Trash2,
    Save,
    X,
    Store,
    Warehouse,
    Phone,
    Truck,
    Building,
    ShoppingCart,
    MapPin,
    GripVertical,
    AlertCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// Iconos disponibles para seleccionar
const ICONOS_DISPONIBLES = [
    { id: 'Store', icon: Store, label: 'Tienda' },
    { id: 'Warehouse', icon: Warehouse, label: 'Almacén' },
    { id: 'Phone', icon: Phone, label: 'Teléfono' },
    { id: 'Truck', icon: Truck, label: 'Camión' },
    { id: 'Building', icon: Building, label: 'Edificio' },
    { id: 'ShoppingCart', icon: ShoppingCart, label: 'Carrito' },
    { id: 'MapPin', icon: MapPin, label: 'Ubicación' },
];

// Colores disponibles
const COLORES_DISPONIBLES = [
    '#10B981', // Verde
    '#3B82F6', // Azul
    '#8B5CF6', // Púrpura
    '#F59E0B', // Amarillo
    '#EF4444', // Rojo
    '#EC4899', // Rosa
    '#06B6D4', // Cyan
    '#84CC16', // Lima
    '#F97316', // Naranja
    '#6366F1', // Indigo
];

const getIconComponent = (iconName) => {
    const iconMap = {
        Store, Warehouse, Phone, Truck, Building, ShoppingCart, MapPin
    };
    return iconMap[iconName] || Store;
};

const TiposSucursalSettings = () => {
    const [tipos, setTipos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        color: '#3B82F6',
        icono: 'Store'
    });

    useEffect(() => {
        fetchTipos();
    }, []);

    const fetchTipos = async () => {
        try {
            setLoading(true);
            const response = await api.get('/tiposSucursal');
            setTipos(response.data);
        } catch (error) {
            console.error('Error cargando tipos:', error);
            toast.error('Error al cargar los tipos de sucursal');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.nombre.trim()) {
            toast.error('El nombre es requerido');
            return;
        }

        try {
            if (editingId) {
                await api.put(`/tiposSucursal/${editingId}`, formData);
                toast.success('Tipo actualizado exitosamente');
            } else {
                await api.post('/tiposSucursal', formData);
                toast.success('Tipo creado exitosamente');
            }

            resetForm();
            fetchTipos();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al guardar');
        }
    };

    const handleEdit = (tipo) => {
        setFormData({
            nombre: tipo.nombre,
            descripcion: tipo.descripcion || '',
            color: tipo.color || '#3B82F6',
            icono: tipo.icono || 'Store'
        });
        setEditingId(tipo.id);
        setShowForm(true);
    };

    const handleDelete = async (id, nombre) => {
        if (!confirm(`¿Estás seguro de eliminar el tipo "${nombre}"?`)) {
            return;
        }

        try {
            await api.delete(`/tiposSucursal/${id}`);
            toast.success('Tipo eliminado exitosamente');
            fetchTipos();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al eliminar');
        }
    };

    const handleToggleActivo = async (tipo) => {
        try {
            await api.put(`/tiposSucursal/${tipo.id}`, {
                activo: tipo.activo ? 0 : 1
            });
            toast.success(tipo.activo ? 'Tipo desactivado' : 'Tipo activado');
            fetchTipos();
        } catch (error) {
            toast.error('Error al cambiar el estado');
        }
    };

    const resetForm = () => {
        setFormData({
            nombre: '',
            descripcion: '',
            color: '#3B82F6',
            icono: 'Store'
        });
        setEditingId(null);
        setShowForm(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-white">Tipos de Sucursal</h2>
                    <p className="text-gray-400 text-sm mt-1">
                        Configura los tipos de tienda disponibles para crear sucursales
                    </p>
                </div>
                {!showForm && (
                    <Button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus size={18} />
                        Agregar Tipo
                    </Button>
                )}
            </div>

            {/* Formulario */}
            {showForm && (
                <Card className="bg-gray-800 border-gray-700">
                    <CardHeader>
                        <CardTitle className="text-white">
                            {editingId ? 'Editar Tipo de Sucursal' : 'Nuevo Tipo de Sucursal'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Nombre *
                                    </label>
                                    <Input
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        placeholder="Ej: Expendio"
                                        className="bg-gray-700 border-gray-600 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Descripción
                                    </label>
                                    <Input
                                        value={formData.descripcion}
                                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                        placeholder="Descripción breve..."
                                        className="bg-gray-700 border-gray-600 text-white"
                                    />
                                </div>
                            </div>

                            {/* Selector de Color */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Color
                                </label>
                                <div className="flex gap-2 flex-wrap">
                                    {COLORES_DISPONIBLES.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color })}
                                            className={`w-8 h-8 rounded-full transition-all ${formData.color === color
                                                    ? 'ring-2 ring-offset-2 ring-offset-gray-800 ring-white scale-110'
                                                    : 'hover:scale-105'
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Selector de Icono */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Icono
                                </label>
                                <div className="flex gap-2 flex-wrap">
                                    {ICONOS_DISPONIBLES.map((item) => {
                                        const IconComp = item.icon;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, icono: item.id })}
                                                className={`p-3 rounded-lg transition-all flex flex-col items-center gap-1 ${formData.icono === item.id
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                                    }`}
                                            >
                                                <IconComp size={20} />
                                                <span className="text-xs">{item.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Preview */}
                            <div className="p-4 bg-gray-700 rounded-lg">
                                <p className="text-sm text-gray-400 mb-2">Vista previa:</p>
                                <div
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white"
                                    style={{ backgroundColor: formData.color }}
                                >
                                    {React.createElement(getIconComponent(formData.icono), { size: 20 })}
                                    <span className="font-medium">{formData.nombre || 'Nombre del tipo'}</span>
                                </div>
                            </div>

                            {/* Botones */}
                            <div className="flex gap-2 justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={resetForm}
                                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                                >
                                    <X size={18} className="mr-1" />
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-green-600 hover:bg-green-700"
                                >
                                    <Save size={18} className="mr-1" />
                                    {editingId ? 'Actualizar' : 'Guardar'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Lista de Tipos */}
            <div className="grid gap-3">
                {tipos.length === 0 ? (
                    <Card className="bg-gray-800 border-gray-700">
                        <CardContent className="p-8 text-center">
                            <AlertCircle size={48} className="mx-auto text-gray-500 mb-4" />
                            <p className="text-gray-400">No hay tipos de sucursal configurados</p>
                            <Button
                                onClick={() => setShowForm(true)}
                                className="mt-4 bg-blue-600 hover:bg-blue-700"
                            >
                                <Plus size={18} className="mr-1" />
                                Agregar el primero
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    tipos.map((tipo) => {
                        const IconComp = getIconComponent(tipo.icono);
                        return (
                            <Card
                                key={tipo.id}
                                className={`bg-gray-800 border-gray-700 transition-opacity ${!tipo.activo ? 'opacity-50' : ''
                                    }`}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className="w-12 h-12 rounded-lg flex items-center justify-center text-white"
                                                style={{ backgroundColor: tipo.color || '#3B82F6' }}
                                            >
                                                <IconComp size={24} />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-white flex items-center gap-2">
                                                    {tipo.nombre}
                                                    {!tipo.activo && (
                                                        <span className="text-xs bg-gray-600 px-2 py-0.5 rounded">
                                                            Inactivo
                                                        </span>
                                                    )}
                                                </h3>
                                                <p className="text-sm text-gray-400">
                                                    {tipo.descripcion || 'Sin descripción'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleToggleActivo(tipo)}
                                                className={tipo.activo
                                                    ? 'text-yellow-400 hover:bg-yellow-400/10'
                                                    : 'text-green-400 hover:bg-green-400/10'
                                                }
                                            >
                                                {tipo.activo ? 'Desactivar' : 'Activar'}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEdit(tipo)}
                                                className="text-blue-400 hover:bg-blue-400/10"
                                            >
                                                <Edit2 size={18} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(tipo.id, tipo.nombre)}
                                                className="text-red-400 hover:bg-red-400/10"
                                            >
                                                <Trash2 size={18} />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default TiposSucursalSettings;
