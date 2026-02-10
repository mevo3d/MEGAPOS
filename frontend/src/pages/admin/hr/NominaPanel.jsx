import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import {
    Calculator, Calendar, TrendingUp, DollarSign,
    ChevronLeft, ChevronRight, Download
} from 'lucide-react';

export default function NominaPanel() {
    const [view, setView] = useState('diario'); // 'diario' o 'semanal'
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, [view, fecha]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const endpoint = view === 'diario'
                ? `/nomina/resumen-diario?fecha=${fecha}`
                : `/nomina/resumen-semanal?inicio=${getInicioSemana(fecha)}&fin=${getFinSemana(fecha)}`;

            const res = await api.get(endpoint);
            setData(res.data);
        } catch (error) {
            console.error('Error fetching nomina:', error);
        } finally {
            setLoading(false);
        }
    };

    const getInicioSemana = (d) => {
        const date = new Date(d);
        const day = date.getDay() || 7;
        if (day !== 1) date.setHours(-24 * (day - 1));
        return date.toISOString().split('T')[0];
    };

    const getFinSemana = (d) => {
        const date = new Date(getInicioSemana(d));
        date.setDate(date.getDate() + 6);
        return date.toISOString().split('T')[0];
    };

    const totals = data.reduce((acc, curr) => ({
        ventas: acc.ventas + parseFloat(curr.total_ventas || 0),
        comisiones: acc.comisiones + parseFloat(curr.total_comision || 0)
    }), { ventas: 0, comisiones: 0 });

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Control de Nómina y Comisiones</h2>
                    <p className="text-gray-500">Corte de ventas por vendedor</p>
                </div>
                <div className="flex bg-white rounded-lg border p-1">
                    <button
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'diario' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        onClick={() => setView('diario')}
                    >
                        Vista Diaria
                    </button>
                    <button
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'semanal' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'
                            }`}
                        onClick={() => setView('semanal')}
                    >
                        Vista Semanal
                    </button>
                </div>
            </div>

            {/* Date Select & Export */}
            <Card className="border-0 shadow-sm bg-white/50 backdrop-blur">
                <CardContent className="p-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" onClick={() => {
                            const d = new Date(fecha);
                            d.setDate(d.getDate() - (view === 'diario' ? 1 : 7));
                            setFecha(d.toISOString().split('T')[0]);
                        }}>
                            <ChevronLeft size={18} />
                        </Button>
                        <div className="flex items-center gap-2 font-semibold text-gray-700 bg-white px-4 py-2 border rounded-lg">
                            <Calendar size={18} className="text-blue-500" />
                            {view === 'diario' ? (
                                new Date(fecha).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
                            ) : (
                                `Semana del ${getInicioSemana(fecha)} al ${getFinSemana(fecha)}`
                            )}
                        </div>
                        <Button variant="outline" size="icon" onClick={() => {
                            const d = new Date(fecha);
                            d.setDate(d.getDate() + (view === 'diario' ? 1 : 7));
                            setFecha(d.toISOString().split('T')[0]);
                        }}>
                            <ChevronRight size={18} />
                        </Button>
                    </div>
                    <Button variant="outline" className="border-green-200 text-green-700 hover:bg-green-50">
                        <Download size={18} className="mr-2" /> Exportar reporte
                    </Button>
                </CardContent>
            </Card>

            {/* Summary totals */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg overflow-hidden relative">
                    <TrendingUp className="absolute right-[-10px] bottom-[-10px] size-32 opacity-10" />
                    <CardContent className="p-6 relative z-10">
                        <p className="text-sm opacity-80 mb-1">Total Ventas Brutas Periodo</p>
                        <h3 className="text-3xl font-bold">${totals.ventas.toLocaleString()}</h3>
                    </CardContent>
                </Card>
                <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg overflow-hidden relative">
                    <Calculator className="absolute right-[-10px] bottom-[-10px] size-32 opacity-10" />
                    <CardContent className="p-6 relative z-10">
                        <p className="text-sm opacity-80 mb-1">Total Comisiones Generadas</p>
                        <h3 className="text-3xl font-bold">${totals.comisiones.toLocaleString()}</h3>
                    </CardContent>
                </Card>
            </div>

            {/* Details Table */}
            <Card className="shadow-xl border-0 overflow-hidden">
                <CardHeader className="bg-gray-50 border-b">
                    <CardTitle className="text-lg">Detalle por Vendedor</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-white text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <th className="px-6 py-4">Vendedor</th>
                                    <th className="px-6 py-4 text-center">Operaciones</th>
                                    <th className="px-6 py-4 text-right">Monto Ventas</th>
                                    <th className="px-6 py-4 text-right">Comisión</th>
                                    <th className="px-6 py-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center py-12 text-gray-400">Cargando datos del periodo...</td></tr>
                                ) : data.length > 0 ? data.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900">{item.nombre}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2.5 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-600">
                                                {item.num_ventas} ventas
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">
                                            ${parseFloat(item.total_ventas).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-block px-3 py-1 bg-green-100 text-green-700 rounded-lg font-bold">
                                                ${parseFloat(item.total_comision).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button variant="ghost" size="sm" className="text-blue-600">Ver Ventas</Button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="5" className="text-center py-12 text-gray-400">No hay ventas registradas en este periodo.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
