import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';
import { DollarSign, TrendingUp, ShoppingBag, CreditCard, Calendar } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';

const BIDashboard = () => {
    const [dateRange, setDateRange] = useState({
        inicio: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        fin: format(new Date(), 'yyyy-MM-dd')
    });

    const { data: ventasData = [] } = useQuery({
        queryKey: ['reporte-ventas', dateRange],
        queryFn: async () => (await api.get(`/reportes/ventas?inicio=${dateRange.inicio}&fin=${dateRange.fin}`)).data
    });

    const { data: topProductos = [] } = useQuery({
        queryKey: ['top-productos'],
        queryFn: async () => (await api.get('/reportes/top-productos')).data
    });

    // Calculate KPIs
    const totalVentas = ventasData.reduce((acc, curr) => acc + Number(curr.total_ventas), 0);
    const totalUtilidad = ventasData.reduce((acc, curr) => acc + Number(curr.utilidad_estimada), 0);
    const numVentas = ventasData.reduce((acc, curr) => acc + Number(curr.num_ventas), 0);
    const ticketPromedio = numVentas > 0 ? totalVentas / numVentas : 0;
    const margenPromedio = totalVentas > 0 ? (totalUtilidad / totalVentas) * 100 : 0;

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Inteligencia de Negocios</h2>
                    <p className="text-gray-500 text-sm">Análisis de rendimiento y toma de decisiones</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm">
                    <Calendar size={18} className="text-gray-400" />
                    <Input
                        type="date"
                        className="w-36 h-8 text-sm"
                        value={dateRange.inicio}
                        onChange={(e) => setDateRange({ ...dateRange, inicio: e.target.value })}
                    />
                    <span className="text-gray-400">-</span>
                    <Input
                        type="date"
                        className="w-36 h-8 text-sm"
                        value={dateRange.fin}
                        onChange={(e) => setDateRange({ ...dateRange, fin: e.target.value })}
                    />
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <p className="font-medium opacity-80">Ventas Totales</p>
                            <DollarSign className="opacity-80" />
                        </div>
                        <h3 className="text-3xl font-bold">${totalVentas.toLocaleString('es-MX', { maximumFractionDigits: 2 })}</h3>
                        <p className="text-sm mt-1 opacity-70">En el periodo seleccionado</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-4 text-gray-500">
                            <p className="font-medium">Utilidad Estimada</p>
                            <TrendingUp className="text-green-500" />
                        </div>
                        <h3 className="text-3xl font-bold text-gray-800">${totalUtilidad.toLocaleString('es-MX', { maximumFractionDigits: 2 })}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                {margenPromedio.toFixed(1)}% Margen
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-4 text-gray-500">
                            <p className="font-medium">Ticket Promedio</p>
                            <CreditCard className="text-purple-500" />
                        </div>
                        <h3 className="text-3xl font-bold text-gray-800">${ticketPromedio.toLocaleString('es-MX', { maximumFractionDigits: 2 })}</h3>
                        <p className="text-sm text-gray-400 mt-1">{numVentas} Transacciones</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-4 text-gray-500">
                            <p className="font-medium">Top Producto</p>
                            <ShoppingBag className="text-orange-500" />
                        </div>
                        {topProductos.length > 0 ? (
                            <div>
                                <h3 className="text-xl font-bold text-gray-800 truncate" title={topProductos[0].nombre}>
                                    {topProductos[0].nombre}
                                </h3>
                                <p className="text-sm text-gray-400 mt-1">{topProductos[0].cantidad_total} Unidades vendidas</p>
                            </div>
                        ) : (
                            <p className="text-gray-400 italic">Sin datos</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico de Tendencia */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Tendencia de Ventas</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={ventasData}>
                                <defs>
                                    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="fecha"
                                    tickFormatter={(str) => format(new Date(str), 'd MMM', { locale: es })}
                                    fontSize={12}
                                />
                                <YAxis fontSize={12} tickFormatter={(val) => `$${val / 1000}k`} />
                                <Tooltip
                                    formatter={(val) => `$${Number(val).toLocaleString()}`}
                                    labelFormatter={(label) => format(new Date(label), 'd MMMM yyyy', { locale: es })}
                                />
                                <Area type="monotone" dataKey="total_ventas" stroke="#3b82f6" fillOpacity={1} fill="url(#colorVentas)" name="Ventas" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Top Productos Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Top 5 Productos (30d)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topProductos.slice(0, 5)} layout="vertical" margin={{ left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="nombre"
                                    type="category"
                                    width={100}
                                    fontSize={11}
                                    tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val}
                                />
                                <Tooltip />
                                <Bar dataKey="cantidad_total" fill="#f97316" radius={[0, 4, 4, 0]} name="Unidades" barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default BIDashboard;
