import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, Plus, Check, Truck, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../context/authStore';

export default function Traspasos() {
    const { user } = useAuthStore();
    const [traspasos, setTraspasos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    // Form state
    const [sucursales, setSucursales] = useState([]);
    const [selectedSucursal, setSelectedSucursal] = useState(''); // Origen (si pido)
    const [productos, setProductos] = useState([]); // Catálogo para elegir
    const [itemsSolicitud, setItemsSolicitud] = useState([]);
    const [productoSearch, setProductoSearch] = useState('');
    const [notas, setNotas] = useState('');

    useEffect(() => {
        fetchTraspasos();
        fetchAuxData();
    }, []);

    const fetchTraspasos = async () => {
        try {
            const res = await api.get('/traspasos');
            setTraspasos(res.data);
        } catch (error) {
            console.error('Error fetching traspasos:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAuxData = async () => {
        try {
            const [sucRes, prodRes] = await Promise.all([
                api.get('/sucursales'),
                api.get('/inventario?limit=1000') // Optimizar luego con búsqueda dinámica
            ]);
            setSucursales(sucRes.data);
            setProductos(prodRes.data);
        } catch (error) {
            console.error('Error loading aux data:', error);
        }
    };

    const handleAddItem = (producto) => {
        if (itemsSolicitud.find(i => i.id === producto.id)) return;
        setItemsSolicitud([...itemsSolicitud, { ...producto, cantidad: 1 }]);
        setProductoSearch('');
    };

    const handleRemoveItem = (id) => {
        setItemsSolicitud(itemsSolicitud.filter(i => i.id !== id));
    };

    const updateCantidad = (id, cant) => {
        setItemsSolicitud(itemsSolicitud.map(i => i.id === id ? { ...i, cantidad: parseInt(cant) || 1 } : i));
    };

    const handleSubmit = async () => {
        if (!selectedSucursal) return toast.error('Selecciona una sucursal de origen');
        if (itemsSolicitud.length === 0) return toast.error('Agrega productos a la solicitud');

        try {
            const payload = {
                origen_sucursal_id: selectedSucursal,
                items: itemsSolicitud.map(i => ({ producto_id: i.id, cantidad: i.cantidad })),
                notas
            };
            await api.post('/traspasos', payload);
            toast.success('Solicitud enviada correctamente');
            setShowModal(false);
            setItemsSolicitud([]);
            setNotas('');
            fetchTraspasos();
        } catch (error) {
            toast.error('Error al solicitar traspaso');
        }
    };

    const handleAprobar = async (id) => {
        if (!confirm('¿Aprobar envío de mercancía? Se descontará de tu inventario.')) return;
        try {
            await api.post(`/traspasos/${id}/aprobar`);
            toast.success('Traspaso aprobado y enviado');
            fetchTraspasos();
        } catch (error) {
            toast.error('Error al aprobar: ' + (error.response?.data?.message || ''));
        }
    };

    const handleRecibir = async (id) => {
        if (!confirm('¿Confirmar recepción de mercancía? Se sumará a tu inventario.')) return;
        try {
            await api.post(`/traspasos/${id}/recibir`);
            toast.success('Mercancía recibida correctamente');
            fetchTraspasos();
        } catch (error) {
            toast.error('Error al recibir: ' + (error.response?.data?.message || ''));
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'solicitada':
            case 'pendiente': return <Badge variant="warning">Pendiente</Badge>;
            case 'en_transito':
            case 'en_camino': return <Badge variant="info">En Tránsito</Badge>;
            case 'completada':
            case 'recibido': return <Badge variant="success">Completado</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    // Filtrar productos para búsqueda
    const filteredProductos = productoSearch
        ? productos.filter(p => p.nombre.toLowerCase().includes(productoSearch.toLowerCase()) || p.sku.includes(productoSearch))
        : [];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <ArrowLeftRight className="h-6 w-6 text-blue-600" />
                    Traspasos entre Sucursales
                </h1>
                <Button onClick={() => setShowModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Solicitud
                </Button>
            </div>

            {loading ? <Loading /> : (
                <div className="grid gap-4">
                    {traspasos.map(t => (
                        <Card key={t.id} className={`overflow-hidden transition-all ${t.estado === 'en_transito' || t.estado === 'en_camino' ? 'border-2 border-green-500 bg-green-50/30 ring-2 ring-green-100' : 'hover:shadow-md'}`}>
                            <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-gray-700">#{t.id}</span>
                                        {getStatusBadge(t.estado)}
                                        <span className="text-sm text-gray-500">
                                            {new Date(t.fecha_creacion || t.created_at || t.fecha_solicitud).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="font-medium text-gray-900">{t.origen_nombre}</span>
                                        <span className="mx-2 text-gray-400">→</span>
                                        <span className="font-medium text-gray-900">{t.destino_nombre}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Solicitado por: {t.solicitante || 'Sistema'}</p>
                                </div>

                                <div className="flex items-center gap-2">
                                    {/* Lógica de botones según rol y estado */}
                                    {/* Aprobar: Solo si soy Origen (quien envía) y está pendiente */}
                                    {/* (Nota: user.sucursal_id debe coincidir con origen_sucursal_id para aprobar) */}
                                    {/* Por ahora simplificamos: Bodegueros/Admin aprueban cualquiera pendiente */}

                                    {t.estado === 'pendiente' && (
                                        <Button size="sm" variant="outline" onClick={() => handleAprobar(t.id)}>
                                            <Truck className="h-4 w-4 mr-1" />
                                            Aprobar Envío
                                        </Button>
                                    )}

                                    {/* Recibir: Solo si soy Destino y está en camino */}
                                    {(t.estado === 'en_transito' || t.estado === 'en_camino') && (
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleRecibir(t.id)}>
                                            <Check className="h-4 w-4 mr-1" />
                                            Confirmar Recepción
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))}
                    {traspasos.length === 0 && (
                        <div className="text-center py-10 text-gray-500">No hay traspasos registrados</div>
                    )}
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                    <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <CardHeader>
                            <CardTitle>Solicitar Mercancía</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Origen (¿A quién le pides?)</label>
                                <select
                                    className="w-full border rounded-lg p-2"
                                    value={selectedSucursal}
                                    onChange={e => setSelectedSucursal(e.target.value)}
                                >
                                    <option value="">Selecciona sucursal...</option>
                                    {sucursales.map(s => (
                                        // No mostrar mi propia sucursal como origen
                                        // (Assuming user store id check later, for now show all)
                                        <option key={s.id} value={s.id}>{s.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Producto</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg p-2"
                                    placeholder="Nombre o SKU..."
                                    value={productoSearch}
                                    onChange={e => setProductoSearch(e.target.value)}
                                />
                                {filteredProductos.length > 0 && (
                                    <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                                        {filteredProductos.map(p => (
                                            <div
                                                key={p.id}
                                                className="p-2 hover:bg-gray-100 cursor-pointer flex justify-between"
                                                onClick={() => handleAddItem(p)}
                                            >
                                                <span>{p.nombre}</span>
                                                <span className="text-xs text-gray-500">{p.sku}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Productos Solicitados</label>
                                {itemsSolicitud.map(item => (
                                    <div key={item.id} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                                        <div className="flex-1 text-sm font-medium">{item.nombre}</div>
                                        <input
                                            type="number"
                                            className="w-20 border rounded p-1 text-center"
                                            value={item.cantidad}
                                            onChange={(e) => updateCantidad(item.id, e.target.value)}
                                            min="1"
                                        />
                                        <button onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-700">
                                            &times;
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notas Adicionales</label>
                                <textarea
                                    className="w-full border rounded-lg p-2"
                                    rows="2"
                                    value={notas}
                                    onChange={e => setNotas(e.target.value)}
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                                <Button onClick={handleSubmit}>Enviar Solicitud</Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
