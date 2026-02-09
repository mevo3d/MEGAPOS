import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../utils/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Plus, Search, Edit, Trash2, Package, X, Upload, Image, Sparkles, Wand2, Truck, Download } from 'lucide-react';
import { Loading } from '../../components/ui/Loading';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../context/authStore';
import TraspasosPanel from './TraspasosPanel'; // Import integration
import ProductImport from './ProductImport';
import InvoiceImport from './InvoiceImport';
import Faltantes from './Faltantes';
import TransferCenterModal from '../../components/inventario/TransferCenterModal';
import { FileSpreadsheet, List, Camera, Truck as TruckIcon, AlertTriangle, History } from 'lucide-react'; // Added icons for tabs

export default function Productos() {
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [imagenes, setImagenes] = useState([]);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [error, setError] = useState(null);
    const [generatingAI, setGeneratingAI] = useState(false);
    const [activeTab, setActiveTab] = useState('basico'); // basico, proveedor, imagenes, ia, existencias

    // Estados para Existencias y Dispersión
    const [branchStocks, setBranchStocks] = useState([]);
    const [loadingStocks, setLoadingStocks] = useState(false);
    const [dispersionModalOpen, setDispersionModalOpen] = useState(false);
    const [selectedBranchForDispersion, setSelectedBranchForDispersion] = useState(null);
    const [amountToDisperse, setAmountToDisperse] = useState('');

    // New state for section navigation
    const { user } = useAuthStore();
    const [currentSection, setCurrentSection] = useState('list'); // list, importar, faltantes, traspasos
    const [importSubTab, setImportSubTab] = useState('excel'); // excel, factura
    const [transferModalOpen, setTransferModalOpen] = useState(false);

    // Form
    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
        shouldUnregister: false // Keep values even if tabs are hidden
    });

    useEffect(() => {
        fetchProductos();
    }, [page, search]);

    const fetchProductos = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/productos?page=${page}&limit=10&search=${search}`);
            setProductos(res.data.productos);
            setTotalPages(res.data.pages);
        } catch (error) {
            console.error(error);
            toast.error('Error al cargar productos');
        } finally {
            setLoading(false);
        }
    };

    const fetchBranchStocks = async (prodId) => {
        setLoadingStocks(true);
        try {
            const res = await api.get(`/inventario/producto/${prodId}/sucursales`);
            setBranchStocks(res.data);
        } catch (error) {
            console.error(error);
            toast.error('Error cargando existencias por sucursal');
        } finally {
            setLoadingStocks(false);
        }
    };

    const fetchImagenes = async (productoId) => {
        try {
            const res = await api.get(`/productosImagenes/${productoId}/imagenes`);
            setImagenes(res.data);
        } catch (error) {
            console.error('Error cargando imágenes:', error);
            setImagenes([]);
        }
    };

    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPage(1);
    };

    const openModal = (producto = null, initialTab = 'basico') => {
        setEditingProduct(producto);
        setActiveTab(initialTab);
        setImagenes([]);

        if (producto) {
            fetchImagenes(producto.id);
            fetchBranchStocks(producto.id); // Validar existencias por sucursal

            setValue('nombre', producto.nombre);
            setValue('codigo', producto.codigo);
            setValue('descripcion', producto.descripcion);
            setValue('categoria', producto.categoria);
            setValue('precio_compra', producto.precio_compra);
            setValue('precio_venta', producto.precio_venta);
            // Precios
            setValue('precio_1', producto.precio_1 || producto.precio_venta);
            setValue('precio_2', producto.precio_2);
            setValue('precio_3', producto.precio_3);
            setValue('precio_4', producto.precio_4);
            setValue('precio_5', producto.precio_5);

            // Campos de proveedor
            setValue('nombre_proveedor', producto.nombre_proveedor);
            setValue('sku_proveedor', producto.sku_proveedor);
            setValue('marca', producto.marca);
            setValue('descripcion_corta', producto.descripcion_corta);
            setValue('descripcion_seo', producto.descripcion_seo);
            setValue('palabras_clave', producto.palabras_clave);
            // Cargar imágenes
            fetchImagenes(producto.id);
        } else {
            reset();
        }
        setIsModalOpen(true);
    };

    const onSubmit = async (data) => {
        try {
            if (editingProduct) {
                await api.put(`/productos/${editingProduct.id}`, data);
                toast.success('Producto actualizado');
            } else {
                await api.post('/productos', data);
                toast.success('Producto creado');
            }
            setIsModalOpen(false);
            fetchProductos();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al guardar');
        }
    };



    // Auto-calculate prices if they are 0 (e.g. Imported products)
    const cost = parseFloat(watch('precio_compra') || 0);
    useEffect(() => {
        if (!isModalOpen || cost <= 0) return;

        const defaults = [
            { id: 'precio_1', pct: 30 },
            { id: 'precio_2', pct: 20 },
            { id: 'precio_3', pct: 15 },
            { id: 'precio_4', pct: 10 },
            { id: 'precio_5', pct: 5 },
        ];

        defaults.forEach(def => {
            const currentVal = parseFloat(api.getValues ? api.getValues(def.id) : watch(def.id) || 0); // Use watch as source if getValues tricky in this scope, but better rely on watch
            // Actually simplest is check if watch returns 0
            const val = parseFloat(watch(def.id) || 0);

            if (val === 0) {
                const newVal = (cost * (1 + def.pct / 100)).toFixed(2);
                setValue(def.id, newVal, { shouldValidate: true, shouldDirty: true });
            }
        });
    }, [cost, isModalOpen]);

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este producto?')) return;
        try {
            await api.delete(`/productos/${id}`);
            toast.success('Producto eliminado');
            fetchProductos();
        } catch (error) {
            toast.error('No se pudo eliminar el producto');
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !editingProduct) return;

        setUploadingImage(true);
        const formData = new FormData();
        formData.append('imagen', file);
        formData.append('es_principal', imagenes.length === 0 ? 'true' : 'false');

        try {
            await api.post(`/productosImagenes/${editingProduct.id}/imagenes`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Imagen subida. El fondo se procesará en segundo plano.');
            fetchImagenes(editingProduct.id);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al subir imagen');
        } finally {
            setUploadingImage(false);
        }
    };

    const handleDispersion = async () => {
        if (!amountToDisperse || parseFloat(amountToDisperse) <= 0) {
            return toast.error('Ingresa una cantidad válida');
        }

        try {
            await api.post('/inventario/transferencias', {
                sucursal_origen_id: 1, // Default CEDIS. TODO: Make selectable if needed
                sucursal_destino_id: selectedBranchForDispersion.sucursal_id,
                items: [
                    { producto_id: editingProduct.id, cantidad: parseFloat(amountToDisperse) }
                ],
                tipo: 'envio',
                observaciones: 'Dispersión desde Catálogo de Productos'
            });

            toast.success(`Enviadas ${amountToDisperse} unidades a ${selectedBranchForDispersion.sucursal_nombre}`);
            setDispersionModalOpen(false);
            setAmountToDisperse('');
            // Recargar stocks
            fetchBranchStocks(editingProduct.id);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Error al crear transferencia');
        }
    };

    const handleDeleteImage = async (imageId) => {
        try {
            await api.delete(`/productosImagenes/imagenes/${imageId}`);
            toast.success('Imagen eliminada');
            fetchImagenes(editingProduct.id);
        } catch (error) {
            toast.error('Error al eliminar imagen');
        }
    };

    const handleGenerateAI = async () => {
        if (!editingProduct) return;

        setGeneratingAI(true);
        try {
            const res = await api.post(`/productosIA/${editingProduct.id}/generar-descripcion`);
            if (res.data.success) {
                toast.success('Descripción generada con IA');
                setValue('descripcion_seo', res.data.descripcion.descripcion_seo);
                setValue('descripcion_corta', res.data.descripcion.descripcion_corta);
                setValue('palabras_clave', res.data.descripcion.palabras_clave);
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Error al generar descripción');
        } finally {
            setGeneratingAI(false);
        }
    };



    return (
        <>
            <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
                {/* Navigation Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-gray-200 mb-6">
                    <button
                        onClick={() => setCurrentSection('list')}
                        className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${currentSection === 'list' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <List className="w-4 h-4" /> Catálogo
                    </button>
                    <button
                        onClick={() => setCurrentSection('importar')}
                        className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${currentSection === 'importar' ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Download className="w-4 h-4" /> Importar
                    </button>
                    <button
                        onClick={() => setCurrentSection('faltantes')}
                        className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${currentSection === 'faltantes' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <AlertTriangle className="w-4 h-4" /> Faltantes
                    </button>
                    <button
                        onClick={() => setCurrentSection('movimientos')}
                        className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${currentSection === 'movimientos' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <History className="w-4 h-4" /> Movimientos
                    </button>
                    <button
                        onClick={() => setCurrentSection('traspasos')}
                        className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${currentSection === 'traspasos' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Truck className="w-4 h-4" /> Centro de Traspasos
                    </button>
                </div>

                {/* Importar Section with Sub-tabs */}
                {currentSection === 'importar' && (
                    <div className="space-y-4">
                        {/* Sub-tabs for import types */}
                        <div className="flex gap-2 bg-gray-50 p-2 rounded-lg">
                            <button
                                onClick={() => setImportSubTab('excel')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${importSubTab === 'excel' ? 'bg-white shadow text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                <FileSpreadsheet className="w-4 h-4" /> Importar desde Excel
                            </button>
                            <button
                                onClick={() => setImportSubTab('factura')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${importSubTab === 'factura' ? 'bg-white shadow text-purple-700' : 'text-gray-600 hover:bg-gray-100'}`}
                            >
                                <Camera className="w-4 h-4" /> Importar desde Factura (Foto/IA)
                            </button>
                        </div>

                        {importSubTab === 'excel' && <ProductImport userRole={user?.rol} sucursalId={user?.sucursal_id} />}
                        {importSubTab === 'factura' && <InvoiceImport />}
                    </div>
                )}

                {/* Faltantes Section */}
                {currentSection === 'faltantes' && <Faltantes />}

                {/* Movimientos Section - Historial de todos los movimientos */}
                {currentSection === 'movimientos' && (
                    <Card className="glass border-0 shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-indigo-700">
                                <History className="w-6 h-6" />
                                Historial de Movimientos
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-12 text-gray-500">
                                <History className="w-16 h-16 mx-auto mb-4 text-indigo-300" />
                                <p className="text-lg font-medium">Próximamente</p>
                                <p className="text-sm">Aquí verás el historial de todos los traspasos entre sucursales y CEDIS.</p>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {currentSection === 'traspasos' && <TraspasosPanel />}

                {currentSection === 'list' && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
                                    <Package className="text-blue-600" />
                                    Inventario de Productos
                                </h1>
                                <p className="text-gray-500 text-sm">Gestiona tu catálogo completo</p>
                            </div>
                            <Button onClick={() => openModal()} className="gradient-primary hover:shadow-lg hover:-translate-y-0.5 transition-all">
                                <Plus className="w-5 h-5 mr-1" /> Nuevo Producto
                            </Button>
                        </div>

                        {/* Search Bar */}
                        <Card className="glass border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre, SKU o código de barras..."
                                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={search}
                                        onChange={handleSearch}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Table */}
                        <Card className="shadow-xl border-0 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-4">Producto</th>
                                            <th className="px-6 py-4">SKU / Código</th>
                                            <th className="px-6 py-4">Costo</th>
                                            <th className="px-6 py-4">Precio Público (P1)</th>
                                            <th className="px-6 py-4">Stock Total</th>
                                            <th className="px-6 py-4 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan="6" className="text-center py-8">Cargando...</td></tr>
                                        ) : productos.length === 0 ? (
                                            <tr><td colSpan="6" className="text-center py-8 text-gray-500">No se encontraron productos</td></tr>
                                        ) : (
                                            productos.map((prod) => (
                                                <tr key={prod.id} className="border-b hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium text-gray-900">{prod.nombre}</span>
                                                            {prod.marca && <span className="text-xs text-gray-400">{prod.marca}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <span className="font-mono text-xs text-gray-500">{prod.codigo}</span>
                                                            {prod.sku_proveedor && <span className="text-xs text-blue-500">Prov: {prod.sku_proveedor}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-gray-500">${parseFloat(prod.precio_compra || 0).toFixed(2)}</td>
                                                    <td className="px-6 py-4 font-bold text-green-600">
                                                        ${(() => {
                                                            const p1 = parseFloat(prod.precio_1 || 0);
                                                            const cost = parseFloat(prod.precio_compra || 0);
                                                            // Si el precio es 0 pero hay costo, calcular precio público sugerido (30%)
                                                            const finalPrice = p1 > 0 ? p1 : (cost > 0 ? cost * 1.30 : 0);
                                                            return finalPrice.toFixed(2);
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-4 text-blue-600 font-semibold">{prod.total_stock || 0}</td>
                                                    <td className="px-6 py-4 flex justify-center gap-2">
                                                        <Button variant="ghost" size="sm" onClick={() => openModal(prod)} className="text-blue-500 hover:bg-blue-50" title="Editar">
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => openModal(prod, 'existencias')} className="text-indigo-500 hover:bg-indigo-50" title="Dispersar / Ver Stock Sucursales">
                                                            <Truck className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleDelete(prod.id)} className="text-red-500 hover:bg-red-50" title="Eliminar">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            <div className="p-4 bg-gray-50 flex justify-between items-center border-t">
                                <Button
                                    variant="outline" size="sm"
                                    disabled={page === 1}
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                >
                                    Anterior
                                </Button>
                                <span className="text-sm text-gray-600">Página {page} de {totalPages || 1}</span>
                                <Button
                                    variant="outline" size="sm"
                                    disabled={page >= totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                >
                                    Siguiente
                                </Button>
                            </div>
                        </Card>

                        {/* ... End of Table ... */}
                    </div>
                )}

                {/* Modal CRUD Mejorado */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-scaleIn flex flex-col">
                            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                                <h2 className="text-xl font-bold text-gray-800">
                                    {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b bg-gray-50 overflow-x-auto">
                                {[
                                    { id: 'basico', label: 'Básico', icon: Package },
                                    { id: 'precios', label: 'Precios', icon: FileSpreadsheet },
                                    { id: 'existencias', label: 'Existencias', icon: Truck, disabled: !editingProduct }, // New Tab
                                    { id: 'proveedor', label: 'Proveedor', icon: Edit },
                                    { id: 'imagenes', label: 'Imágenes', icon: Image, disabled: !editingProduct },
                                    { id: 'ia', label: 'IA', icon: Sparkles, disabled: !editingProduct }
                                ].map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => !tab.disabled && setActiveTab(tab.id)}
                                        disabled={tab.disabled}
                                        className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-all whitespace-nowrap
                                        ${activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600 bg-white' : 'text-gray-500 hover:text-gray-700'}
                                        ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <tab.icon className="w-4 h-4" />
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto">
                                <div className="p-6 space-y-4">
                                    {/* Tab: Básico */}
                                    {activeTab === 'basico' && (
                                        <>
                                            <Input
                                                label="Nombre del Producto (Interno)"
                                                {...register('nombre', { required: true })}
                                                placeholder="Nombre como lo identifican ustedes"
                                                autoFocus
                                            />

                                            <div className="grid grid-cols-2 gap-4">
                                                <Input
                                                    label="Código/SKU"
                                                    {...register('codigo', { required: true })}
                                                    placeholder="SKU interno"
                                                />
                                                <Input
                                                    label="Categoría"
                                                    {...register('categoria')}
                                                    placeholder="Bebidas, Abarrotes..."
                                                />
                                            </div>



                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-gray-700">Descripción Corta (Ticket/Rápida)</label>
                                                <textarea
                                                    {...register('descripcion_corta')}
                                                    className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all p-2.5 bg-gray-50 border min-h-[60px]"
                                                    placeholder="Ej: COCA COLA 600ML (Max 40 chars)"
                                                    maxLength={40}
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-gray-700">Descripción General</label>
                                                <textarea
                                                    {...register('descripcion')}
                                                    className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all p-2.5 bg-gray-50 border min-h-[80px]"
                                                    placeholder="Descripción breve del producto..."
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Tab: Precios (New) */}
                                    {activeTab === 'precios' && (
                                        <div className="space-y-6">
                                            <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-4 border border-blue-100">
                                                <div className="p-2 bg-white rounded-full shadow-sm">
                                                    <Package className="w-6 h-6 text-blue-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-blue-900">Costo Base: ${watch('precio_compra') || '0.00'}</p>
                                                    <p className="text-xs text-blue-700">Usa esto de referencia para calcular tus márgenes.</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <Input
                                                    label="Costo de Compra ($)"
                                                    type="number"
                                                    step="0.01"
                                                    {...register('precio_compra', { required: true })}
                                                    placeholder="0.00"
                                                    className="bg-gray-50"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 gap-4 p-4 border rounded-xl bg-gray-50/50">
                                                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                                                    <List className="w-4 h-4" /> Listas de Precios
                                                </h3>

                                                {[
                                                    { id: 'precio_1', label: 'Precio 1 (Máx Ganancia - 30%)', defPct: 30 },
                                                    { id: 'precio_2', label: 'Precio 2 (Alta Ganancia - 20%)', defPct: 20 },
                                                    { id: 'precio_3', label: 'Precio 3 (Media Ganancia - 15%)', defPct: 15 },
                                                    { id: 'precio_4', label: 'Precio 4 (Baja Ganancia - 10%)', defPct: 10 },
                                                    { id: 'precio_5', label: 'Precio 5 (Mínima Ganancia - 5%)', defPct: 5 }
                                                ].map((priceField) => {
                                                    const cost = parseFloat(watch('precio_compra') || 0);

                                                    // Calculate initial/current percentage for display
                                                    const currentPrice = parseFloat(watch(priceField.id) || 0);
                                                    const currentPct = cost > 0 && currentPrice > 0
                                                        ? ((currentPrice - cost) / cost * 100).toFixed(2)
                                                        : priceField.defPct;

                                                    return (
                                                        <div key={priceField.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end bg-white p-3 rounded-lg shadow-sm border">
                                                            <div className="flex-1">
                                                                <Input
                                                                    label={priceField.label}
                                                                    type="number" step="0.01"
                                                                    {...register(priceField.id, {
                                                                        onChange: (e) => {
                                                                            // On Price Change -> Do nothing to percentage field visually (it re-renders),
                                                                            // but effectively we just updated the price.
                                                                            // Logic is handled by the re-render of currentPct.
                                                                        }
                                                                    })}
                                                                    placeholder="0.00"
                                                                />
                                                            </div>
                                                            <div className="w-full md:w-32">
                                                                <label className="text-sm font-medium text-gray-700 mb-1 block">% Margen</label>
                                                                <div className="relative">
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 p-2.5 pr-8 bg-gray-50"
                                                                        placeholder={priceField.defPct}
                                                                        defaultValue={currentPct}
                                                                        key={`pct-${cost}-${currentPrice}`} // Force re-render on external changes
                                                                        onBlur={(e) => {
                                                                            const newPct = parseFloat(e.target.value);
                                                                            if (!isNaN(newPct) && cost > 0) {
                                                                                const newPrice = (cost * (1 + newPct / 100)).toFixed(2);
                                                                                setValue(priceField.id, newPrice);
                                                                            }
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') {
                                                                                e.preventDefault();
                                                                                e.target.blur();
                                                                            }
                                                                        }}
                                                                    />
                                                                    <span className="absolute right-3 top-2.5 text-gray-500">%</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}

                                                {/* Legacy field sync */}
                                                <input type="hidden" {...register('precio_venta')} value={watch('precio_1')} />
                                            </div>
                                        </div>
                                    )}

                                    {/* Tab: Proveedor */}
                                    {activeTab === 'proveedor' && (
                                        <>
                                            <div className="bg-blue-50 p-4 rounded-lg mb-4">
                                                <p className="text-sm text-blue-700">
                                                    📦 Estos campos son para guardar la información exacta del proveedor/fabricante.
                                                </p>
                                            </div>

                                            <Input
                                                label="Nombre del Proveedor/Fabricante"
                                                {...register('nombre_proveedor')}
                                                placeholder="Nombre exacto como viene del proveedor"
                                            />

                                            <div className="grid grid-cols-2 gap-4">
                                                <Input
                                                    label="SKU del Proveedor"
                                                    {...register('sku_proveedor')}
                                                    placeholder="Código original del proveedor"
                                                />
                                                <Input
                                                    label="Marca"
                                                    {...register('marca')}
                                                    placeholder="Marca del producto"
                                                />
                                            </div>

                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-gray-700">Descripción Corta (Interno)</label>
                                                <textarea
                                                    {...register('descripcion_corta')}
                                                    className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all p-2.5 bg-gray-50 border min-h-[60px]"
                                                    placeholder="Para búsqueda rápida interna..."
                                                    maxLength={100}
                                                />
                                            </div>
                                        </>
                                    )}

                                    {/* Tab: Imágenes */}
                                    {activeTab === 'imagenes' && editingProduct && (
                                        <>
                                            <div className="bg-green-50 p-4 rounded-lg mb-4">
                                                <p className="text-sm text-green-700">
                                                    📸 Sube imágenes con fondo blanco. El sistema las procesará automáticamente para quitar el fondo.
                                                </p>
                                            </div>

                                            {/* Upload Area */}
                                            <label className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all
                                            ${uploadingImage ? 'bg-blue-50 border-blue-300' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={handleImageUpload}
                                                    className="hidden"
                                                    disabled={uploadingImage || imagenes.length >= 5}
                                                />
                                                <Upload className={`w-10 h-10 mb-2 ${uploadingImage ? 'text-blue-500 animate-bounce' : 'text-gray-400'}`} />
                                                <span className="text-sm text-gray-600">
                                                    {uploadingImage ? 'Subiendo...' : imagenes.length >= 5 ? 'Máximo 5 imágenes' : 'Haz clic para subir imagen'}
                                                </span>
                                                <span className="text-xs text-gray-400 mt-1">{imagenes.length}/5 imágenes</span>
                                            </label>

                                            {/* Image Gallery */}
                                            {imagenes.length > 0 && (
                                                <div className="grid grid-cols-3 gap-4 mt-4">
                                                    {imagenes.map((img) => (
                                                        <div key={img.id} className="relative group">
                                                            <img
                                                                src={`/uploads/productos/${img.nombre_archivo}`}
                                                                alt="Producto"
                                                                className="w-full h-32 object-cover rounded-lg border"
                                                            />
                                                            {img.es_principal === 1 && (
                                                                <span className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-0.5 rounded">
                                                                    Principal
                                                                </span>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteImage(img.id)}
                                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                            >
                                                                <X className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {/* Tab: Existencias (Dispersión) */}
                                    {activeTab === 'existencias' && (
                                        <div className="space-y-4 animate-fade-in">
                                            <div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-bold text-blue-800">Inventario por Sucursal</h4>
                                                    <p className="text-sm text-blue-600">Visualiza y dispersa existencias entre sucursales.</p>
                                                </div>
                                            </div>

                                            {loadingStocks ? (
                                                <div className="flex justify-center p-8">
                                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                </div>
                                            ) : (
                                                <div className="border rounded-lg overflow-hidden">
                                                    <table className="w-full text-sm text-left">
                                                        <thead className="bg-gray-50 text-gray-700 font-semibold border-b">
                                                            <tr>
                                                                <th className="p-3">Sucursal</th>
                                                                <th className="p-3 text-right">Existencia</th>
                                                                <th className="p-3 text-right">Mínimo</th>
                                                                <th className="p-3 text-center">Acciones</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {branchStocks.map(stock => (
                                                                <tr key={stock.sucursal_id} className="hover:bg-gray-50">
                                                                    <td className="p-3 font-medium text-gray-900">{stock.sucursal_nombre}</td>
                                                                    <td className={`p-3 text-right font-bold ${parseInt(stock.stock_actual) <= parseInt(stock.stock_minimo) ? 'text-red-600' : 'text-green-600'}`}>
                                                                        {stock.stock_actual}
                                                                    </td>
                                                                    <td className="p-3 text-right text-gray-500">{stock.stock_minimo}</td>
                                                                    <td className="p-3 text-center">
                                                                        {String(stock.sucursal_id) !== '1' && (
                                                                            <Button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setSelectedBranchForDispersion(stock);
                                                                                    setDispersionModalOpen(true);
                                                                                }}
                                                                                variant="outline"
                                                                                className="text-xs h-8"
                                                                            >
                                                                                <Truck className="w-3 h-3 mr-1" />
                                                                                Enviar desde CEDIS
                                                                            </Button>
                                                                        )}
                                                                        {String(stock.sucursal_id) === '1' && (
                                                                            <span className="text-xs text-gray-400 italic">Central (Origen)</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            {branchStocks.length === 0 && (
                                                                <tr>
                                                                    <td colSpan="4" className="p-6 text-center text-gray-400">No hay información de sucursales</td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Tab: IA */}
                                    {activeTab === 'ia' && editingProduct && (
                                        <>
                                            <div className="bg-purple-50 p-4 rounded-lg mb-4">
                                                <p className="text-sm text-purple-700">
                                                    ✨ Genera descripciones optimizadas para SEO con inteligencia artificial.
                                                </p>
                                            </div>

                                            <Button
                                                type="button"
                                                onClick={handleGenerateAI}
                                                disabled={generatingAI}
                                                className="w-full gradient-primary flex items-center justify-center gap-2"
                                            >
                                                <Wand2 className={generatingAI ? 'animate-spin' : ''} />
                                                {generatingAI ? 'Generando descripción...' : 'Generar Descripción con IA'}
                                            </Button>

                                            <div className="space-y-1 mt-4">
                                                <label className="text-sm font-medium text-gray-700">Descripción SEO (E-commerce)</label>
                                                <textarea
                                                    {...register('descripcion_seo')}
                                                    className="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500 transition-all p-2.5 bg-gray-50 border min-h-[150px] font-mono text-sm"
                                                    placeholder="La descripción optimizada aparecerá aquí..."
                                                />
                                            </div>

                                            <Input
                                                label="Palabras Clave (SEO)"
                                                {...register('palabras_clave')}
                                                placeholder="palabra1, palabra2, palabra3"
                                            />
                                        </>
                                    )}
                                </div>

                                <div className="p-4 bg-gray-50 border-t flex gap-3 justify-end">
                                    <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                                        Cancelar
                                    </Button>
                                    <Button type="submit" className="gradient-primary">
                                        Guardar Producto
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div >
                )
                }

                {/* Modal de Dispersión */}
                {
                    dispersionModalOpen && selectedBranchForDispersion && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fadeIn">
                            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 animate-scaleIn">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-blue-600" />
                                    Enviar Mercancía a Sucursal
                                </h3>

                                <div className="space-y-4">
                                    <div className="p-3 bg-gray-50 rounded-lg border text-sm">
                                        <p className="flex justify-between mb-1">
                                            <span className="text-gray-500">Producto:</span>
                                            <span className="font-semibold text-gray-900 truncate max-w-[200px]">{editingProduct?.nombre}</span>
                                        </p>
                                        <p className="flex justify-between mb-1">
                                            <span className="text-gray-500">Origen:</span>
                                            <span className="font-semibold text-gray-900">CEDIS (Matriz)</span>
                                        </p>
                                        <p className="flex justify-between">
                                            <span className="text-gray-500">Destino:</span>
                                            <span className="font-bold text-blue-600">{selectedBranchForDispersion.sucursal_nombre}</span>
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Cantidad a Enviar
                                        </label>
                                        <Input
                                            type="number"
                                            min="1"
                                            placeholder="Ej. 10"
                                            value={amountToDisperse}
                                            onChange={(e) => setAmountToDisperse(e.target.value)}
                                            autoFocus
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Se descontará del inventario de CEDIS automáticamente.</p>
                                    </div>

                                    <div className="flex justify-end gap-3 mt-6">
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setDispersionModalOpen(false);
                                                setAmountToDisperse('');
                                            }}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                            onClick={handleDispersion}
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            Confirmar Envío
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                }
            </div >
            <TransferCenterModal isOpen={transferModalOpen} onClose={() => setTransferModalOpen(false)} />
        </>
    )
}


