import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Save, Lock, Eye, EyeOff, Server, Key, Settings } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/layout/AdminLayout';

export default function Configuracion() {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showSecrets, setShowSecrets] = useState({});

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const { data } = await api.get('/config');
            setConfigs(data);
        } catch (error) {
            console.error(error);
            toast.error('Error cargando configuraciones');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (key, value) => {
        try {
            await api.put('/config', { key, value });
            toast.success('Configuración actualizada');
            fetchConfigs(); // Refresh to ensure backend state
        } catch (error) {
            toast.error('Error al guardar');
        }
    };

    const toggleSecret = (key) => {
        setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Group configs by 'grupo'
    const groupedConfigs = configs.reduce((acc, config) => {
        const group = config.grupo || 'general';
        if (!acc[group]) acc[group] = [];
        acc[group].push(config);
        return acc;
    }, {});

    return (
        <AdminLayout>
            <div className="space-y-6 animate-fade-in p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Settings className="w-8 h-8 text-blue-600" />
                            Configuración del Sistema
                        </h1>
                        <p className="text-gray-500">Gestiona claves de API, integraciones y parámetros globales.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {Object.entries(groupedConfigs).map(([group, items]) => (
                            <Card key={group} className="glass shadow-lg">
                                <CardContent className="p-6">
                                    <h2 className="text-xl font-semibold capitalize mb-4 text-gray-700 flex items-center gap-2">
                                        {group === 'api' ? <Key className="w-5 h-5" /> : <Server className="w-5 h-5" />}
                                        {group === 'api' ? 'Integraciones & APIs' : `Configuración: ${group}`}
                                    </h2>

                                    <div className="space-y-4">
                                        {items.map((conf) => (
                                            <div key={conf.key} className="bg-white/50 p-4 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                                                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-bold text-gray-700 mb-1">
                                                            {conf.descripcion || conf.key}
                                                        </label>
                                                        <code className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{conf.key}</code>
                                                    </div>

                                                    <div className="flex-1 w-full flex items-center gap-2">
                                                        <div className="relative w-full">
                                                            {conf.is_secret && !showSecrets[conf.key] ? (
                                                                <div className="w-full h-10 bg-gray-100 rounded border flex items-center px-3 text-gray-400 select-none">
                                                                    ••••••••••••••••••••••
                                                                </div>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    defaultValue={conf.value === '********' ? '' : conf.value}
                                                                    placeholder={conf.value === '********' ? 'Oculto por seguridad' : ''}
                                                                    className="w-full h-10 px-3 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                                    onBlur={(e) => {
                                                                        if (e.target.value && e.target.value !== conf.value && e.target.value !== '********') {
                                                                            handleUpdate(conf.key, e.target.value);
                                                                        }
                                                                    }}
                                                                />
                                                            )}

                                                            {conf.is_secret && (
                                                                <button
                                                                    onClick={() => toggleSecret(conf.key)}
                                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                                >
                                                                    {showSecrets[conf.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-blue-600 whitespace-nowrap hidden md:block">
                                                            {conf.is_secret ? 'Click ojo para editar' : 'Click fuera para guardar'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
