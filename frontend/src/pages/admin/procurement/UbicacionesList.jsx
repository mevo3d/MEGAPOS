import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { MapPin, Plus, Trash2, Box, QrCode } from 'lucide-react';
import toast from 'react-hot-toast';

const UbicacionesList = () => {
    const queryClient = useQueryClient();
    const [isCreating, setIsCreating] = useState(false);

    // Form States
    const [nombre, setNombre] = useState('');
    const [codigo, setCodigo] = useState('');
    const [tipo, setTipo] = useState('general');

    const { data: ubicaciones = [] } = useQuery({
        queryKey: ['ubicaciones'],
        queryFn: async () => (await api.get('/ubicaciones')).data
    });

    const createMutation = useMutation({
        mutationFn: async (data) => api.post('/ubicaciones', data),
        onSuccess: () => {
            queryClient.invalidateQueries(['ubicaciones']);
            toast.success('Ubicación creada');
            setIsCreating(false);
            setNombre('');
            setCodigo('');
        },
        onError: () => toast.error('Error al crear ubicación')
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => api.delete(`/ubicaciones/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries(['ubicaciones']);
            toast.success('Ubicación eliminada');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!nombre) return toast.error('Nombre requerido');
        createMutation.mutate({ nombre, codigo_barras: codigo, tipo });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-right duration-300">
            {/* Formulario (Sticky en Desktop) */}
            <div className="md:col-span-1">
                <Card className="sticky top-4">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Plus size={20} className="text-blue-600" />
                            Nueva Ubicación
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">Nombre / Identificador</label>
                                <Input
                                    placeholder="Ej: Pasillo A - Rack 1"
                                    value={nombre}
                                    onChange={(e) => setNombre(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Tipo</label>
                                <select
                                    className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={tipo}
                                    onChange={(e) => setTipo(e.target.value)}
                                >
                                    <option value="general">General (Almacenamiento)</option>
                                    <option value="picking">Picking (Surtido)</option>
                                    <option value="cuarentena">Cuarentena</option>
                                    <option value="merma">Merma</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">Código de Barras (Opcional)</label>
                                <Input
                                    placeholder="Escanear o escribir..."
                                    value={codigo}
                                    onChange={(e) => setCodigo(e.target.value)}
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full bg-blue-600 hover:bg-blue-700"
                                disabled={createMutation.isPending}
                            >
                                {createMutation.isPending ? 'Guardando...' : 'Crear Ubicación'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>

            {/* Lista de Ubicaciones */}
            <div className="md:col-span-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {ubicaciones.map((ub) => (
                        <div key={ub.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-start group hover:shadow-md transition-all">
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${ub.tipo === 'picking' ? 'bg-green-100 text-green-600' :
                                        ub.tipo === 'cuarentena' ? 'bg-orange-100 text-orange-600' :
                                            'bg-gray-100 text-gray-600'
                                    }`}>
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-800">{ub.nombre}</h4>
                                    <p className="text-xs text-gray-500 uppercase flex items-center gap-1">
                                        {ub.tipo}
                                        {ub.codigo_barras && (
                                            <span className="ml-2 bg-gray-100 px-1 rounded text-gray-400 flex items-center">
                                                <QrCode size={10} className="mr-1" /> {ub.codigo_barras}
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => deleteMutation.mutate(ub.id)}
                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                    {ubicaciones.length === 0 && (
                        <div className="col-span-full py-12 text-center text-gray-400 flex flex-col items-center">
                            <Box size={48} className="mb-4 opacity-30" />
                            <p>No hay ubicaciones registradas.</p>
                            <p className="text-sm">Crea la estructura de tu bodega para organizar el inventario.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UbicacionesList;
