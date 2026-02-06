import React, { useEffect, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Loading } from '../../components/ui/Loading';

export default function RutaInventario() {
    const navigate = useNavigate();
    const [inventario, setInventario] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        api.get('/rutero/inventario')
            .then(res => setInventario(res.data))
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const filtered = inventario.filter(i =>
        i.nombre.toLowerCase().includes(search.toLowerCase()) ||
        i.sku.includes(search)
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white p-4 flex items-center gap-4 shadow-sm sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-700" />
                </button>
                <h1 className="text-lg font-bold text-gray-800">Mi Inventario</h1>
            </header>

            <div className="p-4 flex-1 overflow-y-auto">
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                        type="search"
                        placeholder="Buscar producto..."
                        className="w-full pl-10 pr-4 py-2 rounded-xl border-gray-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                {loading ? <Loading /> : (
                    <div className="space-y-3">
                        {filtered.map((prod, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center">
                                    {prod.imagen_url ? (
                                        <img src={prod.imagen_url} alt="" className="w-full h-full object-cover rounded-lg" />
                                    ) : (
                                        <span className="text-xs text-gray-400">N/A</span>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-gray-900 truncate">{prod.nombre}</h3>
                                    <p className="text-sm text-gray-500">SKU: {prod.sku}</p>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xl font-bold text-blue-600">{prod.cantidad}</span>
                                    <span className="text-xs text-gray-400">unidades</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
