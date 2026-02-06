import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Users, Search, Plus, Phone, Mail, MapPin, Edit, History, Save, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import RegistrarPagoModal from './RegistrarPagoModal';

const ClientesList = () => {
    const queryClient = useQueryClient();
    const [view, setView] = useState('list'); // 'list', 'form', 'details'
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [pagoCliente, setPagoCliente] = useState(null);
    const [busqueda, setBusqueda] = useState('');

    // Estado Formulario
    const [formData, setFormData] = useState({
        nombre: '', rfc: '', email: '', telefono: '', direccion: '', ciudad: '', codigo_postal: '', lista_precio_id: 1, dias_credito: 0, limite_credito: 0
    });

    const { data: clientes = [] } = useQuery({
        queryKey: ['clientes', busqueda],
        queryFn: async () => (await api.get(`/clientes?search=${busqueda}`)).data
    });

    const resetForm = () => {
        setFormData({ nombre: '', rfc: '', email: '', telefono: '', direccion: '', ciudad: '', codigo_postal: '', lista_precio_id: 1, dias_credito: 0, limite_credito: 0 });
        setSelectedCliente(null);
    };

    const createMutation = useMutation({
        mutationFn: async (data) => {
            if (selectedCliente) {
                return api.put(`/clientes/${selectedCliente.id}`, data);
            }
            return api.post('/clientes', data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['clientes']);
            toast.success(selectedCliente ? 'Cliente actualizado' : 'Cliente creado');
            setView('list');
            resetForm();
        },
        onError: () => toast.error('Error al guardar cliente')
    });

    const handleEdit = (cliente) => {
        setFormData(cliente);
        setSelectedCliente(cliente);
        setView('form');
    };

    const handleSave = (e) => {
        e.preventDefault();
        if (!formData.nombre) return toast.error('El nombre es obligatorio');
        createMutation.mutate(formData);
    };

    if (view === 'form') {
        return (
            <Card className="animate-in slide-in-from-right duration-300">
                <CardHeader>
                    <CardTitle>{selectedCliente ? 'Editar Cliente' : 'Nuevo Cliente'}</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Nombre / Razón Social *</label>
                                <Input value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">RFC</label>
                                <Input value={formData.rfc} onChange={e => setFormData({ ...formData, rfc: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                                <Input value={formData.telefono} onChange={e => setFormData({ ...formData, telefono: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email</label>
                                <Input value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Dirección</label>
                                <Input value={formData.direccion} onChange={e => setFormData({ ...formData, direccion: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Ciudad</label>
                                <Input value={formData.ciudad} onChange={e => setFormData({ ...formData, ciudad: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Código Postal</label>
                                <Input value={formData.codigo_postal} onChange={e => setFormData({ ...formData, codigo_postal: e.target.value })} />
                            </div>
                            <div className="border-t border-gray-200 md:col-span-2 pt-4 mt-2">
                                <h4 className="font-medium text-gray-900 mb-2">Datos Comerciales</h4>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Lista de Precios</label>
                                <select
                                    className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.lista_precio_id}
                                    onChange={e => setFormData({ ...formData, lista_precio_id: parseInt(e.target.value) })}
                                >
                                    <option value={1}>Público General</option>
                                    <option value={2}>Mayoreo (10%)</option>
                                    <option value={3}>Distribuidor (20%)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Días de Crédito</label>
                                <Input type="number" value={formData.dias_credito} onChange={e => setFormData({ ...formData, dias_credito: parseInt(e.target.value) || 0 })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Límite de Crédito ($)</label>
                                <Input type="number" value={formData.limite_credito} onChange={e => setFormData({ ...formData, limite_credito: parseFloat(e.target.value) || 0 })} />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <Button variant="outline" type="button" onClick={() => { setView('list'); resetForm(); }}>Cancelar</Button>
                            <Button type="submit" disabled={createMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
                                <Save className="w-4 h-4 mr-2" />
                                Guardar Cliente
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                        placeholder="Buscar cliente..."
                        className="pl-10"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <Button onClick={() => { resetForm(); setView('form'); }} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                    <Plus className="h-5 w-5 mr-2" />
                    Nuevo Cliente
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientes.map(cliente => (
                    <Card key={cliente.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                        <CardContent className="p-5">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                        <Users size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{cliente.nombre}</h3>
                                        <p className="text-xs text-gray-500">{cliente.rfc || 'Sin RFC'}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleEdit(cliente); }}>
                                    <Edit size={16} className="text-gray-400 hover:text-blue-600" />
                                </Button>
                            </div>

                            <div className="space-y-2 text-sm text-gray-600 mt-4">
                                <div className="flex items-center gap-2">
                                    <Phone size={14} className="opacity-70" />
                                    <span>{cliente.telefono || 'Sin teléfono'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Mail size={14} className="opacity-70" />
                                    <span className="truncate">{cliente.email || 'Sin email'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin size={14} className="opacity-70" />
                                    <span className="truncate">{cliente.ciudad || 'Ubicación no especificada'}</span>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                                <span className={`text-xs px-2 py-1 rounded-full ${cliente.lista_precio_id === 2 ? 'bg-purple-100 text-purple-700' :
                                    cliente.lista_precio_id === 3 ? 'bg-orange-100 text-orange-700' :
                                        'bg-gray-100 text-gray-600'
                                    } font-medium`}>
                                    {cliente.lista_precio_nombre || 'Público'}
                                </span>
                                {cliente.saldo_actual > 0 ? (
                                    <div className="flex items-center gap-2">
                                        <span className="text-red-600 font-bold text-sm">
                                            -${cliente.saldo_actual}
                                        </span>
                                        <Button size="icon" className="h-7 w-7 rounded-full bg-green-100 text-green-700 hover:bg-green-200" title="Registrar Pago"
                                            onClick={(e) => { e.stopPropagation(); setPagoCliente(cliente); }}>
                                            <DollarSign size={14} />
                                        </Button>
                                    </div>
                                ) : (
                                    <span className="text-green-600 text-xs font-medium flex items-center gap-1">
                                        <DollarSign size={12} /> Al día
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>


            {
                pagoCliente && (
                    <RegistrarPagoModal
                        cliente={pagoCliente}
                        onClose={() => setPagoCliente(null)}
                    />
                )
            }
        </div >
    );
};

export default ClientesList;
