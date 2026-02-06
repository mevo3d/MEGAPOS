import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Clock, RefreshCcw, Search, User, CreditCard } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export const PendingPreSalesModal = ({ isOpen, onClose, onSelect, sucursalId }) => {
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('');

    const cargarPendientes = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/preventas/pendientes/${sucursalId}`);
            setPedidos(data);
        } catch (error) {
            console.error('Error cargando preventas:', error);
            toast.error('Error al actualizar preventas');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) cargarPendientes();
    }, [isOpen]);

    const filtered = pedidos.filter(p =>
        p.folio?.toLowerCase().includes(filter.toLowerCase()) ||
        p.cliente_nombre?.toLowerCase().includes(filter.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            <Clock className="text-blue-500" />
                            Preventas Pendientes
                        </h2>
                        <p className="text-sm text-gray-500">Selecciona un pedido para procesar el cobro</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={cargarPendientes} disabled={loading}>
                            <RefreshCcw className={loading ? 'animate-spin' : ''} size={20} />
                        </Button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 px-2 text-2xl">&times;</button>
                    </div>
                </div>

                <div className="p-4 bg-white border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                            type="text"
                            placeholder="Buscar por folio o nombre de cliente..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {filtered.length === 0 ? (
                        <div className="text-center py-20 text-gray-400">
                            <CreditCard className="mx-auto mb-4 opacity-20" size={64} />
                            <p>{loading ? 'Buscando pedidos...' : 'No hay preventas pendientes'}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filtered.map(pedido => (
                                <div
                                    key={pedido.id}
                                    onClick={() => onSelect(pedido)}
                                    className="p-4 border rounded-xl hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                                            {pedido.folio}
                                        </span>
                                        <span className="font-bold text-gray-800">${parseFloat(pedido.total || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-700 font-medium mb-1">
                                        <User size={14} className="text-gray-400" />
                                        {pedido.cliente_nombre || 'Cliente General'}
                                    </div>
                                    <div className="text-xs text-gray-500 flex justify-between mt-2 pt-2 border-t border-gray-100 group-hover:border-blue-100">
                                        <span>Caja: {pedido.caja_nombre || 'N/A'}</span>
                                        <span>{new Date(pedido.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-gray-50 text-right">
                    <Button variant="outline" onClick={onClose}>Cerrar</Button>
                </div>
            </div>
        </div>
    );
};
