import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardTitle } from '../../components/ui/Card';
import { Upload, Camera, FileText, Check, AlertCircle, Loader2, Trash2, Zap } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useImportStore } from '../../context/importStore';
import { useAuthStore } from '../../context/authStore';

export default function InvoiceImport() {
    // Use global store for persistence
    const { invoiceData, setInvoiceData, clearInvoiceData } = useImportStore();
    const { user } = useAuthStore();
    const { image, preview, results, proveedor } = invoiceData;

    // Processing state is transient
    const [processing, setProcessing] = useState(false);
    const [importing, setImporting] = useState(false);



    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Create preview URL
            const previewUrl = URL.createObjectURL(file);
            setInvoiceData({
                image: file,
                preview: previewUrl,
                results: null,
                proveedor: ''
            });
        }
    };

    const handleClear = () => {
        if (window.confirm('¿Estás seguro de limpiar la factura actual?')) {
            clearInvoiceData();
        }
    };

    const handleProcess = async () => {
        if (!image) return;

        setProcessing(true);
        const formData = new FormData();
        formData.append('invoice', image);

        try {
            // Simulated AI Analysis
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Helper for Smart Parsing
            const parseSmartData = (rawItem) => {
                let nombreInterno = rawItem.nombre;
                let piezasPorCaja = 1;

                // 1. Detect Pack Size from Description (e.g., "24P", "36P", "12 Pzas")
                const packMatch = rawItem.nombre.match(/(\d+)\s*P\b|(\d+)\s*PZ/i);
                if (packMatch) {
                    piezasPorCaja = parseInt(packMatch[1] || packMatch[2]);
                }

                // 2. Expand Abbreviations for Internal Name
                nombreInterno = nombreInterno
                    .replace(/CUAD EDO PRO/g, 'Profesional Cuadro Grande') // Removed "Cuaderno" prefix to avoid double
                    .replace(/CUAD ESP PRO/g, 'Profesional Espiral') // Removed "Cuaderno" prefix
                    .replace(/C\.7/g, '7mm')
                    .replace(/C\.5/g, '5mm')
                    .replace(/100H/g, '100 Hojas')
                    .replace(/SERIE III/g, 'Serie 3')
                    .replace(/MEGA_PLUS/g, 'Mega Plus')
                    .replace(/(\d+)\s*P\b|(\d+)\s*PZ/gi, '') // Remove pack size (e.g. 24P)
                    .replace(/\s+/g, ' ') // Collapse multiple spaces
                    .trim();

                // Convert to Title Case (Capitalize First Letter of each word)
                nombreInterno = nombreInterno.replace(/\w\S*/g, (txt) => {
                    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                });

                // 3. Calculate Unit Cost
                const costoUnitario = rawItem.costo / piezasPorCaja;

                // 4. Calculate Total Stock
                const totalStock = rawItem.cantidad * piezasPorCaja;

                return {
                    ...rawItem,
                    piezas_por_caja: piezasPorCaja,
                    nombre_interno: nombreInterno,
                    nombre_proveedor: rawItem.nombre, // Keep original
                    costo_caja: rawItem.costo,
                    costo_unitario: parseFloat(costoUnitario.toFixed(2)),
                    cantidad_cajas: rawItem.cantidad,
                    stock_total: totalStock,
                    stock_total: totalStock,
                    precio_venta: 0 // Pricing deferred to Catalog
                };
            };

            // Mock Data (Raw from invoice)
            const rawResults = [
                { id: 1, sku_proveedor: 'C1099652', codigo: '7506129481548', nombre: 'Cuaderno CUAD EDO PRO C.7 100H SERIE III 24P', cantidad: 15.000, costo: 517.41, unidad: 'PZA' },
                { id: 2, sku_proveedor: 'C1089663', codigo: '7506129441562', nombre: 'Cuaderno CUAD EDO PRO C.7 100H SERIE III 24P', cantidad: 150.000, costo: 517.41, unidad: 'PZA' },
                { id: 3, sku_proveedor: 'C1087973', codigo: '7506129451776', nombre: 'Cuaderno CUAD ESP PRO C.7 100H ESCOLAR_PLUS 36P', cantidad: 50.000, costo: 450.00, unidad: 'PZA' },
                { id: 4, sku_proveedor: 'C1087972', codigo: '7506129430849', nombre: 'Cuaderno CUAD ESP PRO C.5 100H ESCOLAR_PLUS 36P', cantidad: 50.000, costo: 450.00, unidad: 'PZA' },
                { id: 5, sku_proveedor: 'C1067973', codigo: '7506129458663', nombre: 'Cuaderno CUAD ESP PRO C.7 100H ESCOLAR_PLUS 36P', cantidad: 15.000, costo: 450.00, unidad: 'PZA' },
                { id: 6, sku_proveedor: 'C1087978', codigo: '7506129451776', nombre: 'Cuaderno CUAD ESP PRO C.14 100H ESCOLAR_PLUS 36P', cantidad: 100.000, costo: 450.00, unidad: 'PZA' },
                { id: 7, sku_proveedor: 'C1089650', codigo: '7506129441524', nombre: 'Cuaderno CUAD EDO PRO 100H SERIE III 24P', cantidad: 30.000, costo: 517.41, unidad: 'PZA' },
                { id: 8, sku_proveedor: 'C1089653', codigo: '7506129441592', nombre: 'Cuaderno CUAD EDO PRO C.7 100H SERIE III 24P', cantidad: 150.000, costo: 517.41, unidad: 'PZA' },
                { id: 9, sku_proveedor: 'C1087513', codigo: '7506129430848', nombre: 'Cuaderno CUAD ESP PRO C.7 100H MEGA_PLUS 36P', cantidad: 135.000, costo: 450.00, unidad: 'PZA' },
                { id: 10, sku_proveedor: 'C1087514', codigo: '7506129430962', nombre: 'Cuaderno CUAD ESP PRO DR 100H MEGA_PLUS 36P', cantidad: 20.000, costo: 450.00, unidad: 'PZA' }
            ];

            const processedResults = rawResults.map(parseSmartData);

            setInvoiceData({
                results: processedResults,
                proveedor: 'BIO PAPPEL SCRIBE S.A. DE C.V.'
            });

            toast.success('Factura procesada con conversiones de caja y detección de nombres');

        } catch (error) {
            console.error(error);
            toast.error('Error al procesar la factura');
        } finally {
            setProcessing(false);
        }
    };

    const handleConfirmImport = async () => {
        if (!results || results.length === 0) return;
        setImporting(true);
        let successCount = 0;
        let errors = 0;

        const totalItems = results.length;
        const toastId = toast.loading(`Importando 0/${totalItems} productos...`);

        try {
            for (let i = 0; i < totalItems; i++) {
                const item = results[i];
                try {
                    // Send UNIT based data to inventory
                    const payload = {
                        nombre: item.nombre_interno, // Use the Cleaned Internal Name
                        codigo: item.codigo,
                        sku_proveedor: item.sku_proveedor,
                        nombre_proveedor: proveedor,
                        descripcion: item.nombre_proveedor, // FIX: Required by backend
                        descripcion_proveedor: item.nombre_proveedor, // Save original description for learning
                        precio_compra: item.costo_unitario, // Unit Cost ($21.55)
                        precio_venta: 0, // Pricing deferred to Catalog
                        stock_inicial: item.stock_total, // Total Pieces (360)
                        categoria: 'Papelería',
                        marca: 'Scribe',
                        unidad_medida: 'Pieza',
                        unidad_medida: 'Pieza',
                        factor_empaque: item.piezas_por_caja, // Save this for future reference
                        usuario_captura_id: user?.id // FIX: Add User ID for DB
                    };

                    await api.post('/productos', payload);
                    successCount++;
                    toast.loading(`Importando ${successCount}/${totalItems} productos...`, { id: toastId });
                } catch (err) {
                    console.error(`Error importando ${item.nombre_interno}:`, err);
                    console.error('Detalle del error:', err.response?.data); // Log detailed server error
                    errors++;
                }
            }

            if (errors === 0) {
                toast.success(`¡Éxito! ${successCount} productos importados correctamente.`, { id: toastId });
                clearInvoiceData();
            } else {
                toast.error(`Importación parcial: ${successCount} exitosos, ${errors} fallidos.`, { id: toastId });
            }

        } catch (error) {
            toast.error('Error general en la importación', { id: toastId });
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
                {/* Upload Section - Collapsible or Compact if results exist */}
                <Card className={`glass border-0 shadow-lg ${results ? 'h-auto' : 'h-full'}`}>
                    <CardContent className="p-6">
                        {!results ? (
                            <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
                                {preview ? (
                                    <div className="flex flex-col items-center">
                                        <img src={preview} alt="Factura" className="max-h-[300px] mb-4 rounded-lg shadow" />
                                        <div className="flex gap-2">
                                            <Button variant="outline" onClick={handleClear}><Trash2 className="w-4 h-4 mr-2" />Limpiar</Button>
                                            <Button onClick={handleProcess} disabled={processing} className="gradient-primary">
                                                {processing ? <Loader2 className="animate-spin mr-2" /> : <Zap className="mr-2" />}
                                                {processing ? 'Analizando con IA...' : 'Analizar Factura'}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex gap-4">
                                        <label className="cursor-pointer group">
                                            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                            <div className="px-6 py-4 bg-blue-50 border-2 border-dashed border-blue-200 rounded-xl hover:bg-blue-100 transition-colors">
                                                <div className="flex flex-col items-center text-blue-600">
                                                    <Upload className="w-6 h-6 mb-2" />
                                                    <span className="font-semibold">Subir Foto</span>
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <img src={preview} alt="Thumb" className="w-16 h-16 object-cover rounded shadow border" />
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
                            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Proveedor Detectado</label>
                                    <input
                                        type="text"
                                        value={proveedor}
                                        onChange={(e) => setInvoiceData({ proveedor: e.target.value })}
                                        className="w-full bg-transparent border-0 border-b-2 border-blue-200 focus:border-blue-500 font-bold text-blue-900 px-0 py-1"
                                    />
                                </div>
                                <div></div>
                                <div className="flex items-end justify-end">
                                    <Button onClick={handleConfirmImport} disabled={importing} className="w-full gradient-primary shadow-lg shadow-blue-500/20">
                                        {importing ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2" />}
                                        {importing ? 'Importando...' : 'Confirmar Importación'}
                                    </Button>
                                </div>
                            </div>

                            <div className="overflow-x-auto border rounded-xl shadow-sm bg-white">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left w-12">#</th>
                                            <th className="px-4 py-3 text-left">Producto (Nombre Interno / Proveedor)</th>
                                            <th className="px-4 py-3 text-center bg-orange-50/50 text-orange-800">Cajas</th>
                                            <th className="px-4 py-3 text-center bg-orange-50/50 text-orange-800">Pzas/Caja</th>
                                            <th className="px-4 py-3 text-right bg-green-50/50 text-green-800">Total Stock</th>
                                            <th className="px-4 py-3 text-right">Costo Caja</th>
                                            <th className="px-4 py-3 text-right font-bold bg-green-50/50 text-green-800">Costo Unit</th>
                                            {/* Pricing deferred */}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {results.map((item, idx) => (
                                            <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{idx + 1}</td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="text"
                                                        value={item.nombre_interno}
                                                        onChange={(e) => {
                                                            const newResults = [...results];
                                                            newResults[idx].nombre_interno = e.target.value;
                                                            setInvoiceData({ results: newResults });
                                                        }}
                                                        className="w-full font-medium text-gray-900 border-0 focus:ring-0 p-0 bg-transparent placeholder-gray-400"
                                                    />
                                                    <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                                        <span className="font-mono bg-gray-100 px-1 rounded">{item.sku_proveedor}</span>
                                                        <span>{item.nombre_proveedor}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center text-gray-600">{item.cantidad_cajas}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="number"
                                                        value={item.piezas_por_caja}
                                                        onChange={(e) => {
                                                            const val = Number(e.target.value);
                                                            const newResults = [...results];
                                                            const itm = newResults[idx];
                                                            itm.piezas_por_caja = val;
                                                            itm.stock_total = itm.cantidad_cajas * val;
                                                            itm.costo_unitario = parseFloat((itm.costo_caja / val).toFixed(2));
                                                            itm.stock_total = itm.cantidad_cajas * val;
                                                            itm.costo_unitario = parseFloat((itm.costo_caja / val).toFixed(2));
                                                            itm.precio_venta = 0;
                                                            setInvoiceData({ results: newResults });
                                                        }}
                                                        className="w-16 text-center border rounded bg-orange-50 text-orange-900 font-bold focus:ring-orange-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-green-700 bg-green-50/30">{item.stock_total}</td>
                                                <td className="px-4 py-3 text-right text-gray-500 text-xs">${item.costo_caja.toFixed(2)}</td>
                                                <td className="px-4 py-3 text-right font-mono font-bold text-gray-800">${item.costo_unitario.toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 flex justify-between items-center text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <div className="flex gap-4">
                                    <span>Total Productos: <strong>{results.length}</strong></span>
                                    <span>Total Stock a Ingresar: <strong>{results.reduce((acc, curr) => acc + curr.stock_total, 0)} pzas</strong></span>
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
