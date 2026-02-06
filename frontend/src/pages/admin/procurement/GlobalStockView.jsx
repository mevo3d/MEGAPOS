import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card';
import { Search, Globe, AlertTriangle } from 'lucide-react';
import api from '../../../../utils/api';

export default function GlobalStockView() {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchGlobalStock();
    }, []);

    const fetchGlobalStock = async () => {
        setLoading(true);
        try {
            const res = await api.get('/inventario/global');
            setProductos(res.data);
        } catch (error) {
            console.error('Error cargando stock global', error);
        } finally {
            setLoading(false);
        }
    };

    const filtered = productos.filter(p =>
        p.nombre.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="text-blue-600" />
                        Visión Global de Inventario
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar en todas las sucursales..."
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto border rounded-xl shadow-sm">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-4">SKU</th>
                                    <th className="px-6 py-4">Producto</th>
                                    <th className="px-6 py-4">Categoría</th>
                                    <th className="px-6 py-4 text-center">Total Global</th>
                                    <th className="px-6 py-4 text-center">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center py-8">Cargando inventario global...</td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan="5" className="text-center py-8 text-gray-500">No se encontraron productos</td></tr>
                                ) : (
                                    filtered.map((prod) => (
                                        <tr key={prod.id} className="border-b hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 font-mono text-gray-500">{prod.sku}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{prod.nombre}</td>
                                            <td className="px-6 py-4 text-gray-500">{prod.categoria || '-'}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full font-bold ${prod.stock_global_total <= 0 ? 'bg-red-100 text-red-700' :
                                                        prod.stock_global_total < 10 ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-green-100 text-green-700'
                                                    }`}>
                                                    {prod.stock_global_total}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {prod.stock_global_total <= 0 && (
                                                    <span className="flex justify-center items-center text-red-500 gap-1 text-xs font-bold">
                                                        <AlertTriangle size={14} /> Agotado en Red
                                                    </span>
                                                )}
                                                {prod.stock_global_total > 0 && prod.stock_global_total < 10 && (
                                                    <span className="text-yellow-600 text-xs font-semibold">Bajo Stock Global</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
