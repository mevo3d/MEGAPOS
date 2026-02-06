import React, { useState } from 'react';
import { ArrowLeftRight, Truck, History } from 'lucide-react';
import DispersionInventario from './inventario/DispersionInventario';
import TraspasosList from '../inventario/Traspasos'; // Renaming import for clarity if needed, or just Traspasos

export default function TraspasosPanel() {
    const [activeTab, setActiveTab] = useState('recepcion'); // Default to list to see pending items

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                        <ArrowLeftRight className="text-blue-600" />
                        Centro de Traspasos
                    </h1>
                    <p className="text-gray-500 text-sm">Gestiona el movimiento de inventario entre sucursales.</p>
                </div>

                <div className="flex bg-white p-1 rounded-lg border shadow-sm">
                    <button
                        onClick={() => setActiveTab('recepcion')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${activeTab === 'recepcion'
                                ? 'bg-blue-100 text-blue-700 font-medium'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <History size={18} />
                        Historial y Recepción
                    </button>
                    <button
                        onClick={() => setActiveTab('envio')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${activeTab === 'envio'
                                ? 'bg-blue-600 text-white font-medium shadow-md'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Truck size={18} />
                        Nuevo Envío (Dispersión)
                    </button>
                </div>
            </div>

            {activeTab === 'envio' && (
                <div className="animate-slide-up">
                    <DispersionInventario />
                </div>
            )}

            {activeTab === 'recepcion' && (
                <div className="bg-white p-6 rounded-xl shadow-sm border animate-slide-up">
                    <TraspasosList />
                </div>
            )}
        </div>
    );
}
