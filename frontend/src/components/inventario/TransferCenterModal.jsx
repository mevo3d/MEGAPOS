import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Search, Loader2, Truck, Plus, ArrowRight, X, Layers, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import { useAuthStore } from '../../context/authStore';

export default function TransferCenterModal({ isOpen, onClose }) {
    const { user } = useAuthStore();
    const [search, setSearch] = useState('');
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [stockBreakdown, setStockBreakdown] = useState([]);
    const [transferCart, setTransferCart] = useState([]);
    const [distribution, setDistribution] = useState({}); // { sucursal_id: cantidad }
    const [step, setStep] = useState('select'); // 'select', 'distribute', 'confirm'

    useEffect(() => {
        if (isOpen) {
            loadRecentProducts();
        }
    }, [isOpen]);

    useEffect(() => {
        if (search.length > 2) {
            const delay = setTimeout(searchProducts, 500);
            return () => clearTimeout(delay);
        } else if (search.length === 0) {
            loadRecentProducts();
        }
    }, [search]);

    const loadRecentProducts = async () => {
        setLoading(true);
        try {
            // Fetch latest 10 products
            // We use the general inventory endpoint, assuming sorting by created_at desc isn't strictly necessary 
            // if not available, otherwise limit=10 gives us a starting point.
            // Ideally backend endpoint for 'recent' would be better, but we reuse existing.
            const res = await api.get('/inventario?limit=10');
            setProducts(res.data);
        } catch (error) {
            console.error("Error loading recent products", error);
        } finally {
            setLoading(false);
        }
    };

    const searchProducts = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/inventario?search=${search}&limit=20`);
            setProducts(res.data);
        } catch (error) {
            console.error("Error searching products", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectProduct = async (prod) => {
        setLoading(true);
        setSelectedProduct(prod);
        setDistribution({});
        setStep('distribute');
        try {
            // Determine correct endpoint for breakdown. 
            // Routes define: router.get('/producto/:id/sucursales', getStockPorSucursal);
            // Wait.. looking at routes.js content from previous turn:
            // router.get('/producto/:id/sucursales', getStockPorSucursal); -- This is correct.
            // BUT it is inside /routes/inventario.routes.js which is mounted at /api/inventario
            // So full path is /api/inventario/producto/:id/sucursales
            const res = await api.get(`/inventario/producto/${prod.id}/sucursales`);
            setStockBreakdown(res.data);
        } catch (error) {
            console.error("Error loading stock breakdown", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDistributionChange = (sucursalId, qty, maxStock) => {
        // Determine ORIGIN stock (CEDIS). Usually sucursal_id 1 or where stock is sufficient.
        // For now assuming we disperse FROM CEDIS.
        // We should VALIDATE that CEDIS has enough stock.
        setDistribution(prev => ({
            ...prev,
            [sucursalId]: parseInt(qty) || 0
        }));
    };

    const addToTransferCart = () => {
        // Transform distribution into transfer items
        const cedis = stockBreakdown.find(s => s.sucursal_nombre.toUpperCase().includes('CEDIS') || s.sucursal_id === 1);
        const cedisStock = cedis ? cedis.stock_actual : 0;

        let totalToSend = 0;
        const itemsToAdd = [];

        Object.entries(distribution).forEach(([sucursalId, qty]) => {
            if (qty > 0) {
                itemsToAdd.push({
                    sucursal_id: sucursalId,
                    producto_id: selectedProduct.id,
                    nombre: selectedProduct.nombre,
                    cantidad: qty
                });
                totalToSend += qty;
            }
        });

        if (totalToSend > cedisStock) {
            alert(`No hay suficiente stock en CEDIS (${cedisStock}) para enviar ${totalToSend} piezas.`);
            return;
        }

        if (itemsToAdd.length === 0) return;

        setTransferCart([...transferCart, ...itemsToAdd]);
        setSelectedProduct(null);
        setStep('select');
        setSearch('');
        loadRecentProducts();
    };

    const removeFromCart = (index) => {
        const newCart = [...transferCart];
        newCart.splice(index, 1);
        setTransferCart(newCart);
    };

    const confirmTransfers = async () => {
        if (transferCart.length === 0) return;
        setLoading(true);
        try {
            // Group by Destination to create one Transfer per Destination
            // Or 1 transfer per Origin-Destination pair. 
            // Assuming Origin is ALWAYS CEDIS (ID 1) derived from user or system constant.
            // Ideally we find the CEDIS ID dynamically.
            const cedisId = user.sucursal_id || 1; // Fallback to 1

            // Group by destination
            const byDest = {};
            transferCart.forEach(item => {
                if (!byDest[item.sucursal_id]) byDest[item.sucursal_id] = [];
                byDest[item.sucursal_id].push({
                    producto_id: item.producto_id,
                    cantidad: item.cantidad
                });
            });

            // Send requests sequentially
            for (const [destId, items] of Object.entries(byDest)) {
                await api.post('/inventario/transferencias', {
                    sucursal_origen_id: cedisId,
                    sucursal_destino_id: destId,
                    items: items,
                    tipo: 'envio',
                    observaciones: 'Dispersión desde Centro de Traspasos'
                });
            }

            alert('Traspasos creados correctamente');
            setTransferCart([]);
            onClose();
        } catch (error) {
            console.error("Error creating transfers", error);
            alert("Error al crear traspasos");
        } finally {
            setLoading(false);
        }
    };

    const getCedisStock = () => {
        const cedis = stockBreakdown.find(s => s.sucursal_nombre.toUpperCase().includes('CEDIS') || s.sucursal_id === 1);
        return cedis ? cedis.stock_actual : 0;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">

                {/* Header */}
                <div className="bg-gradient-to-r from-yellow-400 to-amber-500 p-4 flex justify-between items-center text-white shadow-md">
                    <div className="flex items-center gap-3">
                        <Truck className="h-6 w-6" />
                        <h2 className="text-xl font-bold">Centro de Traspasos</h2>
                    </div>
                    <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">

                    {/* STEP 1: SELECT PRODUCT */}
                    {step === 'select' && (
                        <div className="space-y-6">
                            <div className="relative">
                                <Search className="absolute left-4 top-3.5 text-gray-400" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Buscar por Nombre o SKU..."
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100 outline-none text-lg transition-all"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                            </div>

                            {loading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="animate-spin text-yellow-500 h-10 w-10" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {products.map(prod => (
                                        <button
                                            key={prod.id}
                                            onClick={() => handleSelectProduct(prod)}
                                            className="bg-white p-4 rounded-xl border border-gray-200 hover:border-yellow-400 hover:shadow-lg transition-all text-left group"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono font-bold group-hover:bg-yellow-100 group-hover:text-yellow-800 transition-colors">
                                                    {prod.sku}
                                                </span>
                                                <span className="text-green-600 font-bold text-sm">
                                                    {prod.stock_fisico > 0 ? `${prod.stock_fisico} pzas` : 'Sin Stock'}
                                                </span>
                                            </div>
                                            <h3 className="font-semibold text-gray-800 line-clamp-2 group-hover:text-yellow-600 transition-colors">
                                                {prod.nombre}
                                            </h3>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2: DISTRIBUTE */}
                    {step === 'distribute' && selectedProduct && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2 cursor-pointer hover:text-blue-600 transition-colors" onClick={() => setStep('select')}>
                                <ArrowRight className="rotate-180 h-4 w-4" />
                                Volver al listado
                            </div>

                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="text-xl font-bold text-gray-800 mb-1">{selectedProduct.nombre}</h3>
                                <p className="text-gray-500 font-mono text-sm mb-4">SKU: {selectedProduct.sku}</p>

                                <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-yellow-800 mb-6">
                                    <Layers className="h-5 w-5" />
                                    <span className="font-semibold">Stock en CEDIS: {getCedisStock()} piezas</span>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="font-semibold text-gray-700">Distribuir a Sucursales:</h4>
                                    {stockBreakdown.filter(s => !s.sucursal_nombre.toUpperCase().includes('CEDIS') && s.sucursal_id !== 1).map(sucursal => (
                                        <div key={sucursal.sucursal_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-all">
                                            <div>
                                                <p className="font-medium text-gray-900">{sucursal.sucursal_nombre}</p>
                                                <p className="text-xs text-gray-500">Existencia actual: {sucursal.stock_actual}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm text-gray-400">Enviar:</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className="w-24 p-2 border rounded-lg text-center font-bold focus:ring-2 focus:ring-yellow-400 outline-none"
                                                    placeholder="0"
                                                    value={distribution[sucursal.sucursal_id] || ''}
                                                    onChange={(e) => handleDistributionChange(sucursal.sucursal_id, e.target.value, getCedisStock())}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-8 flex justify-end gap-3">
                                    <Button variant="outline" onClick={() => setStep('select')}>Cancelar</Button>
                                    <Button onClick={addToTransferCart} className="bg-yellow-500 hover:bg-yellow-600 text-white">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Agregar al Traspaso
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>

                {/* Footer / Cart Summary */}
                {transferCart.length > 0 && (
                    <div className="bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                <Truck className="h-5 w-5 text-blue-600" />
                                Items por enviar: {transferCart.length}
                            </h4>
                            <span className="text-xs text-gray-500">Máximo 100 items por lote</span>
                        </div>

                        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 scrollbar-thin">
                            {transferCart.map((item, idx) => (
                                <div key={idx} className="flex-shrink-0 bg-blue-50 border border-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                                    <span>{item.nombre.substring(0, 15)}... ({item.cantidad})</span>
                                    <button onClick={() => removeFromCart(idx)} className="hover:text-red-500"><X size={14} /></button>
                                </div>
                            ))}
                        </div>

                        <Button onClick={confirmTransfers} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-bold shadow-lg shadow-blue-500/30">
                            Confirmar Todos los Traspasos
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
