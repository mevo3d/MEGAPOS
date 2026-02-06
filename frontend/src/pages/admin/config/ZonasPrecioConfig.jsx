import React, { useState, useEffect } from 'react';
import { MapPin, Plus, Edit2, Trash2, Save, X, DollarSign, Truck } from 'lucide-react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Loading } from '../../../components/ui/Loading';

export default function ZonasPrecioConfig() {
    const [zonas, setZonas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingZona, setEditingZona] = useState(null);
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        distancia_min_km: 0,
        distancia_max_km: 0,
        porcentaje_incremento: 0,
        monto_fijo_extra: 0,
        activa: true
    });

    useEffect(() => {
        loadZonas();
    }, []);

    const loadZonas = async () => {
        try {
            const res = await api.get('/admin/zonas-precio');
            setZonas(res.data);
        } catch (error) {
            console.error(error);
            toast.error('Error cargando zonas');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            nombre: '',
            descripcion: '',
            distancia_min_km: 0,
            distancia_max_km: 0,
            porcentaje_incremento: 0,
            monto_fijo_extra: 0,
            activa: true
        });
        setEditingZona(null);
        setShowForm(false);
    };

    const handleEdit = (zona) => {
        setFormData({
            nombre: zona.nombre,
            descripcion: zona.descripcion || '',
            distancia_min_km: zona.distancia_min_km || 0,
            distancia_max_km: zona.distancia_max_km || 0,
            porcentaje_incremento: zona.porcentaje_incremento || 0,
            monto_fijo_extra: zona.monto_fijo_extra || 0,
            activa: zona.activa
        });
        setEditingZona(zona);
        setShowForm(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.nombre) {
            return toast.error('El nombre es requerido');
        }

        try {
            if (editingZona) {
                await api.put(`/admin/zonas-precio/${editingZona.id}`, formData);
                toast.success('Zona actualizada');
            } else {
                await api.post('/admin/zonas-precio', formData);
                toast.success('Zona creada');
            }
            resetForm();
            loadZonas();
        } catch (error) {
            toast.error('Error guardando zona');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar esta zona de precio?')) return;

        try {
            await api.delete(`/admin/zonas-precio/${id}`);
            toast.success('Zona eliminada');
            loadZonas();
        } catch (error) {
            toast.error('Error eliminando zona');
        }
    };

    const calcularPrecioEjemplo = (zona, precioBase = 100) => {
        const incremento = precioBase * ((parseFloat(zona.porcentaje_incremento) || 0) / 100);
        const extra = parseFloat(zona.monto_fijo_extra) || 0;
        return (precioBase + incremento + extra).toFixed(2);
    };

    if (loading) return <Loading />;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Truck className="w-7 h-7 text-blue-600" />
                        Zonas de Precio
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Configura precios diferenciados según la distancia de entrega
                    </p>
                </div>
                <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Nueva Zona
                </Button>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <h3 className="font-medium text-blue-800 mb-2">💡 ¿Cómo funciona?</h3>
                <p className="text-sm text-blue-700">
                    El precio final para clientes en ruta se calcula como:
                    <br />
                    <code className="bg-blue-100 px-2 py-0.5 rounded">Precio Base + (Precio × % Incremento) + Monto Fijo</code>
                </p>
            </div>

            {/* Lista de Zonas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {zonas.map(zona => (
                    <Card key={zona.id} className={`${!zona.activa ? 'opacity-50' : ''}`}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-blue-600" />
                                    {zona.nombre}
                                </CardTitle>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => handleEdit(zona)}
                                        className="p-1 hover:bg-gray-100 rounded"
                                    >
                                        <Edit2 className="w-4 h-4 text-gray-500" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(zona.id)}
                                        className="p-1 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-gray-500 mb-3">{zona.descripcion || 'Sin descripción'}</p>

                            <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Distancia:</span>
                                    <span className="font-medium">{zona.distancia_min_km} - {zona.distancia_max_km} km</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Incremento:</span>
                                    <span className="font-medium text-orange-600">+{zona.porcentaje_incremento}%</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Cargo fijo:</span>
                                    <span className="font-medium text-green-600">+${zona.monto_fijo_extra}</span>
                                </div>
                            </div>

                            <div className="mt-3 pt-3 border-t">
                                <p className="text-xs text-gray-400">Ejemplo: Producto de $100</p>
                                <p className="text-lg font-bold text-blue-600 flex items-center gap-1">
                                    <DollarSign className="w-4 h-4" />
                                    {calcularPrecioEjemplo(zona, 100)} MXN
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {zonas.length === 0 && (
                    <div className="col-span-full text-center py-12 bg-gray-50 rounded-xl">
                        <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No hay zonas configuradas</p>
                        <Button onClick={() => setShowForm(true)} variant="outline" className="mt-4">
                            Crear primera zona
                        </Button>
                    </div>
                )}
            </div>

            {/* Modal Form */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-bold">
                                {editingZona ? 'Editar Zona' : 'Nueva Zona de Precio'}
                            </h2>
                            <button onClick={resetForm} className="p-1 hover:bg-gray-100 rounded-full">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre *</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg p-2"
                                    placeholder="Ej: Zona Suburbana"
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Descripción</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg p-2"
                                    placeholder="Descripción breve"
                                    value={formData.descripcion}
                                    onChange={e => setFormData({ ...formData, descripcion: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Distancia mín (km)</label>
                                    <input
                                        type="number"
                                        className="w-full border rounded-lg p-2"
                                        value={formData.distancia_min_km}
                                        onChange={e => setFormData({ ...formData, distancia_min_km: e.target.value })}
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Distancia máx (km)</label>
                                    <input
                                        type="number"
                                        className="w-full border rounded-lg p-2"
                                        value={formData.distancia_max_km}
                                        onChange={e => setFormData({ ...formData, distancia_max_km: e.target.value })}
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">% Incremento</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            className="w-full border rounded-lg p-2 pr-8"
                                            placeholder="0"
                                            value={formData.porcentaje_incremento}
                                            onChange={e => setFormData({ ...formData, porcentaje_incremento: e.target.value })}
                                            min="0"
                                            step="0.5"
                                        />
                                        <span className="absolute right-3 top-2 text-gray-400">%</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Monto fijo extra</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2 text-gray-400">$</span>
                                        <input
                                            type="number"
                                            className="w-full border rounded-lg p-2 pl-8"
                                            placeholder="0"
                                            value={formData.monto_fijo_extra}
                                            onChange={e => setFormData({ ...formData, monto_fijo_extra: e.target.value })}
                                            min="0"
                                            step="0.5"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 py-2">
                                <input
                                    type="checkbox"
                                    id="activa"
                                    checked={formData.activa}
                                    onChange={e => setFormData({ ...formData, activa: e.target.checked })}
                                    className="rounded"
                                />
                                <label htmlFor="activa" className="text-sm">Zona activa</label>
                            </div>

                            {/* Preview */}
                            <div className="bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 mb-1">Vista previa (producto $100):</p>
                                <p className="text-xl font-bold text-blue-600">
                                    ${calcularPrecioEjemplo(formData, 100)} MXN
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
                                    Cancelar
                                </Button>
                                <Button type="submit" className="flex-1 flex items-center justify-center gap-2">
                                    <Save className="w-4 h-4" />
                                    {editingZona ? 'Actualizar' : 'Crear'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
