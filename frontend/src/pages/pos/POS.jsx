import React, { useState, useEffect } from 'react';
import { ProductCard } from '../../components/pos/ProductCard';
import { Cart } from '../../components/pos/Cart';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Loading, CardSkeleton } from '../../components/ui/Loading';
import { Search, Barcode, Package, Filter, Grid, List, Clock, UserPlus } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { PendingPreSalesModal } from '../../components/pos/PendingPreSalesModal';
import { QuickClientModal } from '../../components/pos/QuickClientModal';
import { useAuthStore } from '../../context/authStore';

export default function POS() {
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [viewMode, setViewMode] = useState('grid');
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [clients, setClients] = useState([]);
    const [selectedClient, setSelectedClient] = useState(null);
    const [config, setConfig] = useState({});
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [puntosRedeem, setPuntosRedeem] = useState(0);
    const [showPreSalesModal, setShowPreSalesModal] = useState(false);
    const [activePedidoId, setActivePedidoId] = useState(null);
    const [myCaja, setMyCaja] = useState(null);
    const [showClientModal, setShowClientModal] = useState(false);
    const [clientSearch, setClientSearch] = useState('');
    const [showClientDropdown, setShowClientDropdown] = useState(false);
    const { user } = useAuthStore();

    // Cargar carrito desde localStorage al iniciar
    useEffect(() => {
        const savedCart = localStorage.getItem('pos_cart');
        if (savedCart) {
            try {
                setCart(JSON.parse(savedCart));
            } catch (e) {
                console.error('Error cargando carrito guardado:', e);
            }
        }
    }, []);

    // Guardar carrito en localStorage cada vez que cambia
    useEffect(() => {
        if (cart.length > 0) {
            localStorage.setItem('pos_cart', JSON.stringify(cart));
        } else {
            localStorage.removeItem('pos_cart');
        }
    }, [cart]);

    // Cargar datos iniciales
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Cargar productos e inventario (crítico)
                const prodRes = await api.get('/inventario');
                setProducts(prodRes.data);

                // Cargar clientes (crítico)
                const clientRes = await api.get('/clientes');
                setClients(clientRes.data);
                if (clientRes.data.length > 0) {
                    setSelectedClient(clientRes.data[0]);
                }

                // Configuración (opcional)
                try {
                    const configRes = await api.get('/configuracion');
                    const configObj = {};
                    if (configRes.data && configRes.data.configuracion) {
                        configRes.data.configuracion.forEach(c => configObj[c.clave] = c.valor);
                    }
                    setConfig(configObj);
                } catch (e) {
                    console.log('Configuración no disponible, usando valores por defecto');
                    setConfig({});
                }

                // Mi caja (ya es opcional)
                try {
                    const { data: mc } = await api.get('/cajas/mi-caja');
                    setMyCaja(mc);
                } catch (e) {
                    console.log('No se pudo cargar la caja asignada');
                }
            } catch (error) {
                console.error('Error cargando datos:', error);
                toast.error('Error al cargar datos del sistema');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Cerrar dropdown al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showClientDropdown && !event.target.closest('.client-search-container')) {
                setShowClientDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showClientDropdown]);

    const addToCart = (product) => {
        setCart(prev => {
            const existing = prev.find(item => item.id === product.id);
            if (existing) {
                // Validar stock (simple)
                if (existing.cantidad >= product.stock_fisico) {
                    toast.error('No hay suficiente stock');
                    return prev;
                }
                return prev.map(item =>
                    item.id === product.id
                        ? { ...item, cantidad: item.cantidad + 1 }
                        : item
                );
            }
            return [...prev, { ...product, cantidad: 1 }];
        });
    };

    const resetCart = () => {
        if (window.confirm('¿Estás seguro de vaciar el carrito? Esta acción no se puede deshacer.')) {
            setCart([]);
            localStorage.removeItem('pos_cart');
            toast.success('Carrito reiniciado');
        }
    };

    const updateQuantity = (id, newQuantity) => {
        if (newQuantity < 1) return;
        const product = products.find(p => p.id === id);
        if (product && newQuantity > product.stock_fisico) {
            toast.error('Stock insuficiente');
            return;
        }
        setCart(prev => prev.map(item =>
            item.id === id ? { ...item, cantidad: newQuantity } : item
        ));
    };

    const removeFromCart = (id) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const clearCart = () => setCart([]);

    const handleCheckoutClick = () => {
        if (cart.length === 0) return;
        setPuntosRedeem(0);
        setShowPaymentModal(true);
    };

    const processSale = async () => {
        setIsProcessing(true);
        try {
            const subtotal = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
            const impuestos = subtotal * 0.16;
            let total = subtotal + impuestos;

            // Descuento por puntos
            let descuentoPuntos = 0;
            if (puntosRedeem > 0 && config.puntos_activo === 'true') {
                const valorCanje = parseFloat(config.puntos_valor_canje) || 1000;
                descuentoPuntos = puntosRedeem / valorCanje;
            }

            // El total a pagar en efectivo disminuye, pero la venta registra el total original y el pago mixto
            // Aunque en este backend simple, mandamos el total final. 
            // Better: Mandar el total real y en pagos desglosar "Monedero" y "Efectivo"

            const ventaData = {
                caja_id: myCaja?.id || 1,
                cliente_id: selectedClient ? selectedClient.id : null,
                subtotal,
                impuestos,
                total: total, // Total venta
                items: cart.map(item => ({
                    producto_id: item.id,
                    cantidad: item.cantidad,
                    precio_unitario: item.precio,
                    subtotal: item.precio * item.cantidad,
                    nombre_producto: item.nombre
                })),
                puntos_usados: puntosRedeem, // Para el backend
                pagos: [
                    { metodo: 'efectivo', monto: Math.max(0, total - descuentoPuntos), referencia: '' }
                ]
            };

            await api.post('/ventas', ventaData);

            // Si venía de una preventa, marcarla como cobrada (o simplemente el flujo ya terminó)
            if (activePedidoId) {
                // El backend de ventas debería idealmente vincularse, pero por ahora 
                // aseguramos el estado del pedido:
                await api.put(`/pedidos/${activePedidoId}/estado`, { estado: 'completado' });
            }

            toast.success('¡Venta realizada con éxito!');
            setCart([]);
            setActivePedidoId(null);
            setShowPaymentModal(false);
            setPuntosRedeem(0);

            // Recargar datos
            const [prodRes, clientRes] = await Promise.all([
                api.get('/inventario'),
                api.get('/clientes') // Recargar para ver puntos nuevos
            ]);
            setProducts(prodRes.data);
            setClients(clientRes.data);
            // Re-seleccionar cliente actualizado
            if (selectedClient) {
                const updatedClient = clientRes.data.find(c => c.id === selectedClient.id);
                if (updatedClient) setSelectedClient(updatedClient);
            }

        } catch (error) {
            console.error('Error en venta:', error);
            toast.error('Error al procesar la venta');
        } finally {
            setIsProcessing(false);
        }
    };


    const handleSelectPreSale = async (pedido) => {
        try {
            const { data: detalle } = await api.get(`/preventas/detalle/${pedido.id}`);

            // Convertir items de la preventa al formato del carrito del POS
            const cartItems = detalle.items.map(item => ({
                id: item.producto_id,
                nombre: item.producto_nombre,
                precio: parseFloat(item.precio_unitario),
                cantidad: item.cantidad,
                sku: item.codigo,
                stock_fisico: 999 // Placeholder, el POS validará al intentar agregar más
            }));

            setCart(cartItems);
            setActivePedidoId(pedido.id); // Guardar para saber que estamos cobrando ESTE pedido

            // Auto seleccionar cliente si viene en la preventa
            if (pedido.cliente_id) {
                const client = clients.find(c => c.id === pedido.cliente_id);
                if (client) setSelectedClient(client);
            }

            setShowPreSalesModal(false);
            toast.success(`Pedido ${pedido.folio} cargado`);
        } catch (error) {
            console.error('Error cargando detalle de preventa:', error);
            toast.error('No se pudo cargar el detalle del pedido');
        }
    };


    // Get unique categories from products
    const categories = ['all', ...new Set(products.map(p => p.categoria || 'sin-categoria'))];

    // Filter products based on search and category
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' ||
            (p.categoria || 'sin-categoria') === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const renderProductSkeletons = () => (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 15 }).map((_, index) => (
                <CardSkeleton key={index} />
            ))}
        </div>
    );

    const renderEmptyState = () => (
        <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                <Package className="h-12 w-12 text-gray-400" />
            </div>
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {searchTerm ? 'No se encontraron productos' : 'No hay productos disponibles'}
                </h3>
                <p className="text-gray-500 text-sm">
                    {searchTerm
                        ? 'Intenta con otros términos de búsqueda'
                        : 'Agrega productos al inventario para comenzar'
                    }
                </p>
            </div>
            {searchTerm && (
                <Button
                    variant="outline"
                    onClick={() => setSearchTerm('')}
                    className="mt-2"
                >
                    Limpiar búsqueda
                </Button>
            )}
        </div>
    );

    // Calculos para modal
    const cartSubtotal = cart.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const cartImpuestos = cartSubtotal * 0.16;
    const cartTotal = cartSubtotal + cartImpuestos;

    // Puntos logic
    const canUsePoints = config.puntos_activo === 'true' && selectedClient && selectedClient.puntos_actuales > 0;
    const valorCanje = parseFloat(config.puntos_valor_canje) || 1000;
    const descuentoPuntos = puntosRedeem / valorCanje;
    const totalPagar = Math.max(0, cartTotal - descuentoPuntos);
    const puntosGanados = Math.floor(cartTotal * (parseFloat(config.puntos_por_peso) || 0));

    return (
        <>
            {/* Left Side: Catalog */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
                {/* Search and Filters Header */}
                <div className="bg-white border-b border-gray-200 p-4 space-y-4">
                    {/* Header Top: Search & Client */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        {/* Search Bar */}
                        <div className="flex gap-3 flex-1">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    variant="filled"
                                    leftIcon={<Search className="h-5 w-5 text-gray-400" />}
                                    placeholder="Buscar por nombre, SKU o código..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10"
                                    autoFocus
                                />
                            </div>
                            <div className="relative hidden md:block w-48">
                                <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <Input
                                    variant="filled"
                                    leftIcon={<Barcode className="h-5 w-5 text-gray-400" />}
                                    placeholder="Escanear..."
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        {/* Client Search */}
                        <div className="w-full md:w-80 flex gap-2 relative client-search-container">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    className="w-full p-2 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8"
                                    placeholder="Buscar cliente por nombre, # o categoría..."
                                    value={clientSearch}
                                    onChange={(e) => {
                                        setClientSearch(e.target.value);
                                        setShowClientDropdown(true);
                                    }}
                                    onFocus={() => setShowClientDropdown(true)}
                                />
                                {selectedClient && (
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                                            {selectedClient.tipo_cliente || 'General'}
                                        </span>
                                        <button
                                            onClick={() => {
                                                setSelectedClient(null);
                                                setClientSearch('');
                                            }}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}

                                {/* Dropdown de resultados */}
                                {showClientDropdown && clientSearch && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto z-50">
                                        {clients
                                            .filter(c =>
                                                c.nombre.toLowerCase().includes(clientSearch.toLowerCase()) ||
                                                c.numero_cliente?.includes(clientSearch) ||
                                                c.tipo_cliente?.toLowerCase().includes(clientSearch.toLowerCase())
                                            )
                                            .map(client => (
                                                <button
                                                    key={client.id}
                                                    onClick={() => {
                                                        setSelectedClient(client);
                                                        setClientSearch(client.nombre);
                                                        setShowClientDropdown(false);
                                                    }}
                                                    className="w-full px-3 py-2 text-left hover:bg-blue-50 border-b last:border-b-0 transition-colors"
                                                >
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <p className="font-medium text-sm text-gray-900">{client.nombre}</p>
                                                            <p className="text-xs text-gray-500">
                                                                #{client.numero_cliente || client.id}
                                                                {config.puntos_activo === 'true' && client.puntos_actuales > 0 && (
                                                                    <span className="ml-2 text-green-600">★ {client.puntos_actuales} pts</span>
                                                                )}
                                                            </p>
                                                        </div>
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                            {client.tipo_cliente || 'General'}
                                                        </span>
                                                    </div>
                                                </button>
                                            ))
                                        }
                                        {clients.filter(c =>
                                            c.nombre.toLowerCase().includes(clientSearch.toLowerCase()) ||
                                            c.numero_cliente?.includes(clientSearch) ||
                                            c.tipo_cliente?.toLowerCase().includes(clientSearch.toLowerCase())
                                        ).length === 0 && (
                                                <div className="px-3 py-8 text-center text-gray-500 text-sm">
                                                    <p>No se encontraron clientes</p>
                                                    <button
                                                        onClick={() => {
                                                            setShowClientModal(true);
                                                            setShowClientDropdown(false);
                                                        }}
                                                        className="mt-2 text-blue-600 hover:text-blue-700 font-medium"
                                                    >
                                                        + Crear nuevo cliente
                                                    </button>
                                                </div>
                                            )}
                                    </div>
                                )}
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowClientModal(true)}
                                className="px-3"
                                title="Gestionar Clientes"
                            >
                                <UserPlus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Categories & View Mode */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-2 flex-1">
                            <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Categorías:</span>
                            <div className="flex gap-2">
                                {categories.map(category => (
                                    <Button
                                        key={category}
                                        variant={selectedCategory === category ? 'primary' : 'outline'}
                                        size="sm"
                                        onClick={() => setSelectedCategory(category)}
                                        className="whitespace-nowrap rounded-full"
                                    >
                                        {category === 'all' ? 'Todos' :
                                            category === 'sin-categoria' ? 'Sin categoría' :
                                                category.charAt(0).toUpperCase() + category.slice(1)}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2 ml-2">
                            <Button
                                variant={viewMode === 'grid' ? 'primary' : 'outline'}
                                size="icon"
                                onClick={() => setViewMode('grid')}
                                className="hidden md:flex"
                            >
                                <Grid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'list' ? 'primary' : 'outline'}
                                size="icon"
                                onClick={() => setViewMode('list')}
                                className="hidden md:flex"
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="relative">
                            <Button
                                variant="primary"
                                className={`bg-orange-500 hover:bg-orange-600 shadow-orange-200 shadow-lg gap-2 ${cart.length > 0
                                    ? 'glow-pulse ring-2 ring-orange-400'
                                    : ''
                                    }`}
                                onClick={() => setShowPreSalesModal(true)}
                            >
                                <Clock className="h-4 w-4" />
                                Preventas Pendientes
                            </Button>
                            {cart.length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-bounce shadow-lg z-50 border-2 border-white">
                                    {cart.length}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Product Results Summary */}
                {!isLoading && filteredProducts.length > 0 && (
                    <div className="bg-white border-b border-gray-200 px-4 py-2">
                        <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                                Mostrando <span className="font-semibold text-gray-900">{filteredProducts.length}</span> de{' '}
                                <span className="font-semibold text-gray-900">{products.length}</span> productos
                            </p>
                            {searchTerm && (
                                <Badge variant="secondary" size="sm" removable onRemove={() => setSearchTerm('')}>
                                    "{searchTerm}"
                                </Badge>
                            )}
                        </div>
                    </div>
                )}

                {/* Product Grid/List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading ? (
                        <div className="h-full flex items-center justify-center">
                            <Loading size="lg" text="Cargando productos..." />
                        </div>
                    ) : (
                        <>
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                    {filteredProducts.map(product => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            onAdd={addToCart}
                                            quickAdd={true}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {filteredProducts.map(product => (
                                        <ProductCard
                                            key={product.id}
                                            product={product}
                                            onAdd={addToCart}
                                            quickAdd={true}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}

                    {!isLoading && filteredProducts.length === 0 && renderEmptyState()}
                </div>
            </div>

            {/* Right Side: Cart */}
            <Cart
                items={cart}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
                onClear={resetCart}
                onCheckout={handleCheckoutClick} // Open modal
                isProcessing={isProcessing}
            />

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">Confirmar Pago</h2>
                            <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="text-2xl">&times;</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Resumen Total */}
                            <div className="text-center space-y-1">
                                <p className="text-gray-500 text-sm uppercase tracking-wide">Total de Venta</p>
                                <p className="text-4xl font-bold text-gray-900">${cartTotal.toFixed(2)}</p>
                            </div>

                            {/* Cliente y Puntos */}
                            <div className="bg-blue-50 p-4 rounded-lg space-y-2 border border-blue-100">
                                <div className="flex justify-between text-sm">
                                    <span className="text-blue-700 font-medium">Cliente:</span>
                                    <span className="text-gray-700">{selectedClient?.nombre || 'Público General'}</span>
                                </div>

                                {canUsePoints && (
                                    <div className="pt-2 border-t border-blue-200 mt-2">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-blue-800 font-bold flex items-center gap-1">
                                                ★ Puntos Disponibles:
                                            </span>
                                            <span className="bg-blue-200 text-blue-800 px-2 py-0.5 rounded text-xs font-bold">
                                                {selectedClient.puntos_actuales} pts
                                            </span>
                                        </div>

                                        <div className="flex gap-2 items-center">
                                            <input
                                                type="number"
                                                className="w-24 p-1 border rounded text-right"
                                                min="0"
                                                max={selectedClient.puntos_actuales}
                                                value={puntosRedeem}
                                                onChange={(e) => {
                                                    let val = parseInt(e.target.value) || 0;
                                                    // Max configurable points or total value
                                                    const maxPointsForTotal = Math.ceil(cartTotal * valorCanje);
                                                    val = Math.min(val, selectedClient.puntos_actuales, maxPointsForTotal);
                                                    setPuntosRedeem(val);
                                                }}
                                            />
                                            <span className="text-sm text-gray-600">
                                                pts = <span className="font-bold text-green-600">-${descuentoPuntos.toFixed(2)}</span>
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Desglose Final */}
                            <div className="space-y-2 pt-2 border-t text-sm">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal</span>
                                    <span>${cartTotal.toFixed(2)}</span>
                                </div>
                                {descuentoPuntos > 0 && (
                                    <div className="flex justify-between text-green-600 font-medium">
                                        <span>Descuento por Puntos</span>
                                        <span>-${descuentoPuntos.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                                    <span>A Pagar</span>
                                    <span>${totalPagar.toFixed(2)}</span>
                                </div>

                                {config.puntos_activo === 'true' && selectedClient && (
                                    <div className="text-center text-xs text-green-600 mt-2 bg-green-50 py-1 rounded">
                                        + Ganarás {puntosGanados} puntos en esta compra
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-6 pt-0 flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => setShowPaymentModal(false)}>
                                Cancelar
                            </Button>
                            <Button
                                className="flex-1 h-12 text-lg shadow-lg shadow-blue-200"
                                onClick={processSale}
                                isLoading={isProcessing}
                            >
                                Pagar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <PendingPreSalesModal
                isOpen={showPreSalesModal}
                onClose={() => setShowPreSalesModal(false)}
                onSelect={handleSelectPreSale}
                sucursalId={user.sucursal_id}
            />

            <QuickClientModal
                show={showClientModal}
                onClose={() => setShowClientModal(false)}
                onClientCreated={(newClient) => {
                    setClients([...clients, newClient]);
                    setSelectedClient(newClient);
                    setClientSearch(newClient.nombre);
                    toast.success(`Cliente "${newClient.nombre}" agregado`);
                }}
            />
        </>
    );
}
