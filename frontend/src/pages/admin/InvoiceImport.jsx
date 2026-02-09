import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardTitle } from '../../components/ui/Card';
import { Upload, Camera, FileText, Check, AlertCircle, Loader2, Trash2, Zap, Edit2, Building, Phone, Mail, MapPin, Hash } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useImportStore } from '../../context/importStore';
import { useAuthStore } from '../../context/authStore';

export default function InvoiceImport() {
    // Use global store for persistence
    const { invoiceData, setInvoiceData, clearInvoiceData } = useImportStore();
    const { user } = useAuthStore();
    // Extended invoiceData structure with provider details and page tracking
    const { images, previews, results, proveedor, proveedorData, numero_factura, fecha_factura, total_paginas, documento } = invoiceData;

    // Processing state is transient
    const [processing, setProcessing] = useState(false);
    const [importing, setImporting] = useState(false);

    // Function to handle inline product field edits
    const handleProductEdit = (productId, field, value) => {
        const updatedResults = results.map(item => {
            if (item.id === productId) {
                // Handle numeric fields
                const numericFields = ['cantidad', 'precio_unitario', 'iva', 'importe', 'piezas_por_caja'];
                const newValue = numericFields.includes(field) ? parseFloat(value) || 0 : value;
                return { ...item, [field]: newValue };
            }
            return item;
        });
        setInvoiceData({ results: updatedResults });
    };

    // Function to delete a product row
    const handleDeleteProduct = (productId) => {
        const updatedResults = results.filter(item => item.id !== productId);
        setInvoiceData({ results: updatedResults });
        toast.success('Producto eliminado');
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            const newPreviews = files.map(file => URL.createObjectURL(file));

            // Append or Replace? Let's append for now, but limit to 5
            const currentImages = images || [];
            const currentPreviews = previews || [];

            if (currentImages.length + files.length > 5) {
                toast.error('Máximo 5 imágenes permitidas');
                return;
            }

            setInvoiceData({
                images: [...currentImages, ...files],
                previews: [...currentPreviews, ...newPreviews],
                results: null,
                proveedor: ''
            });
        }
    };

    const handleClear = () => {
        if (window.confirm('¿Estás seguro de limpiar todo?')) {
            clearInvoiceData(); // Store should reset to { images: [], previews: [], results: [], proveedor: '' } if updated, or we manually set it here if store is simple
            setInvoiceData({ images: [], previews: [], results: null, proveedor: '' });
        }
    };

    const handleProcess = async () => {
        if (!images || images.length === 0) return;

        setProcessing(true);
        const formData = new FormData();
        images.forEach((file) => {
            formData.append('invoices', file);
        });

        try {
            // Real AI Analysis call
            const response = await api.post('/import/analyze', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const { proveedor, productos, numero_factura, fecha_factura, total_paginas, documento } = response.data.data;

            // Map backend response to frontend state structure with new fields
            const processedResults = productos.map(p => ({
                id: p.id,
                pagina: p.pagina || 1,
                numero_linea: p.numero_linea || 0,
                sku_proveedor: p.sku_proveedor || '',
                codigo_barras: p.codigo_barras || '',
                codigo: p.codigo || '',
                descripcion: p.descripcion || p.nombre || '',
                nombre_interno: p.nombre_interno || p.descripcion || '',
                cantidad: p.cantidad || p.cantidad_cajas || 1,
                unidad: p.unidad || 'PIEZA',
                piezas_por_caja: p.piezas_por_caja || 1,
                stock_total: p.stock_total || p.cantidad || 1,
                precio_unitario: p.precio_unitario || p.costo_unitario_caja || 0,
                iva: p.iva || 0,
                importe: p.importe || p.costo_total || 0,
                costo_unitario: p.costo_unitario || p.precio_unitario || 0,
                is_learned: p.is_learned
            }));

            // Proveedor is now an object with more details
            const proveedorData = typeof proveedor === 'object' ? proveedor : { nombre: proveedor };

            setInvoiceData({
                results: processedResults,
                proveedor: proveedorData.nombre || 'Proveedor Desconocido',
                proveedorData: proveedorData,
                numero_factura: numero_factura,
                fecha_factura: fecha_factura,
                total_paginas: total_paginas,
                documento: documento || {}
            });

            toast.success(
                productos.some(p => p.is_learned)
                    ? '¡Factura analizada! Se detectaron productos aprendidos previamente.'
                    : 'Factura analizada por IA.'
            );

        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Error al procesar la factura');
        } finally {
            setProcessing(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!results || results.length === 0) {
            toast.error('No hay productos para importar');
            return;
        }

        setImporting(true);
        try {
            const response = await api.post('/import/confirm', {
                proveedor,
                proveedorData,   // Include full provider data object
                productos: results,
                numero_factura,
                fecha_factura,
                documento    // Include document metadata (UUID, forma_pago, etc)
            });

            if (response.data.success) {
                toast.success(`¡${results.length} productos importados exitosamente!`);
                // Clear the invoice data after successful import
                setInvoiceData({ images: [], previews: [], results: null, proveedor: '' });
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Error al importar productos');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Camera className="text-blue-600" />
                        Importar FACTURA INTELIGENTE
                    </h2>
                    <p className="text-gray-500 text-sm">IA con Machine Learning: Normaliza nombres, detecta cajas/piezas y calcula costos unitarios.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Upload Section */}
                <Card className={`glass border-0 shadow-lg ${results ? 'h-auto' : 'h-full'}`}>
                    <CardContent className="p-6">
                        {!results ? (
                            <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                                {previews && previews.length > 0 ? (
                                    <div className="flex flex-col items-center w-full">
                                        <div className="flex gap-4 overflow-x-auto p-4 w-full justify-center">
                                            {previews.map((src, idx) => (
                                                <div key={idx} className="relative group">
                                                    <img src={src} alt={`Factura ${idx}`} className="h-32 rounded-lg shadow border object-cover" />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2 mt-4">
                                            <Button variant="outline" onClick={handleClear}><Trash2 className="w-4 h-4 mr-2" />Limpiar</Button>
                                            <Button onClick={handleProcess} disabled={processing} className="gradient-primary">
                                                {processing ? <Loader2 className="animate-spin mr-2" /> : <Zap className="mr-2" />}
                                                {processing ? 'Analizando...' : `Analizar ${images.length} Imagen(es)`}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col md:flex-row gap-6">
                                        {/* Standard Upload */}
                                        <div className="flex-1">
                                            <label className="cursor-pointer group block">
                                                <input
                                                    type="file"
                                                    accept="image/*,.heic,.heif"
                                                    multiple
                                                    className="hidden"
                                                    onChange={handleImageChange}
                                                />
                                                <div className="px-8 py-6 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl hover:bg-blue-100 transition-colors text-center h-full flex flex-col justify-center items-center">
                                                    <Upload className="w-8 h-8 mb-3 text-blue-600" />
                                                    <span className="font-semibold text-blue-900 block">Subir Archivos</span>
                                                    <span className="text-xs text-blue-500 mt-1">Soporta múltiples imágenes</span>
                                                </div>
                                            </label>
                                        </div>

                                        {/* Camera Capture */}
                                        <div className="flex-1">
                                            <label className="cursor-pointer group block">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    capture="environment"
                                                    className="hidden"
                                                    onChange={handleImageChange}
                                                />
                                                <div className="px-8 py-6 bg-purple-50 border-2 border-dashed border-purple-200 rounded-xl hover:bg-purple-100 transition-colors text-center h-full flex flex-col justify-center items-center">
                                                    <Camera className="w-8 h-8 mb-3 text-purple-600" />
                                                    <span className="font-semibold text-purple-900 block">Usar Cámara</span>
                                                    <span className="text-xs text-purple-500 mt-1">Tomar foto directa</span>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <img src={previews && previews[0]} alt="Thumb" className="w-16 h-16 object-cover rounded shadow border" />
                                    <div>
                                        <p className="font-bold text-gray-800">Factura Cargada</p>
                                        <p className="text-xs text-gray-500">{results.length} coincidencias encontradas</p>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={handleClear}>Nueva Escaneo</Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Results Section */}
                {results && (
                    <Card className="glass border-0 shadow-lg animate-slide-up">
                        <CardContent className="p-6">
                            {/* Provider Info Section - Expanded */}
                            <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* Proveedor Nombre */}
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                                            <Building className="w-3 h-3" /> Proveedor
                                        </label>
                                        <input
                                            type="text"
                                            value={proveedor}
                                            onChange={(e) => setInvoiceData({ proveedor: e.target.value })}
                                            className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 font-bold text-blue-900 focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    {/* RFC */}
                                    <div>
                                        <label className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                                            <Hash className="w-3 h-3" /> RFC
                                        </label>
                                        <input
                                            type="text"
                                            value={proveedorData?.rfc || ''}
                                            onChange={(e) => setInvoiceData({ proveedorData: { ...proveedorData, rfc: e.target.value } })}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500"
                                            placeholder="RFC..."
                                        />
                                    </div>
                                    {/* Telefono */}
                                    <div>
                                        <label className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                                            <Phone className="w-3 h-3" /> Teléfono
                                        </label>
                                        <input
                                            type="text"
                                            value={proveedorData?.telefono || ''}
                                            onChange={(e) => setInvoiceData({ proveedorData: { ...proveedorData, telefono: e.target.value } })}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500"
                                            placeholder="Teléfono..."
                                        />
                                    </div>
                                    {/* Email */}
                                    <div>
                                        <label className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                                            <Mail className="w-3 h-3" /> Email
                                        </label>
                                        <input
                                            type="email"
                                            value={proveedorData?.email || ''}
                                            onChange={(e) => setInvoiceData({ proveedorData: { ...proveedorData, email: e.target.value } })}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500"
                                            placeholder="Email..."
                                        />
                                    </div>
                                    {/* Direccion */}
                                    <div className="col-span-1 md:col-span-2">
                                        <label className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                                            <MapPin className="w-3 h-3" /> Dirección
                                        </label>
                                        <input
                                            type="text"
                                            value={proveedorData?.direccion || ''}
                                            onChange={(e) => setInvoiceData({ proveedorData: { ...proveedorData, direccion: e.target.value } })}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:ring-2 focus:ring-blue-500"
                                            placeholder="Dirección..."
                                        />
                                    </div>
                                    {/* Factura Info */}
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">No. Factura</label>
                                        <p className="font-mono text-gray-800">{numero_factura || 'N/A'}</p>
                                    </div>
                                    {/* Action Button */}
                                    <div className="flex items-end">
                                        <Button onClick={handleConfirmImport} disabled={importing} className="w-full gradient-primary shadow-lg shadow-blue-500/20">
                                            {importing ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2" />}
                                            {importing ? 'Importando...' : 'Confirmar Importación'}
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Products Table - Editable */}
                            <div className="overflow-x-auto border rounded-xl shadow-sm bg-white">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                        <tr>
                                            <th className="px-2 py-3 text-center w-10 bg-purple-50 text-purple-700">Hoja</th>
                                            <th className="px-3 py-3 text-left w-24">SKU</th>
                                            <th className="px-3 py-3 text-left">Descripción</th>
                                            <th className="px-3 py-3 text-center w-20">Cant.</th>
                                            <th className="px-3 py-3 text-center w-20">Unidad</th>
                                            <th className="px-3 py-3 text-right w-24">P. Unit.</th>
                                            <th className="px-3 py-3 text-right w-20">IVA</th>
                                            <th className="px-3 py-3 text-right w-24 bg-green-50 text-green-700">Importe</th>
                                            <th className="px-2 py-3 text-center w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {results.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                                {/* Página/Hoja */}
                                                <td className="px-2 py-2 text-center">
                                                    <span className="inline-flex items-center justify-center w-7 h-7 bg-purple-100 text-purple-700 rounded-full font-bold text-xs">
                                                        {item.pagina || 1}
                                                    </span>
                                                </td>
                                                {/* SKU */}
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={item.sku_proveedor}
                                                        onChange={(e) => handleProductEdit(item.id, 'sku_proveedor', e.target.value)}
                                                        className="w-full font-mono text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1"
                                                    />
                                                </td>
                                                {/* Descripción */}
                                                <td className="px-3 py-2">
                                                    <input
                                                        type="text"
                                                        value={item.descripcion || item.nombre_interno}
                                                        onChange={(e) => handleProductEdit(item.id, 'descripcion', e.target.value)}
                                                        className="w-full font-medium text-gray-900 border border-gray-200 rounded px-2 py-1"
                                                    />
                                                    {item.is_learned && (
                                                        <span className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                                            <Zap className="w-3 h-3" /> Aprendido
                                                        </span>
                                                    )}
                                                </td>
                                                {/* Cantidad */}
                                                <td className="px-3 py-2 text-center">
                                                    <input
                                                        type="number"
                                                        value={item.cantidad}
                                                        onChange={(e) => handleProductEdit(item.id, 'cantidad', e.target.value)}
                                                        className="w-16 text-center border border-gray-200 rounded bg-orange-50 font-bold"
                                                    />
                                                </td>
                                                {/* Unidad */}
                                                <td className="px-3 py-2 text-center">
                                                    <select
                                                        value={item.unidad}
                                                        onChange={(e) => handleProductEdit(item.id, 'unidad', e.target.value)}
                                                        className="w-full text-center border border-gray-200 rounded px-1 py-1 text-xs"
                                                    >
                                                        <option value="PIEZA">PIEZA</option>
                                                        <option value="CAJA">CAJA</option>
                                                        <option value="PAQUETE">PAQUETE</option>
                                                        <option value="KG">KG</option>
                                                        <option value="LITRO">LITRO</option>
                                                    </select>
                                                </td>
                                                {/* Precio Unitario */}
                                                <td className="px-3 py-2 text-right">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.precio_unitario}
                                                        onChange={(e) => handleProductEdit(item.id, 'precio_unitario', e.target.value)}
                                                        className="w-20 text-right border border-gray-200 rounded px-2 py-1"
                                                    />
                                                </td>
                                                {/* IVA */}
                                                <td className="px-3 py-2 text-right">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.iva}
                                                        onChange={(e) => handleProductEdit(item.id, 'iva', e.target.value)}
                                                        className="w-16 text-right border border-gray-200 rounded px-2 py-1 text-xs"
                                                    />
                                                </td>
                                                {/* Importe */}
                                                <td className="px-3 py-2 text-right font-bold text-green-700 bg-green-50/30">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.importe}
                                                        onChange={(e) => handleProductEdit(item.id, 'importe', e.target.value)}
                                                        className="w-20 text-right font-bold border border-gray-200 rounded px-2 py-1 bg-green-50"
                                                    />
                                                </td>
                                                {/* Delete */}
                                                <td className="px-2 py-2 text-center">
                                                    <button
                                                        onClick={() => handleDeleteProduct(item.id)}
                                                        className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary Footer */}
                            <div className="mt-4 flex justify-between items-center text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="flex gap-4">
                                    <span>Total Productos: <strong>{results.length}</strong></span>
                                    <span>Total Importe: <strong className="text-green-700">${results.reduce((acc, curr) => acc + (curr.importe || 0), 0).toFixed(2)}</strong></span>
                                    {total_paginas > 1 && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full text-xs font-bold">{total_paginas} hojas importadas</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-blue-500" />
                                    <span>El sistema aprenderá estas correcciones para futuras importaciones.</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
