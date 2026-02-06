import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../context/authStore';
import api from '../../utils/api';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { DollarSign, Lock, Store, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

export default function AperturaCaja() {
    const { user } = useAuthStore();
    const [cajaAsignada, setCajaAsignada] = useState(null);
    const [loading, setLoading] = useState(true);
    const [montoInicial, setMontoInicial] = useState('');
    const [isOpening, setIsOpening] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const checkCaja = async () => {
            try {
                // 1. Obtener mi caja asignada
                const { data: caja } = await api.get('/cajas/mi-caja');
                setCajaAsignada(caja);

                // 2. Verificar si ya está abierta
                const { data: estado } = await api.get(`/cajas/${caja.id}/estado`);
                if (estado && estado.estado === 'abierta') {
                    // Si ya está abierta, redirigir al POS correspondiente
                    redirigirSegunCaja(caja);
                }
            } catch (error) {
                console.error('Error verificando caja:', error);
                if (error.response?.status === 404) {
                    toast.error('No tienes una caja asignada por el administrador.');
                }
            } finally {
                setLoading(false);
            }
        };

        checkCaja();
    }, []);

    const redirigirSegunCaja = (caja) => {
        if (caja.es_maestra) {
            navigate('/pos');
        } else {
            navigate('/pos/preventa');
        }
    };

    const handleApertura = async (e) => {
        e.preventDefault();
        if (!montoInicial || isNaN(montoInicial)) {
            return toast.error('Ingresa un monto inicial válido');
        }

        setIsOpening(true);
        try {
            await api.post('/cajas/abrir', {
                sucursalId: user.sucursal_id,
                cajaId: cajaAsignada.id,
                montoInicial: parseFloat(montoInicial)
            });

            toast.success('¡Caja abierta con éxito!');
            redirigirSegunCaja(cajaAsignada);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al abrir caja');
        } finally {
            setIsOpening(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-50">Cargando...</div>;

    if (!cajaAsignada) {
        return (
            <div className="h-screen flex items-center justify-center bg-gray-50 p-4">
                <Card className="max-w-md w-full text-center p-8 bg-white shadow-2xl border-0">
                    <Lock className="h-16 w-16 text-red-100 mx-auto mb-4" />
                    <CardTitle className="text-2xl font-bold text-gray-800 mb-2">Acceso Restringido</CardTitle>
                    <p className="text-gray-500 mb-6">Lo sentimos, no tienes una caja asignada en este momento. Por favor, solicita a tu administrador que te asigne una.</p>
                    <Button variant="outline" onClick={() => navigate('/login')} className="w-full">
                        Volver al inicio
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <Card className="max-w-md w-full bg-white shadow-2xl border-0 overflow-hidden">
                <div className="bg-blue-600 p-8 text-white text-center">
                    <Store className="h-12 w-12 mx-auto mb-3 opacity-80" />
                    <h1 className="text-2xl font-bold">Inicio de Turno</h1>
                    <p className="text-blue-100 opacity-80">{cajaAsignada.sucursal_nombre}</p>
                </div>

                <CardContent className="p-8">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Cajero</p>
                                <p className="font-semibold text-gray-800">{user.nombre}</p>
                            </div>
                        </div>

                        <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                            <p className="text-xs text-green-700 font-bold uppercase tracking-wider mb-1">Caja Asignada</p>
                            <p className="text-lg font-bold text-green-800">{cajaAsignada.nombre}</p>
                            <p className="text-xs text-green-600 mt-1">
                                {cajaAsignada.es_maestra ? '★ Caja Principal (Cobro)' : '✦ Caja Esclava (Preventa)'}
                            </p>
                        </div>

                        <form onSubmit={handleApertura} className="space-y-4 pt-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Monto Inicial en Efectivo</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        autoFocus
                                        value={montoInicial}
                                        onChange={(e) => setMontoInicial(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-2 italic">* Ingresa el efectivo base (fondo) que hay en el cajón.</p>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 text-lg font-bold shadow-lg shadow-blue-500/20"
                                isLoading={isOpening}
                            >
                                Confirmar y Abrir Caja
                            </Button>
                        </form>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
