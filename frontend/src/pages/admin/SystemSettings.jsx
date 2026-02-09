import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import {
    Settings, Save, Building2, Phone, Mail, MapPin,
    FileText, DollarSign, Percent, Clock, Shield, Star, Zap, Eye, EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SystemSettings() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [activeTab, setActiveTab] = useState('empresa');
    const [config, setConfig] = useState({
        // Empresa
        empresa_nombre: 'MEGAMAYOREO',
        empresa_razon_social: '',
        empresa_rfc: '',
        empresa_direccion: '',
        empresa_telefono: '',
        empresa_email: '',

        // Ventas
        iva_porcentaje: '16',
        moneda: 'MXN',
        precio_incluye_iva: 'true',
        permitir_venta_sin_stock: 'false',

        // Niveles de Precios (% incremento sobre costo)
        precio_incremento_1: '15',
        precio_incremento_2: '25',
        precio_incremento_3: '35',
        precio_incremento_4: '45',
        precio_incremento_5: '55',
        precio_1_nombre: 'Mayoreo Grande',
        precio_2_nombre: 'Mayoreo',
        precio_3_nombre: 'Medio Mayoreo',
        precio_4_nombre: 'Menudeo',
        precio_5_nombre: 'Público',

        // Puntos
        puntos_activo: 'true',
        puntos_por_peso: '1',      // 1 punto por cada $1
        puntos_valor_canje: '1000', // 1000 puntos = $1 mxn de descuento
        puntos_expiracion_dias: '365',

        // Tickets
        ticket_mostrar_logo: 'true',
        ticket_mensaje_pie: 'Gracias por su compra',
        ticket_formato: '80mm',

        // Inventario
        alerta_stock_minimo: '5',
        permitir_stock_negativo: 'false',

        // Seguridad
        sesion_expiracion_horas: '24',
        intentos_login_max: '5',

        // Integraciones
        openai_api_key: ''
    });

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await api.get('/config'); // Updated endpoint
            // Backend returns array of { key, value }
            if (res.data) {
                const configObj = {};
                res.data.forEach(c => {
                    configObj[c.key] = c.value; // Map key->value
                });
                setConfig(prev => ({ ...prev, ...configObj }));
            }
        } catch (error) {
            console.error('Error cargando configuración:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (key, value) => {
        setConfig(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Guardar cada configuración
            for (const [key, value] of Object.entries(config)) {
                // Use PUT and send { key, value }
                // Convert value to string if necessary, though backend stores as TEXT
                await api.put('/config', { key, value: String(value) });
            }
            toast.success('Configuración guardada correctamente');
        } catch (error) {
            console.error(error);
            toast.error('Error guardando configuración');
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'empresa', label: 'Empresa', icon: Building2 },
        { id: 'precios', label: 'Precios', icon: Percent },
        { id: 'puntos', label: 'Puntos', icon: Star },
        { id: 'ventas', label: 'Ventas', icon: DollarSign },
        { id: 'tickets', label: 'Tickets', icon: FileText },
        { id: 'inventario', label: 'Inventario', icon: Settings },
        { id: 'seguridad', label: 'Seguridad', icon: Shield },
        { id: 'integraciones', label: 'Integraciones', icon: Zap }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Configuración del Sistema</h2>
                    <p className="text-gray-500">Ajusta los parámetros generales del POS</p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="gradient-primary">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 py-2 px-4 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-all whitespace-nowrap
                            ${activeTab === tab.id
                                ? 'bg-blue-500 text-white shadow'
                                : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab: Empresa */}
            {activeTab === 'empresa' && (
                <Card className="shadow-lg border-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-blue-500" />
                            Datos de la Empresa
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Nombre Comercial"
                                value={config.empresa_nombre}
                                onChange={(e) => handleChange('empresa_nombre', e.target.value)}
                            />
                            <Input
                                label="Razón Social"
                                value={config.empresa_razon_social}
                                onChange={(e) => handleChange('empresa_razon_social', e.target.value)}
                            />
                        </div>
                        <Input
                            label="RFC"
                            value={config.empresa_rfc}
                            onChange={(e) => handleChange('empresa_rfc', e.target.value)}
                        />
                        <Input
                            label="Dirección Fiscal"
                            value={config.empresa_direccion}
                            onChange={(e) => handleChange('empresa_direccion', e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Teléfono"
                                value={config.empresa_telefono}
                                onChange={(e) => handleChange('empresa_telefono', e.target.value)}
                            />
                            <Input
                                label="Email"
                                type="email"
                                value={config.empresa_email}
                                onChange={(e) => handleChange('empresa_email', e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tab: Precios - Niveles de incremento */}
            {activeTab === 'precios' && (
                <Card className="shadow-lg border-0">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Percent className="w-5 h-5 text-green-500" />
                            Niveles de Precios
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg mb-4">
                            <p className="text-sm text-blue-700">
                                💡 Configura los porcentajes de incremento sobre el costo base para cada nivel de precio.
                                Por ejemplo: si el costo es $100 y el incremento es 15%, el precio 1 será $115.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {[1, 2, 3, 4, 5].map(nivel => (
                                <div key={nivel} className={`p-4 rounded-lg border-2 ${nivel === 5 ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Nombre Nivel {nivel}
                                            </label>
                                            <input
                                                type="text"
                                                value={config[`precio_${nivel}_nombre`] || ''}
                                                onChange={(e) => handleChange(`precio_${nivel}_nombre`, e.target.value)}
                                                className="w-full rounded-lg border-gray-300 p-2.5 border"
                                                placeholder={`Precio ${nivel}`}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Incremento (%)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="500"
                                                    value={config[`precio_incremento_${nivel}`] || ''}
                                                    onChange={(e) => handleChange(`precio_incremento_${nivel}`, e.target.value)}
                                                    className={`w-full rounded-lg p-2.5 border pr-12 ${nivel === 5 ? 'border-green-400 bg-white font-bold' : 'border-gray-300'}`}
                                                    placeholder="0"
                                                />
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                                            </div>
                                        </div>
                                    </div>
                                    {nivel === 5 && (
                                        <p className="text-xs text-green-600 mt-2">✓ Este es el precio público (venta al menudeo)</p>
                                    )}
                                </div>
                            ))}
                        </div>



                        <div className="bg-red-50 p-4 rounded-lg mt-6 border border-red-100">
                            <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
                                <DollarSign className="w-5 h-5" />
                                Actualización Masiva de Inventario
                            </h4>
                            <p className="text-sm text-red-700 mb-4">
                                Esta acción tomará los porcentajes configurados arriba y recalculará los precios de venta de <b>TODOS</b> los productos activos en el sistema, basándose en su COSTO de compra actual.
                            </p>
                            <Button
                                onClick={async () => {
                                    if (!window.confirm('⚠️ ¿Estás seguro? Se actualizarán TODOS los precios de productos.')) return;
                                    try {
                                        await api.post('/precios/global', {
                                            p1: config.precio_incremento_1,
                                            p2: config.precio_incremento_2,
                                            p3: config.precio_incremento_3,
                                            p4: config.precio_incremento_4,
                                            p5: config.precio_incremento_5
                                        });
                                        toast.success('Precios del inventario actualizados correctamente');
                                    } catch (e) {
                                        toast.error('Error al actualizar precios');
                                    }
                                }}
                                className="w-full bg-red-600 hover:bg-red-700 text-white"
                            >
                                Aplicar Márgenes a Todo el Inventario
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Tab: Puntos */}
            {
                activeTab === 'puntos' && (
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Star className="w-5 h-5 text-yellow-500" />
                                Configuración de Puntos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
                                <input
                                    type="checkbox"
                                    id="puntos_activo"
                                    checked={config.puntos_activo === 'true'}
                                    onChange={(e) => handleChange('puntos_activo', e.target.checked ? 'true' : 'false')}
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="puntos_activo" className="font-medium text-gray-700">
                                    Activar Sistema de Puntos
                                </label>
                            </div>

                            {config.puntos_activo === 'true' && (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Puntos por cada $1 de compra
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={config.puntos_por_peso}
                                                    onChange={(e) => handleChange('puntos_por_peso', e.target.value)}
                                                    className="w-full rounded-lg border-gray-300 p-2.5 border"
                                                />
                                                <span className="absolute right-3 top-2.5 text-gray-400 text-sm">pts</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Ejemplo: Si pones 1, una compra de $100 genera 100 puntos.
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Valor de Canje (Puntos = $1 MXN)
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={config.puntos_valor_canje}
                                                    onChange={(e) => handleChange('puntos_valor_canje', e.target.value)}
                                                    className="w-full rounded-lg border-gray-300 p-2.5 border"
                                                />
                                                <span className="absolute right-3 top-2.5 text-gray-400 text-sm">pts</span>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Ejemplo: Si pones 1000, necesitas 1000 puntos para $1 de descuento.
                                            </p>
                                        </div>
                                    </div>

                                    <Input
                                        label="Días de expiración de puntos"
                                        type="number"
                                        value={config.puntos_expiracion_dias}
                                        onChange={(e) => handleChange('puntos_expiracion_dias', e.target.value)}
                                    />

                                    <div className="bg-yellow-50 p-4 rounded-lg">
                                        <h4 className="font-bold text-yellow-800 mb-2">Resumen de Configuración:</h4>
                                        <ul className="list-disc list-inside text-yellow-700 text-sm space-y-1">
                                            <li>Una compra de <strong>$1,000 MXN</strong> generará <strong>{(1000 * parseFloat(config.puntos_por_peso || 0)).toLocaleString()} puntos</strong>.</li>
                                            <li>Para obtener <strong>$10 MXN</strong> de descuento, el cliente necesita canjear <strong>{(10 * parseFloat(config.puntos_valor_canje || 0)).toLocaleString()} puntos</strong>.</li>
                                            <li>Los puntos vencen después de <strong>{config.puntos_expiracion_dias} días</strong>.</li>
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )
            }

            {/* Tab: Ventas */}
            {
                activeTab === 'ventas' && (
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-green-500" />
                                Configuración de Ventas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="IVA (%)"
                                    type="number"
                                    value={config.iva_porcentaje}
                                    onChange={(e) => handleChange('iva_porcentaje', e.target.value)}
                                />
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Moneda</label>
                                    <select
                                        value={config.moneda}
                                        onChange={(e) => handleChange('moneda', e.target.value)}
                                        className="w-full rounded-lg border-gray-300 p-2.5 border"
                                    >
                                        <option value="MXN">Peso Mexicano (MXN)</option>
                                        <option value="USD">Dólar (USD)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="precio_iva"
                                    checked={config.precio_incluye_iva === 'true'}
                                    onChange={(e) => handleChange('precio_incluye_iva', e.target.checked ? 'true' : 'false')}
                                    className="rounded"
                                />
                                <label htmlFor="precio_iva">Los precios ya incluyen IVA</label>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="venta_sin_stock"
                                    checked={config.permitir_venta_sin_stock === 'true'}
                                    onChange={(e) => handleChange('permitir_venta_sin_stock', e.target.checked ? 'true' : 'false')}
                                    className="rounded"
                                />
                                <label htmlFor="venta_sin_stock">Permitir ventas sin stock</label>
                            </div>
                        </CardContent>
                    </Card>
                )
            }

            {/* Tab: Tickets */}
            {
                activeTab === 'tickets' && (
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-500" />
                                Formato de Tickets
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ancho de Ticket</label>
                                <select
                                    value={config.ticket_formato}
                                    onChange={(e) => handleChange('ticket_formato', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 p-2.5 border"
                                >
                                    <option value="58mm">58mm (Térmico pequeño)</option>
                                    <option value="80mm">80mm (Térmico estándar)</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="ticket_logo"
                                    checked={config.ticket_mostrar_logo === 'true'}
                                    onChange={(e) => handleChange('ticket_mostrar_logo', e.target.checked ? 'true' : 'false')}
                                    className="rounded"
                                />
                                <label htmlFor="ticket_logo">Mostrar logo en tickets</label>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje al pie del ticket</label>
                                <textarea
                                    value={config.ticket_mensaje_pie}
                                    onChange={(e) => handleChange('ticket_mensaje_pie', e.target.value)}
                                    className="w-full rounded-lg border-gray-300 p-2.5 border min-h-[80px]"
                                    placeholder="Gracias por su compra"
                                />
                            </div>
                        </CardContent>
                    </Card>
                )
            }

            {/* Tab: Inventario */}
            {
                activeTab === 'inventario' && (
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="w-5 h-5 text-orange-500" />
                                Configuración de Inventario
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input
                                label="Alerta de Stock Mínimo (unidades)"
                                type="number"
                                value={config.alerta_stock_minimo}
                                onChange={(e) => handleChange('alerta_stock_minimo', e.target.value)}
                            />
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="stock_negativo"
                                    checked={config.permitir_stock_negativo === 'true'}
                                    onChange={(e) => handleChange('permitir_stock_negativo', e.target.checked ? 'true' : 'false')}
                                    className="rounded"
                                />
                                <label htmlFor="stock_negativo">Permitir stock negativo</label>
                            </div>
                        </CardContent>
                    </Card>
                )
            }

            {/* Tab: Seguridad */}
            {
                activeTab === 'seguridad' && (
                    <Card className="shadow-lg border-0">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-red-500" />
                                Seguridad
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Input
                                label="Expiración de sesión (horas)"
                                type="number"
                                value={config.sesion_expiracion_horas}
                                onChange={(e) => handleChange('sesion_expiracion_horas', e.target.value)}
                            />
                            <Input
                                label="Intentos de login máximos antes de bloqueo"
                                type="number"
                                value={config.intentos_login_max}
                                onChange={(e) => handleChange('intentos_login_max', e.target.value)}
                            />
                        </CardContent>
                    </Card>
                )
            }

            {/* Tab: Integraciones */}
            {
                activeTab === 'integraciones' && (
                    <Card className="shadow-lg border-0 bg-gradient-to-br from-indigo-50 to-white">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-indigo-600" />
                                Integraciones y APIs
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                <h4 className="font-bold text-blue-800 mb-1 flex items-center gap-2">
                                    <Zap className="h-4 w-4" />
                                    Importación Inteligente con I.A.
                                </h4>
                                <p className="text-sm text-blue-700">
                                    Configura tu API Key de OpenAI para habilitar la lectura automática de facturas a través de fotos.
                                    Esta función permite escanear documentos y aprender automáticamente las equivalencias de tus productos.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                    OpenAI API Key (GPT-4 Vision)
                                </label>
                                <div className="relative">
                                    <Input
                                        type={showApiKey ? "text" : "password"}
                                        placeholder="sk-proj-..."
                                        value={config.openai_api_key || ''}
                                        onChange={(e) => handleChange('openai_api_key', e.target.value)}
                                        className="pl-10 pr-10"
                                    />
                                    <div className="absolute left-3 top-2.5 text-gray-400">
                                        <Shield className="h-5 w-5" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowApiKey(!showApiKey)}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 focus:outline-none"
                                    >
                                        {showApiKey ? (
                                            <EyeOff className="h-5 w-5" />
                                        ) : (
                                            <Eye className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500">
                                    La clave se almacena de forma segura en tu base de datos local. Nunca compartas esta clave.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                )
            }
        </div >
    );
}

