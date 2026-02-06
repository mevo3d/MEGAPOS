import React, { useEffect, useState } from 'react';
import { Map, Plus, Search } from 'lucide-react';
import api from '../../utils/api';
import { Loading } from '../../components/ui/Loading';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import toast from 'react-hot-toast';

export default function GestionUbicaciones() {
    const [ubicaciones, setUbicaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedUbicacion, setSelectedUbicacion] = useState(null);
    const [contenido, setContenido] = useState([]);

    // Form
    const [codigo, setCodigo] = useState('');
    const [tipo, setTipo] = useState('general');
    const [notas, setNotas] = useState('');

    // Search
    const [skuSearch, setSkuSearch] = useState('');
    const [foundLocs, setFoundLocs] = useState([]);

    useEffect(() => {
        fetchUbicaciones();
    }, []);

    const fetchUbicaciones = async () => {
        try {
            const res = await api.get('/cedis/ubicaciones');
            setUbicaciones(res.data);
            setLoading(false);
        } catch (error) {
            console.error(error);
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/cedis/ubicaciones', { codigo, tipo, notas });
            toast.success('Ubicación creada');
            setShowModal(false);
            setCodigo('');
            setNotas('');
            fetchUbicaciones();
        } catch (error) {
            toast.error('Error al crear ubicación');
        }
    };

    const handleViewContent = async (ubi) => {
        try {
            const res = await api.get(`/cedis/ubicaciones/${ubi.id}/contenido`);
            setContenido(res.data);
            setSelectedUbicacion(ubi);
        } catch (error) {
            toast.error('Error cargando contenido');
        }
    };

    const handleSearchProduct = async (e) => {
        e.preventDefault();
        if (!skuSearch) return;
        try {
            const res = await api.get(`/cedis/ubicaciones/buscar?sku=${skuSearch}`);
            setFoundLocs(res.data);
            if (res.data.length === 0) toast.error('Producto no encontrado en ubicación');
        } catch (error) {
            toast.error('Error en búsqueda');
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Map className="w-8 h-8 text-indigo-600" />
                    Gestión de Ubicaciones
                </h1>

                {/* Product Search */}
                <form onSubmit={handleSearchProduct} className="flex gap-2 w-full md:w-auto">
                    <input
                        className="border p-2 rounded-lg w-full"
                        placeholder="Buscar SKU..."
                        value={skuSearch}
                        onChange={e => setSkuSearch(e.target.value)}
                    />
                    <Button type="submit" variant="secondary"><Search className="w-4 h-4" /></Button>
                </form>

                <Button onClick={() => setShowModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Nueva Ubicación
                </Button>
            </div>

            {/* Search Results */}
            {foundLocs.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-4 overflow-x-auto">
                    <div className="font-bold text-blue-800 whitespace-nowrap">Resultados para {skuSearch}:</div>
                    {foundLocs.map((loc, i) => (
                        <div key={i} className="bg-white px-3 py-1 rounded-full text-sm font-mono border border-blue-200">
                            {loc.codigo} ({loc.cantidad})
                        </div>
                    ))}
                    <button onClick={() => { setFoundLocs([]); setSkuSearch(''); }} className="text-blue-500 hover:text-blue-700">✕</button>
                </div>
            )}

            {loading ? <Loading /> : (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {ubicaciones.map(u => (
                        <Card
                            key={u.id}
                            className="hover:border-indigo-300 transition-colors cursor-pointer group"
                            onClick={() => handleViewContent(u)}
                        >
                            <CardContent className="p-4 relative">
                                <h3 className="text-xl font-bold text-gray-800">{u.codigo}</h3>
                                <div className="mt-2 flex justify-between items-end">
                                    <span className={`text-xs px-2 py-1 rounded-full uppercase ${u.tipo === 'refrigerado' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {u.tipo}
                                    </span>
                                    {u.notas && <span className="text-xs text-gray-400 max-w-[100px] truncate" title={u.notas}>{u.notas}</span>}
                                </div>
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Search className="w-4 h-4 text-indigo-400" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {ubicaciones.length === 0 && (
                        <div className="col-span-full text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed">
                            No hay ubicaciones definidas. Crea una para empezar (Ej: A-01).
                        </div>
                    )}
                </div>
            )}

            {/* Modal Create */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-md">
                        <CardHeader>
                            <CardTitle>Nueva Ubicación</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Código (Ej: A-01-01)</label>
                                    <input
                                        className="w-full border p-2 rounded"
                                        value={codigo}
                                        onChange={e => setCodigo(e.target.value.toUpperCase())}
                                        required
                                        placeholder="PASILLO-ESTANTE-NIVEL"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Tipo</label>
                                    <select
                                        className="w-full border p-2 rounded"
                                        value={tipo}
                                        onChange={e => setTipo(e.target.value)}
                                    >
                                        <option value="general">General</option>
                                        <option value="refrigerado">Refrigerado</option>
                                        <option value="dañado">Cuarentena / Dañado</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Notas</label>
                                    <textarea
                                        className="w-full border p-2 rounded"
                                        value={notas}
                                        onChange={e => setNotas(e.target.value)}
                                    ></textarea>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancelar</Button>
                                    <Button type="submit">Guardar</Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Modal View Content */}
            {selectedUbicacion && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-lg max-h-[80vh] flex flex-col">
                        <CardHeader className="flex flex-row justify-between items-center">
                            <CardTitle>Contenido: {selectedUbicacion.codigo}</CardTitle>
                            <button onClick={() => setSelectedUbicacion(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </CardHeader>
                        <CardContent className="overflow-y-auto p-4">
                            {contenido.length === 0 ? (
                                <p className="text-center text-gray-400 py-8">Ubicación vacía</p>
                            ) : (
                                <div className="space-y-2">
                                    {contenido.map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                            <div className="w-10 h-10 bg-white rounded border flex items-center justify-center text-[10px] text-gray-400">IMG</div>
                                            <div className="flex-1">
                                                <p className="font-bold text-sm">{item.nombre}</p>
                                                <p className="text-xs text-gray-500">{item.sku}</p>
                                            </div>
                                            <div className="font-mono font-bold text-blue-600">{item.cantidad}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

