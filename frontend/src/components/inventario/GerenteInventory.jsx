import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Input } from '../ui/Input';
import { Search, Package, AlertTriangle, ArrowRight, ArrowLeftRight, Activity } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Loading } from '../ui/Loading';
import toast from 'react-hot-toast';

export const GerenteInventory = ({ sucursalId }) => {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const fetchInventario = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/inventario?sucursal_id=${sucursalId}&search=${search}&limit=50`);
            setProductos(res.data);
        } catch (error) {
            console.error('Error cargando inventario:', error);
            toast.error('Error al cargar inventario de sucursal');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (sucursalId) {
            const delayDebounceFn = setTimeout(() => {
                fetchInventario();
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [sucursalId, search]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header / Search */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="w-full md:w-96 relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar en mi inventario (Nombre o SKU)..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border-0 shadow-sm ring-1 ring-gray-200 focus:ring-2 focus:ring-blue-500 transition-all bg-white"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-4">
                    <Badge variant="outline" className="bg-white px-4 py-2 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-500" />
                        <span>{productos.length} Productos registrados</span>
                    </Badge>
                </div>
            </div>

            {loading ? <Loading /> : (
                <Card className="border-0 shadow-xl overflow-hidden glass">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50/50 text-gray-600 text-xs uppercase font-bold border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-4">Producto</th>
                                    <th className="px-6 py-4">SKU</th>
                                    <th className="px-6 py-4 text-center">Existencia Actual</th>
                                    <th className="px-6 py-4 text-center">Estado</th>
                                    <th className="px-6 py-4 text-right">Precio Público</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white/40">
                                {productos.map((prod) => {
                                    const stock = parseInt(prod.stock_fisico || 0);
                                    const hasStock = stock > 0;

                                    return (
                                        <tr key={prod.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900">{prod.nombre}</div>
                                                <div className="text-xs text-gray-500">{prod.categoria}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                                    {prod.sku}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center font-bold">
                                                <span className={`text-lg ${hasStock ? 'text-blue-600' : 'text-gray-400'}`}>
                                                    {stock}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {hasStock ? (
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-0">
                                                        En Stock
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-0 flex items-center gap-1 mx-auto w-fit">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        Sin Existencias
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className="font-bold text-gray-900">
                                                    ${parseFloat(prod.precio || 0).toFixed(2)}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {productos.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center">
                                            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                            <p className="text-gray-500 italic">No se encontraron productos en el catálogo</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-800 text-sm">
                <ArrowLeftRight className="h-5 w-5 flex-shrink-0" />
                <div>
                    <p className="font-bold mb-1">¿Necesitas resurtir?</p>
                    <p>Si algún producto tiene 0 existencias, solicítalo al CEDIS mediante la pestaña de Traspasos o espera a que el administrador realice una dispersión.</p>
                </div>
            </div>
        </div>
    );
};
