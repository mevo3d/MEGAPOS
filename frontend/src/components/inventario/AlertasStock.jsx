import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Loading } from '../ui/Loading';

export const AlertasStock = () => {
    const [alertas, setAlertas] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAlertas = async () => {
        setLoading(true);
        try {
            const res = await api.get('/inventario/bajo-stock');
            setAlertas(res.data);
        } catch (error) {
            console.error('Error cargando alertas:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlertas();
    }, []);

    const getUrgency = (stock, min) => {
        if (stock === 0) return { label: 'CRÍTICO', color: 'bg-red-100 text-red-800 border-red-200' };
        if (stock <= min * 0.5) return { label: 'ALTA', color: 'bg-orange-100 text-orange-800 border-orange-200' };
        return { label: 'MEDIA', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    };

    if (loading) return <Loading size="sm" />;

    if (alertas.length === 0) {
        return (
            <Card className="h-full border-green-100 bg-green-50/50">
                <CardContent className="flex flex-col items-center justify-center p-6 text-green-700 h-full">
                    <div className="rounded-full bg-green-100 p-3 mb-2">
                        <span className="text-2xl">✓</span>
                    </div>
                    <p className="font-medium">Inventario Saludable</p>
                    <p className="text-xs opacity-75">No hay productos con stock bajo</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full flex flex-col shadow-md border-red-100">
            <CardHeader className="pb-2 border-b border-gray-100 bg-red-50/30">
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center gap-2 text-red-700 text-lg">
                        <AlertTriangle className="h-5 w-5" />
                        Alertas de Stock
                        <Badge variant="danger" className="ml-1 rounded-full px-2">
                            {alertas.length}
                        </Badge>
                    </CardTitle>
                    <button onClick={fetchAlertas} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <RefreshCw className="h-4 w-4" />
                    </button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
                <div className="divide-y divide-gray-100">
                    {alertas.map((item, idx) => {
                        const urgency = getUrgency(item.stock_fisico, item.minimo_stock);
                        return (
                            <div key={idx} className="p-3 hover:bg-gray-50 transition-colors flex justify-between items-center group">
                                <div className="min-w-0 flex-1 pr-3">
                                    <p className="font-medium text-gray-800 truncate text-sm" title={item.nombre}>
                                        {item.nombre}
                                    </p>
                                    <p className="text-xs text-gray-500 font-mono">SKU: {item.sku}</p>
                                </div>
                                <div className="text-right flex flex-col items-end gap-1">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${urgency.color}`}>
                                        {urgency.label}
                                    </span>
                                    <div className="text-xs text-gray-600 font-medium">
                                        <span className="text-red-600 font-bold">{item.stock_fisico}</span> / {item.minimo_stock}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};
