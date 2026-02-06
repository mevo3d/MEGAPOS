import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/Card';
import { Truck, FileText, PackageCheck, BarChart4, MapPin, Package, Globe } from 'lucide-react';
import Proveedores from './Proveedores';
import OrdenesList from './OrdenesList';
import NuevaOrdenCompra from './NuevaOrdenCompra';
import RecepcionesList from './RecepcionesList';
import NuevaRecepcion from './NuevaRecepcion';
import UbicacionesList from './UbicacionesList';
import SurtidoPedidosList from './SurtidoPedidosList';
import GlobalStockView from './GlobalStockView';

const ProcurementDashboard = () => {
    const [activeTab, setActiveTab] = useState('stock-global');
    const [view, setView] = useState('list'); // 'list' or 'create' for orders/receipts

    const tabs = [
        { id: 'stock-global', label: 'Stock Global', icon: Globe },
        { id: 'proveedores', label: 'Proveedores', icon: Truck },
        { id: 'ubicaciones', label: 'Ubicaciones', icon: MapPin },
        { id: 'ordenes', label: 'Órdenes de Compra', icon: FileText },
        { id: 'recepciones', label: 'Recepción CEDIS', icon: PackageCheck },
        { id: 'surtido', label: 'Surtido Pedidos', icon: Package },
        { id: 'reportes', label: 'Reportes Compras', icon: BarChart4 },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'stock-global':
                return <GlobalStockView />;
            case 'proveedores':
                return <Proveedores />;
            case 'ubicaciones':
                return <UbicacionesList />;
            case 'ordenes':
                if (view === 'create') {
                    return <NuevaOrdenCompra onCancel={() => setView('list')} onSuccess={() => setView('list')} />;
                }
                return <OrdenesList onCreateNueva={() => setView('create')} />;
            case 'recepciones':
                if (view === 'create') {
                    return <NuevaRecepcion onCancel={() => setView('list')} onSuccess={() => setView('list')} />;
                }
                return <RecepcionesList onCreateNueva={() => setView('create')} />;
            case 'surtido':
                return <SurtidoPedidosList />;
            case 'reportes':
                return (
                    <div className="text-center py-20 text-gray-500">
                        <BarChart4 size={64} className="mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-medium">Reportes de Compras</h3>
                        <p>Análisis de gastos y cumplimiento de proveedores.</p>
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
                    <h2 className="text-2xl font-bold text-gray-800">Compras y Abastecimiento</h2>
                    <p className="text-gray-500 text-sm">Gestión integral de proveedores y suministro</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex overflow-x-auto pb-2 gap-2 border-b border-gray-200">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setView('list'); // Reset view when switching tabs
                            }}
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

export default ProcurementDashboard;
