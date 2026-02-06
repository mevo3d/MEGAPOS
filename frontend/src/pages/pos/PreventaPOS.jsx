import React, { useState, useEffect } from 'react';
import { ProductCard } from '../../components/pos/ProductCard';
import { Cart } from '../../components/pos/Cart';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Loading } from '../../components/ui/Loading';
import { Search, Package, Clock, CheckCircle } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../context/authStore';

export default function PreventaPOS() {
    const { user } = useAuthStore();
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [myCaja, setMyCaja] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [prodRes, clientRes, cajaRes] = await Promise.all([
                    api.get('/inventario'),
                    api.get('/clientes'),
                    api.get('/cajas/mi-caja')
                ]);
                setProducts(prodRes.data);
                setClients(clientRes.data);
                setMyCaja(cajaRes.data);
                if (clientRes.data.length > 0) {
                    setSelectedClient(clientRes.data[0]);
                }
            } catch (error) {
                console.error('Error cargando iniciales:', error);
                toast.error('Error al cargar datos');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item
                );
            }
            return [...prev, { ...product, cantidad: 1 }];
        });
    };

    const updateQuantity = (id, newQuantity) => {
        if (newQuantity < 1) return;
        setCart(prev => prev.map(item =>
            item.id === id ? { ...item, cantidad: newQuantity } : item
        ));
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const handleSendToBox = async () => {
        if (cart.length === 0) return;
        setIsProcessing(true);
        try {
            const preventaData = {
                sucursalId: user.sucursal_id,
                cajaId: myCaja.id,
                clienteId: selectedClient?.id,
                notas: 'Preventa desde ' + myCaja.nombre,
                items: cart.map(item => ({
                    producto_id: item.id,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio
                }))
            };

            const { data: pedido } = await api.post('/preventa', preventaData);
            await api.put(`/preventa/${pedido.id}/enviar-cobro`);

            toast.success('¡Pedido enviado a caja principal!');
            setCart([]);
        } catch (error) {
            console.error('Error preventa:', error);
            toast.error('Error al enviar pedido');
        } finally {
            setIsProcessing(false);
        }
    };

    const filteredProducts = products.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) return <Loading fullScreen text="Cargando sistema de preventa..." />;

    return (
        <div className="flex flex-1 h-full overflow-hidden bg-gray-50">
            {/* Catalogo */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 bg-white border-b flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                        <Input
                            className="pl-10 h-11"
                            placeholder="Buscar productos para preventa..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredProducts.map(p => (
                            <ProductCard key={p.id} product={p} onAdd={addToCart} quickAdd={true} />
                        ))}
                    </div>
                </div>
            </div>

            {/* Carrito de Preventa */}
            <div className="w-96 bg-white border-l flex flex-col">
                <div className="p-4 border-b bg-gray-50">
                    <h2 className="font-bold text-gray-700 flex items-center gap-2">
                        <Clock className="h-5 w-5 text-blue-500" />
                        Carrito de Preventa
                    </h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {cart.map(item => (
                        <div key={item.id} className="flex gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-800 line-clamp-1">{item.nombre}</p>
                                <p className="text-xs text-gray-500">${parseFloat(item.precio).toFixed(2)} x {item.cantidad}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => updateQuantity(item.id, item.cantidad - 1)} className="w-6 h-6 flex items-center justify-center bg-white border rounded hover:bg-gray-100">-</button>
                                <span className="text-sm font-bold w-6 text-center">{item.cantidad}</span>
                                <button onClick={() => updateQuantity(item.id, item.cantidad + 1)} className="w-6 h-6 flex items-center justify-center bg-white border rounded hover:bg-gray-100">+</button>
                                <button onClick={() => removeFromCart(item.id)} className="ml-2 text-red-400 hover:text-red-600">&times;</button>
                            </div>
                        </div>
                    ))}
                    {cart.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50 space-y-2 py-20">
                            <Package size={48} />
                            <p>Carrito vacío</p>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t bg-gray-50 space-y-4">
                    <div className="flex justify-between text-lg font-bold">
                        <span>Total:</span>
                        <span className="text-blue-600">${cart.reduce((s, i) => s + (i.precio * i.cantidad), 0).toFixed(2)}</span>
                    </div>

                    <Button
                        className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/10"
                        disabled={cart.length === 0 || isProcessing}
                        onClick={handleSendToBox}
                        isLoading={isProcessing}
                    >
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Enviar a Cobro (Caja Principal)
                    </Button>
                </div>
            </div>
        </div>
    );
}
