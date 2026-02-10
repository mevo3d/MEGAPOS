import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import {
    ArrowLeft, Save, FileText, Upload, Trash2,
    User, Briefcase, CreditCard, Calendar, MapPin
} from 'lucide-react';

export default function EmpleadoExpediente({ empleadoId, onBack }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [documentos, setDocumentos] = useState([]);
    const [file, setFile] = useState(null);
    const [docNombre, setDocNombre] = useState('');

    useEffect(() => {
        if (empleadoId) {
            fetchData();
            fetchDocumentos();
        }
    }, [empleadoId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/empleados/${empleadoId}`);
            setData(res.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDocumentos = async () => {
        try {
            const res = await api.get(`/empleados/${empleadoId}/documentos`);
            setDocumentos(res.data);
        } catch (error) {
            console.error('Error fetching docs:', error);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await api.put(`/empleados/${empleadoId}`, data);
            alert('Cambios guardados exitosamente');
        } catch (error) {
            console.error('Error saving:', error);
            alert('Error al guardar cambios');
        } finally {
            setSaving(false);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        const formData = new FormData();
        formData.append('documento', file);
        formData.append('nombre_documento', docNombre || file.name);

        try {
            await api.post(`/empleados/${empleadoId}/documentos`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFile(null);
            setDocNombre('');
            fetchDocumentos();
        } catch (error) {
            console.error('Error uploading:', error);
        }
    };

    const handleDeleteDoc = async (docId) => {
        if (!confirm('¿Eliminar este documento?')) return;
        try {
            await api.delete(`/empleados/documentos/${docId}`);
            fetchDocumentos();
        } catch (error) {
            console.error('Error deleting doc:', error);
        }
    };

    if (loading) return <div className="p-12 text-center text-gray-400">Cargando expediente...</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={onBack}>
                    <ArrowLeft size={18} className="mr-2" /> Volver
                </Button>
                <h2 className="text-2xl font-bold">Expediente: {data.nombre}</h2>
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Columna Principal - Datos */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader className="border-b">
                            <CardTitle className="flex items-center gap-2">
                                <User size={18} className="text-blue-500" /> Datos Personales
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">RFC</label>
                                <input
                                    type="text" className="w-full p-2 border rounded-md uppercase"
                                    value={data.rfc || ''}
                                    onChange={e => setData({ ...data, rfc: e.target.value })}
                                    placeholder="RFC123456ABC"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">CURP</label>
                                <input
                                    type="text" className="w-full p-2 border rounded-md uppercase"
                                    value={data.curp || ''}
                                    onChange={e => setData({ ...data, curp: e.target.value })}
                                    placeholder="CURP123456H..."
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">NSS</label>
                                <input
                                    type="text" className="w-full p-2 border rounded-md"
                                    value={data.nss || ''}
                                    onChange={e => setData({ ...data, nss: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">Fecha Nacimiento</label>
                                <input
                                    type="date" className="w-full p-2 border rounded-md"
                                    value={data.fecha_nacimiento ? data.fecha_nacimiento.split('T')[0] : ''}
                                    onChange={e => setData({ ...data, fecha_nacimiento: e.target.value })}
                                />
                            </div>
                            <div className="md:col-span-2 space-y-1">
                                <label className="text-xs font-semibold text-gray-500">Dirección Completa</label>
                                <textarea
                                    className="w-full p-2 border rounded-md" rows="2"
                                    value={data.direccion || ''}
                                    onChange={e => setData({ ...data, direccion: e.target.value })}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="border-b">
                            <CardTitle className="flex items-center gap-2">
                                <CreditCard size={18} className="text-green-500" /> Nómina y Comisiones
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">Salario Diario Integrado</label>
                                <input
                                    type="number" step="0.01" className="w-full p-2 border rounded-md"
                                    value={data.salario_diario_integrado || 0}
                                    onChange={e => setData({ ...data, salario_diario_integrado: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">Periodicidad Pago</label>
                                <select
                                    className="w-full p-2 border rounded-md"
                                    value={data.periodicidad_pago || 'semanal'}
                                    onChange={e => setData({ ...data, periodicidad_pago: e.target.value })}
                                >
                                    <option value="semanal">Semanal</option>
                                    <option value="quincenal">Quincenal</option>
                                    <option value="mensual">Mensual</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">Porcentaje Comisión (%)</label>
                                <input
                                    type="number" step="0.1" className="w-full p-2 border border-blue-200 rounded-md bg-blue-50"
                                    value={data.porcentaje_comision || 0}
                                    onChange={e => setData({ ...data, porcentaje_comision: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500">Banco / CLABE</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text" className="w-1/3 p-2 border rounded-md" placeholder="Banco"
                                        value={data.banco || ''}
                                        onChange={e => setData({ ...data, banco: e.target.value })}
                                    />
                                    <input
                                        type="text" className="flex-1 p-2 border rounded-md" placeholder="CLABE (18 dígitos)"
                                        value={data.clabe || ''}
                                        onChange={e => setData({ ...data, clabe: e.target.value })}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Columna Lateral - Documentos y Acciones */}
                <div className="space-y-6">
                    <Card className="bg-gradient-to-br from-blue-600 to-purple-700 text-white shadow-xl">
                        <CardContent className="p-6">
                            <p className="text-sm opacity-80 mb-1">Puesto Actual</p>
                            <h3 className="text-xl font-bold capitalize mb-4">{data.rol}</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="opacity-70">Fecha Ingreso:</span>
                                    <span>{new Date(data.fecha_ingreso).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="opacity-70">Sucursal:</span>
                                    <span>{data.sucursal_nombre}</span>
                                </div>
                            </div>
                            <Button
                                type="submit" disabled={saving}
                                className="w-full mt-6 bg-white text-blue-700 hover:bg-gray-100 font-bold"
                            >
                                <Save size={18} className="mr-2" /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                            </Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="border-b">
                            <CardTitle className="text-md flex items-center gap-2">
                                <FileText size={18} /> Documentos Digitales
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 space-y-4">
                            {/* Upload form */}
                            <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-dashed">
                                <input
                                    type="text" placeholder="Ej: RFC, CURP..."
                                    className="w-full text-xs p-2 border rounded"
                                    value={docNombre} onChange={e => setDocNombre(e.target.value)}
                                />
                                <input
                                    type="file" className="text-xs w-full"
                                    onChange={e => setFile(e.target.files[0])}
                                />
                                <Button
                                    size="sm" className="w-full" disabled={!file}
                                    onClick={handleUpload}
                                >
                                    <Upload size={14} className="mr-1" /> Subir
                                </Button>
                            </div>

                            {/* Docs List */}
                            <div className="space-y-2">
                                {documentos.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50 group">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileText size={16} className="text-gray-400 shrink-0" />
                                            <div className="truncate">
                                                <p className="text-xs font-bold truncate">{doc.nombre_documento}</p>
                                                <p className="text-[10px] text-gray-500">{new Date(doc.fecha_subida).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a
                                                href={`${import.meta.env.VITE_API_BASE_URL || ''}${doc.ruta_archivo}`}
                                                target="_blank" rel="noreferrer"
                                                className="p-1 hover:text-blue-600"
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                            <button
                                                onClick={() => handleDeleteDoc(doc.id)}
                                                className="p-1 hover:text-red-500"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {documentos.length === 0 && (
                                    <p className="text-center text-xs text-gray-400 py-4">Sin documentos subidos</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </form>
        </div>
    );
}
