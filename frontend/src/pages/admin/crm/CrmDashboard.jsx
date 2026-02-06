import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/Card';
import { Users, PhoneCall, Tags, BarChart } from 'lucide-react';
import ClientesList from './ClientesList';
import Telemarketing from './Telemarketing';
import ListasPrecios from './ListasPrecios';

const CrmDashboard = () => {
    const [activeTab, setActiveTab] = useState('clientes');

    const tabs = [
        { id: 'clientes', label: 'Cartera de Clientes', icon: Users },
        { id: 'telemarketing', label: 'Telemarketing', icon: PhoneCall },
        { id: 'listas', label: 'Listas de Precios', icon: Tags },
        { id: 'reportes', label: 'Reportes Ventas', icon: BarChart },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'clientes':
                return <ClientesList />;
            case 'telemarketing':
                return <Telemarketing />;
            case 'listas':
                return <ListasPrecios />;
            case 'reportes':
                return (
                    <div className="text-center py-20 text-gray-500">
                        <BarChart size={64} className="mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-medium">Reportes de Ventas</h3>
                        <p>Análisis de desempeño comercial.</p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">CRM y Ventas</h2>
                    <p className="text-gray-500 text-sm">Gestión de relaciones comerciales y clientes</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto pb-2 gap-2 border-b border-gray-200">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-3 rounded-t-lg transition-colors whitespace-nowrap font-medium text-sm border-b-2 ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                        >
                            <Icon size={18} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Main Content Area */}
            <div className="min-h-[500px]">
                {renderContent()}
            </div>
        </div>
    );
};

export default CrmDashboard;
