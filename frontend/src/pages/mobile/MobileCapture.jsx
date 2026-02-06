import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import api from '../../utils/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
    Camera, Barcode, Package, Check, X, Upload,
    RefreshCw, Wifi, WifiOff, User, LogOut
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function MobileCapture() {
    const navigate = useNavigate();
    const { user, isAuthenticated, logout } = useAuthStore();

    const [loading, setLoading] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingProducts, setPendingProducts] = useState([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [lastProduct, setLastProduct] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const barcodeInputRef = useRef(null);

    const { register, handleSubmit, reset, setValue, watch } = useForm();

    // Verificar autenticación - si no está logueado, redirigir al login principal
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/login');
        }
    }, [isAuthenticated, navigate]);

    // Monitor online status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check for pending products to sync
        const pending = JSON.parse(localStorage.getItem('pendingProducts') || '[]');
        setPendingProducts(pending);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Sync pending products when online
    useEffect(() => {
        if (isOnline && pendingProducts.length > 0) {
            syncPendingProducts();
        }
    }, [isOnline]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setScanning(true);
        } catch (error) {
            toast.error('No se pudo acceder a la cámara');
        }
    };

    const stopCamera = () => {
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        setScanning(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            canvas.getContext('2d').drawImage(video, 0, 0);

            const imageData = canvas.toDataURL('image/jpeg', 0.8);
            setCapturedImage(imageData);
            stopCamera();
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setCapturedImage(e.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const scanBarcode = () => {
        // Focus on barcode input for manual entry or external scanner
        if (barcodeInputRef.current) {
            barcodeInputRef.current.focus();
        }
    };

    const syncPendingProducts = async () => {
        const pending = [...pendingProducts];
        let synced = 0;

        for (const product of pending) {
            try {
                await api.post('/productos', product);
                synced++;
            } catch (error) {
                console.error('Error syncing product:', error);
            }
        }

        if (synced > 0) {
            toast.success(`${synced} productos sincronizados`);
            const remaining = pending.slice(synced);
            setPendingProducts(remaining);
            localStorage.setItem('pendingProducts', JSON.stringify(remaining));
        }
    };

    const onSubmit = async (data) => {
        setLoading(true);

        const productData = {
            ...data,
            codigo: data.codigo_barras || `AUTO-${Date.now()}`,
            precio_compra: parseFloat(data.precio_compra) || 0,
            precio_venta: parseFloat(data.precio_venta) || 0,
            usuario_captura_id: user?.id,
            usuario_captura_nombre: user?.nombre,
            capturado_desde: 'mobile_pwa'
        };

        try {
            if (isOnline) {
                // Enviar directamente
                const res = await api.post('/productos', productData);

                // Si hay imagen, subirla
                if (capturedImage && res.data?.id) {
                    await uploadImage(res.data.id, capturedImage);
                }

                setLastProduct(productData);
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 2000);
                toast.success('¡Producto guardado!');
            } else {
                // Guardar localmente para sincronizar después
                const pending = [...pendingProducts, { ...productData, imagen_base64: capturedImage }];
                setPendingProducts(pending);
                localStorage.setItem('pendingProducts', JSON.stringify(pending));
                toast.success('Guardado localmente. Se sincronizará al conectar.');
            }

            // Reset form
            reset();
            setCapturedImage(null);

            // Focus on barcode for next product
            setTimeout(() => {
                if (barcodeInputRef.current) {
                    barcodeInputRef.current.focus();
                }
            }, 100);

        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const uploadImage = async (productId, imageData) => {
        try {
            // Convert base64 to blob
            const response = await fetch(imageData);
            const blob = await response.blob();

            const formData = new FormData();
            formData.append('imagen', blob, 'producto.jpg');
            formData.append('es_principal', 'true');

            await api.post(`/productosImagenes/${productId}/imagenes`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        } catch (error) {
            console.error('Error uploading image:', error);
        }
    };

    // Si no está autenticado, no renderizar nada (se redirige)
    if (!isAuthenticated) {
        return null;
    }

    // Main Capture Screen
    return (
        <div className="min-h-screen bg-gray-100 pb-20">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 sticky top-0 z-10">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Package className="w-6 h-6" />
                        <span className="font-bold">Captura Rápida</span>
                    </div>
                    <div className="flex items-center gap-3">
                        {isOnline ? (
                            <Wifi className="w-5 h-5 text-green-300" />
                        ) : (
                            <WifiOff className="w-5 h-5 text-red-300" />
                        )}
                        <button onClick={handleLogout} className="p-2">
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <p className="text-sm opacity-80 mt-1">
                    <User className="w-4 h-4 inline mr-1" />
                    {user?.nombre}
                </p>
                {pendingProducts.length > 0 && (
                    <div className="mt-2 bg-yellow-500/20 rounded-lg p-2 text-sm flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        {pendingProducts.length} productos pendientes de sincronizar
                    </div>
                )}
            </div>

            {/* Success Animation */}
            {showSuccess && (
                <div className="fixed inset-0 bg-green-500/90 z-50 flex items-center justify-center animate-pulse">
                    <div className="text-center text-white">
                        <Check className="w-20 h-20 mx-auto mb-4" />
                        <p className="text-2xl font-bold">¡Guardado!</p>
                    </div>
                </div>
            )}

            {/* Camera View */}
            {scanning && (
                <div className="fixed inset-0 bg-black z-40 flex flex-col">
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="flex-1 object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={stopCamera}
                                className="p-4 bg-red-500 rounded-full text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                            <button
                                onClick={capturePhoto}
                                className="p-6 bg-white rounded-full"
                            >
                                <Camera className="w-8 h-8 text-gray-800" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <canvas ref={canvasRef} className="hidden" />
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Main Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">

                {/* Image Section */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <p className="text-sm font-medium text-gray-700 mb-3">Foto del Producto</p>

                    {capturedImage ? (
                        <div className="relative">
                            <img
                                src={capturedImage}
                                alt="Producto"
                                className="w-full h-48 object-cover rounded-xl"
                            />
                            <button
                                type="button"
                                onClick={() => setCapturedImage(null)}
                                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={startCamera}
                                className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-xl border-2 border-dashed border-blue-200"
                            >
                                <Camera className="w-8 h-8 text-blue-500 mb-2" />
                                <span className="text-sm text-blue-600">Tomar Foto</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center justify-center p-6 bg-purple-50 rounded-xl border-2 border-dashed border-purple-200"
                            >
                                <Upload className="w-8 h-8 text-purple-500 mb-2" />
                                <span className="text-sm text-purple-600">Galería</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Barcode Section */}
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                    <p className="text-sm font-medium text-gray-700 mb-3">Código de Barras</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            {...register('codigo_barras')}
                            ref={(e) => {
                                register('codigo_barras').ref(e);
                                barcodeInputRef.current = e;
                            }}
                            className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-mono"
                            placeholder="Escanea o escribe..."
                            autoComplete="off"
                        />
                        <button
                            type="button"
                            onClick={scanBarcode}
                            className="p-3 bg-gray-100 rounded-xl"
                        >
                            <Barcode className="w-6 h-6 text-gray-600" />
                        </button>
                    </div>
                </div>

                {/* Product Info */}
                <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
                    <p className="text-sm font-medium text-gray-700">Información del Producto</p>

                    <div>
                        <label className="text-xs text-gray-500">Nombre del Producto *</label>
                        <input
                            type="text"
                            {...register('nombre', { required: true })}
                            className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nombre como lo identifican ustedes"
                        />
                    </div>

                    <div>
                        <label className="text-xs text-gray-500">Nombre del Proveedor</label>
                        <input
                            type="text"
                            {...register('nombre_proveedor')}
                            className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Nombre exacto del fabricante"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-gray-500">SKU Proveedor</label>
                            <input
                                type="text"
                                {...register('sku_proveedor')}
                                className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Código original"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-gray-500">Marca</label>
                            <input
                                type="text"
                                {...register('marca')}
                                className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Marca"
                            />
                        </div>
                    </div>

                    {/* Precios con 5 niveles */}
                    <div className="bg-blue-50 rounded-xl p-3 space-y-3">
                        <p className="text-sm font-medium text-blue-700">💰 Precios (5 niveles)</p>

                        <div>
                            <label className="text-xs text-gray-500">Costo Base *</label>
                            <input
                                type="number"
                                step="0.01"
                                {...register('precio_compra', { required: true })}
                                onChange={(e) => {
                                    const costo = parseFloat(e.target.value) || 0;
                                    // Auto-calcular los 5 niveles de precios
                                    // Incrementos por defecto: 15%, 25%, 35%, 45%, 55%
                                    setValue('precio_1', (costo * 1.15).toFixed(2));
                                    setValue('precio_2', (costo * 1.25).toFixed(2));
                                    setValue('precio_3', (costo * 1.35).toFixed(2));
                                    setValue('precio_4', (costo * 1.45).toFixed(2));
                                    setValue('precio_5', (costo * 1.55).toFixed(2));
                                    setValue('precio_venta', (costo * 1.55).toFixed(2)); // Precio público = nivel 5
                                }}
                                className="w-full mt-1 px-4 py-3 rounded-xl border-2 border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-bold text-lg"
                                placeholder="$0.00"
                            />
                        </div>

                        <div className="grid grid-cols-5 gap-2">
                            <div className="text-center">
                                <label className="text-xs text-gray-500 block">P1 (+15%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register('precio_1')}
                                    className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm text-center"
                                />
                            </div>
                            <div className="text-center">
                                <label className="text-xs text-gray-500 block">P2 (+25%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register('precio_2')}
                                    className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm text-center"
                                />
                            </div>
                            <div className="text-center">
                                <label className="text-xs text-gray-500 block">P3 (+35%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register('precio_3')}
                                    className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm text-center"
                                />
                            </div>
                            <div className="text-center">
                                <label className="text-xs text-gray-500 block">P4 (+45%)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register('precio_4')}
                                    className="w-full px-2 py-2 rounded-lg border border-gray-200 text-sm text-center"
                                />
                            </div>
                            <div className="text-center">
                                <label className="text-xs text-green-600 font-bold block">Público</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register('precio_5')}
                                    className="w-full px-2 py-2 rounded-lg border-2 border-green-400 text-sm text-center bg-green-50 font-bold"
                                />
                            </div>
                        </div>

                        <input type="hidden" {...register('precio_venta')} />
                    </div>

                    <div>
                        <label className="text-xs text-gray-500">Categoría</label>
                        <input
                            type="text"
                            {...register('categoria')}
                            className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Bebidas, Abarrotes..."
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <RefreshCw className="w-5 h-5 animate-spin" />
                            Guardando...
                        </>
                    ) : (
                        <>
                            <Check className="w-5 h-5" />
                            Guardar y Siguiente
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
