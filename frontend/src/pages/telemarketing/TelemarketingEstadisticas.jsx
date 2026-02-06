import React, { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, Phone, Target, Award, Clock, RefreshCw } from 'lucide-react';
import api from '../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';

export default function TelemarketingEstadisticas() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [periodo, setPeriodo] = useState('semana');

    useEffect(() => {
        fetchEstadisticas();
    }, [periodo]);

    const fetchEstadisticas = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/telemarketing/estadisticas?periodo=${periodo}`);
            setStats(res.data);
        } catch (error) {
            console.error('Error fetching stats', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loading />;

    const maxLlamadas = Math.max(...(stats?.llamadasPorDia?.map(d => d.total) || [1]));

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <BarChart2 className="w-7 h-7 text-indigo-600" />
                        Estadísticas de Efectividad
                    </h1>
                    <p className="text-gray-500 text-sm">Métricas de rendimiento y conversión</p>
                </div>
                <div className="flex gap-2">
                    {['dia', 'semana', 'mes'].map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriodo(p)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${periodo === p
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-white text-gray-600 border hover:bg-gray-50'
                                }`}
                        >
                            {p === 'dia' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Mes'}
                        </button>
                    ))}
                    <Button variant="outline" onClick={fetchEstadisticas}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {stats && (
                <>
                    {/* KPIs Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {/* Total Llamadas */}
                        <div className="bg-white rounded-xl shadow-sm border p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-3xl font-bold text-gray-800">{stats.resumen.totalLlamadas}</p>
                                    <p className="text-sm text-gray-500">Llamadas Totales</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                    <Phone className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </div>

                        {/* Ventas */}
                        <div className="bg-white rounded-xl shadow-sm border p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-3xl font-bold text-green-600">{stats.resumen.ventas}</p>
                                    <p className="text-sm text-gray-500">Ventas Cerradas</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </div>

                        {/* Tasa de Conversión */}
                        <div className="bg-white rounded-xl shadow-sm border p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-3xl font-bold text-indigo-600">{stats.resumen.tasaConversion}%</p>
                                    <p className="text-sm text-gray-500">Tasa de Conversión</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <Target className="w-6 h-6 text-indigo-600" />
                                </div>
                            </div>
                        </div>

                        {/* Meta Diaria */}
                        <div className="bg-white rounded-xl shadow-sm border p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <p className="text-3xl font-bold text-amber-600">
                                        {stats.resumen.llamadasHoy}/{stats.resumen.metaDiaria}
                                    </p>
                                    <p className="text-sm text-gray-500">Meta Hoy</p>
                                </div>
                                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-amber-600" />
                                </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className={`h-2 rounded-full transition-all ${stats.resumen.progresoMeta >= 100 ? 'bg-green-500' : 'bg-amber-500'}`}
                                    style={{ width: `${stats.resumen.progresoMeta}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        {/* Gráfica de Llamadas por Día */}
                        <Card>
                            <CardHeader className="border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <BarChart2 className="w-5 h-5 text-blue-600" />
                                    Llamadas por Día (Últimos 7 días)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="flex items-end gap-2 h-48">
                                    {stats.llamadasPorDia.length > 0 ? (
                                        stats.llamadasPorDia.slice().reverse().map((day, idx) => (
                                            <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                                <div className="relative w-full flex flex-col items-center">
                                                    {/* Barra de Ventas (verde) sobre Llamadas */}
                                                    <div
                                                        className="w-full max-w-12 bg-green-500 rounded-t"
                                                        style={{ height: `${(day.ventas / maxLlamadas) * 150}px` }}
                                                        title={`${day.ventas} ventas`}
                                                    ></div>
                                                    {/* Barra de Llamadas (azul) */}
                                                    <div
                                                        className="w-full max-w-12 bg-blue-500 rounded-t -mt-1"
                                                        style={{ height: `${((day.total - day.ventas) / maxLlamadas) * 150}px` }}
                                                        title={`${day.total} llamadas`}
                                                    ></div>
                                                </div>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {new Date(day.dia).toLocaleDateString('es-MX', { weekday: 'short' })}
                                                </p>
                                                <p className="text-xs font-bold text-gray-700">{day.total}</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="w-full text-center text-gray-400 py-16">
                                            Sin datos para mostrar
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-center gap-6 mt-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-blue-500 rounded"></div>
                                        <span className="text-xs text-gray-500">Llamadas</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-green-500 rounded"></div>
                                        <span className="text-xs text-gray-500">Ventas</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Distribución de Resultados */}
                        <Card>
                            <CardHeader className="border-b">
                                <CardTitle className="flex items-center gap-2">
                                    <Target className="w-5 h-5 text-indigo-600" />
                                    Distribución de Resultados
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                {stats.distribucion.length > 0 ? (
                                    <div className="space-y-3">
                                        {stats.distribucion.map((item, idx) => {
                                            const percentage = stats.resumen.totalLlamadas > 0
                                                ? ((item.value / stats.resumen.totalLlamadas) * 100).toFixed(1)
                                                : 0;
                                            return (
                                                <div key={idx}>
                                                    <div className="flex justify-between text-sm mb-1">
                                                        <span className="font-medium text-gray-700">{item.label}</span>
                                                        <span className="text-gray-500">{item.value} ({percentage}%)</span>
                                                    </div>
                                                    <div className="w-full bg-gray-200 rounded-full h-3">
                                                        <div
                                                            className="h-3 rounded-full transition-all"
                                                            style={{
                                                                width: `${percentage}%`,
                                                                backgroundColor: item.color
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-400 py-16">
                                        Sin datos para mostrar
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Ranking */}
                    <Card>
                        <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-yellow-50">
                            <CardTitle className="flex items-center gap-2 text-amber-700">
                                <Award className="w-5 h-5" />
                                Ranking del Equipo
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {stats.ranking.length > 0 ? (
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                                        <tr>
                                            <th className="p-3 text-left">#</th>
                                            <th className="p-3 text-left">Operador</th>
                                            <th className="p-3 text-center">Llamadas</th>
                                            <th className="p-3 text-center">Ventas</th>
                                            <th className="p-3 text-center">Conversión</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {stats.ranking.map((user) => (
                                            <tr
                                                key={user.id}
                                                className={`${user.esUsuarioActual ? 'bg-indigo-50 font-bold' : 'hover:bg-gray-50'}`}
                                            >
                                                <td className="p-3">
                                                    {user.posicion === 1 && <span className="text-yellow-500">🥇</span>}
                                                    {user.posicion === 2 && <span className="text-gray-400">🥈</span>}
                                                    {user.posicion === 3 && <span className="text-amber-600">🥉</span>}
                                                    {user.posicion > 3 && <span className="text-gray-500">{user.posicion}</span>}
                                                </td>
                                                <td className="p-3">
                                                    {user.nombre}
                                                    {user.esUsuarioActual && (
                                                        <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Tú</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center">{user.llamadas}</td>
                                                <td className="p-3 text-center text-green-600 font-bold">{user.ventas}</td>
                                                <td className="p-3 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs ${user.tasaConversion >= 10 ? 'bg-green-100 text-green-700' :
                                                            user.tasaConversion >= 5 ? 'bg-amber-100 text-amber-700' :
                                                                'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {user.tasaConversion}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="text-center text-gray-400 py-8">
                                    Sin datos de ranking disponibles
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
