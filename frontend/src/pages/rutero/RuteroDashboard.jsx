import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '../../components/ui/Card';
import { Truck, ShoppingCart, MapPin, Package, LogOut, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useAuthStore } from '../../context/authStore';
import { Loading } from '../../components/ui/Loading';

export default function RuteroDashboard() {
    const navigate = useNavigate();
    const { logout, user } = useAuthStore();
    const [rutaInfo, setRutaInfo] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInfo();
    }, []);

    const fetchInfo = async () => {
        try {
            const res = await api.get('/rutero/info');
            setRutaInfo(res.data);
        } catch (error) {
            console.error('Error fetching ruta info:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-100"><Loading /></div>;

    const MenuButton = ({ icon: Icon, title, subtitle, color, onClick }) => (
        <button
            onClick={onClick}
            className={`w-full p-4 rounded-2xl shadow-lg flex items-center gap-4 transition-transform active:scale-95 ${color} text-white`}
        >
            <div className="bg-white/20 p-3 rounded-full">
                <Icon className="w-8 h-8" />
            </div>
            <div className="text-left">
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="text-sm opacity-90">{subtitle}</p>
            </div>
        </button>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header Mobile */}
            <header className="bg-blue-700 text-white p-6 rounded-b-3xl shadow-lg z-10 sticky top-0">
                <div className="flex justify-between items-center mb-2">
                    <div>
                        <h1 className="text-xl font-bold">Hola, {user?.nombre?.split(' ')[0]}</h1>
                        <p className="text-sm opacity-80">{rutaInfo ? `Ruta: ${rutaInfo.nombre}` : 'Sin ruta asignada'}</p>
                    </div>
                    <button onClick={fetchInfo} className="p-2 bg-white/10 rounded-full hover:bg-white/20">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </header>

            {/* Main Menu Grid */}
            <div className="flex-1 p-6 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-1 gap-4">
                    <MenuButton
                        icon={ShoppingCart}
                        title="Nueva Venta"
                        subtitle="Cobrar pedido en ruta"
                        color="bg-gradient-to-r from-green-500 to-emerald-600"
                        onClick={() => navigate('/rutero/venta')}
                    />

                    <MenuButton
                        icon={MapPin}
                        title="Visitas / Clientes"
                        subtitle="Check-in y recorrido"
                        color="bg-gradient-to-r from-blue-500 to-indigo-600"
                        onClick={() => navigate('/rutero/visitas')}
                    />

                    <MenuButton
                        icon={Package}
                        title="Mi Inventario"
                        subtitle="Stock en camioneta"
                        color="bg-gradient-to-r from-orange-400 to-amber-500"
                        onClick={() => navigate('/rutero/inventario')}
                    />

                    <MenuButton
                        icon={Truck}
                        title="Cargar / Descargar"
                        subtitle="Gestión de mercancía"
                        color="bg-gradient-to-r from-gray-600 to-gray-700"
                        onClick={() => navigate('/rutero/carga')} // TODO: Implement if needed or use Traspasos
                    />
                </div>
            </div>

            {/* Footer Logout */}
            <div className="p-6">
                <button
                    onClick={logout}
                    className="w-full py-3 text-red-500 font-medium flex items-center justify-center gap-2 bg-red-50 rounded-xl"
                >
                    <LogOut className="w-5 h-5" />
                    Cerrar Sesión
                </button>
            </div>
        </div>
    );
}
