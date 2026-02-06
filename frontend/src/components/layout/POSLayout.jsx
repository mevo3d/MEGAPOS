import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { LogOut, ShoppingCart, Menu, Store, DollarSign } from 'lucide-react';
import { Button } from '../ui/Button';

export const POSLayout = ({ children }) => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 overflow-hidden">
            {/* Header Premium */}
            <header className="glass border-b border-white/20 h-16 flex items-center justify-between px-6 z-10 backdrop-blur-xl shadow-lg">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-2 rounded-xl shadow-lg shadow-blue-500/50 cursor-pointer" onClick={() => navigate('/pos')}>
                        <Store className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <div className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent cursor-pointer" onClick={() => navigate('/pos')}>
                            MegaPOS
                        </div>
                        <div className="hidden md:flex items-center text-xs text-gray-500 gap-2">
                            <span className="flex items-center gap-1 mr-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                Suc: {user?.sucursal_id || 'Principal'}
                            </span>

                            <Button variant="ghost" size="sm" className="hidden md:flex text-gray-600 hover:text-blue-600 hover:bg-blue-50" onClick={() => navigate('/pos/preparacion')}>
                                <ShoppingCart className="h-4 w-4 mr-1" />
                                Preparación
                            </Button>

                            <Button variant="ghost" size="sm" className="hidden md:flex text-gray-600 hover:text-green-600 hover:bg-green-50" onClick={() => navigate('/pos/cobro')}>
                                <DollarSign className="h-4 w-4 mr-1" />
                                Caja/Cobro
                            </Button>

                            {/* Mostrar acceso a Admin solo si tiene permisos */}
                            {['admin', 'gerente'].includes(user?.rol) && (
                                <Button variant="ghost" size="sm" className="hidden md:flex text-gray-600 hover:text-purple-600 hover:bg-purple-50" onClick={() => navigate('/admin')}>
                                    <Menu className="h-4 w-4 mr-1" />
                                    Admin
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                        <div className="font-semibold text-gray-900">{user?.nombre}</div>
                        <div className="text-xs text-gray-500 capitalize px-2 py-0.5 bg-blue-100 rounded-full inline-block">
                            {user?.rol}
                        </div>
                    </div>
                    <Button variant="outline" size="icon" onClick={logout} title="Cerrar Sesión" className="hover-lift">
                        <LogOut className="h-5 w-5 text-gray-600" />
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex overflow-hidden">
                {children}
            </main>
        </div>
    );
};

export default POSLayout;
