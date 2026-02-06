import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Tags, Save, Edit2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ListasPrecios = () => {
    const queryClient = useQueryClient();
    const [editingId, setEditingId] = useState(null);
    const [editForm, setEditForm] = useState({ nombre: '', porcentaje_descuento: 0 });

    const { data: listas = [] } = useQuery({
        queryKey: ['listas-precios'],
        queryFn: async () => (await api.get('/precios/listas')).data
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => api.put(`/precios/listas/${id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['listas-precios']);
            toast.success('Lista actualizada');
            setEditingId(null);
        },
        onError: () => toast.error('Error al actualizar')
    });

    const startEdit = (lista) => {
        setEditingId(lista.id);
        setEditForm({ nombre: lista.nombre, porcentaje_descuento: lista.porcentaje_descuento });
    };

    const handleSave = () => {
        updateMutation.mutate({ id: editingId, data: editForm });
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
            {listas.map((lista) => (
                <Card key={lista.id} className={`border-t-4 ${lista.id === 1 ? 'border-t-gray-500' :
                        lista.id === 2 ? 'border-t-purple-500' :
                            'border-t-orange-500'
                    } shadow-sm hover:shadow-md transition-all`}>
                    <CardHeader className="flex flex-row justify-between items-start pb-2">
                        <div className="flex items-center gap-2">
                            <Tags size={20} className="text-gray-400" />
                            {editingId === lista.id ? (
                                <Input
                                    className="h-8 font-bold"
                                    value={editForm.nombre}
                                    onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                                />
                            ) : (
                                <CardTitle className="text-lg">{lista.nombre}</CardTitle>
                            )}
                        </div>
                        {editingId === lista.id ? (
                            <div className="flex gap-1">
                                <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}><X size={16} /></Button>
                                <Button size="sm" className="bg-green-600" onClick={handleSave}><Save size={16} /></Button>
                            </div>
                        ) : (
                            <Button size="sm" variant="ghost" onClick={() => startEdit(lista)}>
                                <Edit2 size={16} className="text-gray-400 hover:text-blue-600" />
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="text-center py-4">
                            {editingId === lista.id ? (
                                <div className="flex items-center justify-center gap-2">
                                    <Input
                                        type="number"
                                        className="w-24 text-center text-3xl font-bold"
                                        value={editForm.porcentaje_descuento}
                                        onChange={(e) => setEditForm({ ...editForm, porcentaje_descuento: parseFloat(e.target.value) })}
                                    />
                                    <span className="text-2xl text-gray-400">%</span>
                                </div>
                            ) : (
                                <div className="text-4xl font-bold text-gray-800 flex justify-center items-start">
                                    {lista.porcentaje_descuento}
                                    <span className="text-sm text-gray-400 mt-1 ml-1">%</span>
                                </div>
                            )}
                            <p className="text-sm text-gray-500 uppercase tracking-wide mt-2">Descuento Global</p>
                        </div>
                        <div className="bg-gray-50 p-3 rounded text-xs text-gray-600 border border-gray-100 mt-4">
                            <p>Esta lista se aplica automáticamente a los clientes asignados.</p>
                        </div>
                    </CardContent>
                </Card>
            ))}

            {/* Card para Crear (Futuro) */}
            <div className="border border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center p-6 text-gray-400 hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => toast('Función crear lista próximamente')}>
                <Tags size={32} className="mb-2 opacity-50" />
                <p>Crear Nueva Lista</p>
            </div>
        </div>
    );
};

export default ListasPrecios;
