import React from 'react';
import { useAuthStore } from '../../context/authStore';
import { Button } from '../ui/Button';
import { LogOut, Activity, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminLayout({ children, title = "Panel de Control", subtitle }) {
    const { logout, user } = useAuthStore();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-purple-50/30">
            {/* Header Premium */}
            <header className="glass border-b border-white/20 sticky top-0 z-50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100/50 rounded-full transition-colors" title="Volver">
                                <ArrowLeft className="h-5 w-5 text-gray-600" />
                            </button>
                            <div className="bg-gradient-to-br from-blue-600 to-purple-600 p-3 rounded-xl shadow-lg shadow-blue-500/50">
                                <Activity className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                                    {title}
                                </h1>
                                <p className="text-sm text-gray-500">{subtitle || `Bienvenido, ${user?.nombre}`}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <Button variant="outline" onClick={logout} className="hover-lift">
                                <LogOut className="h-4 w-4 mr-2" />
                                Salir
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto px-6 py-8">
                {children}
            </div>
        </div>
    );
}
