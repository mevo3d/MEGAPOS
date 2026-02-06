import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../utils/api';
import { useAuthStore } from '../../context/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { DollarSign, Lock, Unlock, TrendingUp, TrendingDown, History } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CorteCaja() {
    const [estado, setEstado] = useState(null); // 'abierta', 'cerrada', 'loading'
    const [loading, setLoading] = useState(true);
    const [historial, setHistorial] = useState([]);
    const { user } = useAuthStore();

    // Forms
    const { register: registerAbrir, handleSubmit: handleSubmitAbrir } = useForm();
    const { register: registerCerrar, handleSubmit: handleSubmitCerrar } = useForm();
    const { register: registerMov, handleSubmit: handleSubmitMov, reset: resetMov } = useForm();

    const cajaId = 1; // TODO: Obtener del config local o usuario

    useEffect(() => {
        cargarDatos();
    }, []);

    const cargarDatos = async () => {
        try {
            const [resEstado, resHistorial] = await Promise.all([
                api.get(`/cajas/${cajaId}/estado`),
                api.get(`/cajas/${cajaId}/historial`)
            ]);
            setEstado(resEstado.data);
            setHistorial(resHistorial.data);
        } catch (error) {
            console.error(error);
            toast.error('Error cargando estado de caja');
        } finally {
            setLoading(false);
        }
    };

    const onAbrir = async (data) => {
        try {
            await api.post('/cajas/abrir', {
                sucursalId: user.sucursal_id,
                cajaId,
                montoInicial: parseFloat(data.montoInicial)
            });
            toast.success('Caja abierta correctamente');
            cargarDatos();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al abrir caja');
        }
    };

    const onCerrar = async (data) => {
        try {
            await api.post(`/cajas/${cajaId}/cerrar`, {
                totalFisico: parseFloat(data.totalFisico),
                observaciones: data.observaciones
            });
            toast.success('Caja cerrada correctamente');
            cargarDatos();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al cerrar caja');
        }
    };

    const onMovimiento = async (data) => {
        try {
            await api.post(`/cajas/${cajaId}/movimiento`, {
                tipo: data.tipo,
                monto: parseFloat(data.monto),
                concepto: data.concepto
            });
            toast.success('Movimiento registrado');
            resetMov();
            cargarDatos(); // Recargar para ver nuevos totales si tuvieramos endpoint
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error registrando movimiento');
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando...</div>;

    const isAbierta = estado && estado.estado === 'abierta';

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-8 animate-fade-in">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    {isAbierta ? <Unlock className="text-green-500" /> : <Lock className="text-red-500" />}
                    Gestión de Caja
                </h1>
                <div className={`px-4 py-1 rounded-full text-sm font-semibold ${isAbierta ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {isAbierta ? 'CAJA ABIERTA' : 'CAJA CERRADA'}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Panel Izquierdo: Acción Principal */}
                <Card className="shadow-lg border-0 glass hover-lift">
                    <CardHeader>
                        <CardTitle>{isAbierta ? 'Cierre de Caja' : 'Apertura de Caja'}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {!isAbierta ? (
                            <form onSubmit={handleSubmitAbrir(onAbrir)} className="space-y-4">
                                <div className="p-4 bg-blue-50 rounded-lg text-sm text-blue-700 mb-4">
                                    👋 Hola <b>{user.nombre}</b>. Ingresa el monto inicial para comenzar el turno.
                                </div>
                                <Input
                                    label="Monto Inicial en Efectivo"
                                    type="number"
                                    step="0.01"
                                    {...registerAbrir('montoInicial', { required: true })}
                                    placeholder="0.00"
                                    icon={DollarSign}
                                />
                                <Button type="submit" className="w-full gradient-primary">
                                    Abrir Caja
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={handleSubmitCerrar(onCerrar)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <p className="text-xs text-gray-500">Apertura</p>
                                        <p className="font-bold text-lg">${parseFloat(estado.monto_inicial).toFixed(2)}</p>
                                    </div>
                                    <div className="p-3 bg-green-50 rounded-lg">
                                        <p className="text-xs text-gray-500">Ventas Efec.</p>
                                        <p className="font-bold text-lg text-green-700">${parseFloat(estado.ventas_efectivo).toFixed(2)}</p>
                                    </div>
                                </div>

                                <Input
                                    label="Total Físico (Conteo real)"
                                    type="number"
                                    step="0.01"
                                    {...registerCerrar('totalFisico', { required: true })}
                                    placeholder="0.00"
                                    icon={DollarSign}
                                />
                                <Input
                                    label="Observaciones"
                                    {...registerCerrar('observaciones')}
                                    placeholder="Diferencias, notas..."
                                />
                                <Button type="submit" variant="danger" className="w-full">
                                    Realizar Corte
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>

                {/* Panel Derecho: Movimientos Extras (Solo si abierta) */}
                {isAbierta && (
                    <Card className="shadow-lg border-0 glass hover-lift">
                        <CardHeader>
                            <CardTitle>Registrar Entradas/Salidas</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmitMov(onMovimiento)} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-green-50 transition-colors">
                                        <input type="radio" value="ingreso" {...registerMov('tipo', { required: true })} />
                                        <TrendingUp className="text-green-500 h-5 w-5" />
                                        <span className="font-medium">Ingreso Extra</span>
                                    </label>
                                    <label className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-red-50 transition-colors">
                                        <input type="radio" value="retiro" {...registerMov('tipo', { required: true })} />
                                        <TrendingDown className="text-red-500 h-5 w-5" />
                                        <span className="font-medium">Retiro / Gasto</span>
                                    </label>
                                </div>

                                <Input
                                    label="Monto"
                                    type="number"
                                    step="0.01"
                                    {...registerMov('monto', { required: true })}
                                    placeholder="0.00"
                                />
                                <Input
                                    label="Concepto"
                                    {...registerMov('concepto', { required: true })}
                                    placeholder="Ej. Pago de luz, Cambio..."
                                />
                                <Button type="submit" variant="outline" className="w-full">
                                    Registrar Movimiento
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Historial de Cierres */}
            <Card className="mt-8 border-0 shadow-xl">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="text-blue-500" />
                        Historial de Cierres Recientes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">Fecha Cierre</th>
                                    <th className="px-4 py-3">Empleado</th>
                                    <th className="px-4 py-3">Sistema</th>
                                    <th className="px-4 py-3">Físico</th>
                                    <th className="px-4 py-3">Diferencia</th>
                                    <th className="px-4 py-3">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historial.map((cierre) => (
                                    <tr key={cierre.id} className="border-b hover:bg-gray-50">
                                        <td className="px-4 py-3">{new Date(cierre.fecha_cierre).toLocaleString()}</td>
                                        <td className="px-4 py-3">{cierre.empleado_nombre}</td>
                                        <td className="px-4 py-3 font-medium">${parseFloat(cierre.total_sistema).toFixed(2)}</td>
                                        <td className="px-4 py-3 font-medium">${parseFloat(cierre.total_fisico).toFixed(2)}</td>
                                        <td className={`px-4 py-3 font-bold ${parseFloat(cierre.diferencia) === 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {parseFloat(cierre.diferencia) > 0 ? '+' : ''}{parseFloat(cierre.diferencia).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="px-2 py-1 bg-gray-200 rounded text-xs">Cerrada</span>
                                        </td>
                                    </tr>
                                ))}
                                {historial.length === 0 && (
                                    <tr>
                                        <td colSpan="6" className="text-center py-4 text-gray-500">No hay historial disponible</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
