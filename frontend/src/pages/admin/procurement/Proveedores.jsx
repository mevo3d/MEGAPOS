import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../utils/api';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { Search, Plus, Edit, Trash2, Truck, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

const Proveedores = () => {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProveedor, setEditingProveedor] = useState(null);

    // Form State
    const [formData, setFormData] = useState({
        nombre: '',
        rfc: '',
        contacto_nombre: '',
        telefono: '',
        email: '',
        dias_credito: 0
    });

    // Fetch Proveedores
    const { data: proveedores = [], isLoading } = useQuery({
        queryKey: ['proveedores'],
        queryFn: async () => {
            const { data } = await api.get('/proveedores');
            return data;
        }
    });

    // Mutation: Create/Update
    const saveMutation = useMutation({
        mutationFn: async (data) => {
            if (editingProveedor) {
                await api.put(`/proveedores/${editingProveedor.id}`, data);
            } else {
                await api.post('/proveedores', data);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['proveedores']);
            toast.success(editingProveedor ? 'Proveedor actualizado' : 'Proveedor creado');
            closeModal();
        },
        onError: () => {
            toast.error('Error al guardar proveedor');
        }
    });

    // Mutation: Delete
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            await api.delete(`/proveedores/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['proveedores']);
            toast.success('Proveedor eliminado');
        },
        onError: () => {
            toast.error('Error al eliminar proveedor');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        saveMutation.mutate(formData);
    };

    const openCreateModal = () => {
        setEditingProveedor(null);
        setFormData({
            nombre: '',
            rfc: '',
            contacto_nombre: '',
            telefono: '',
            email: '',
            dias_credito: 0
        });
        setIsModalOpen(true);
    };

    const openEditModal = (proveedor) => {
        setEditingProveedor(proveedor);
        setFormData({
            nombre: proveedor.nombre,
            rfc: proveedor.rfc || '',
            contacto_nombre: proveedor.contacto_nombre || '',
            telefono: proveedor.telefono || '',
            email: proveedor.email || '',
            dias_credito: proveedor.dias_credito || 0
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingProveedor(null);
    };

    const filteredProveedores = proveedores.filter(p =>
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.rfc?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                        placeholder="Buscar proveedor..."
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button onClick={openCreateModal} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-5 w-5 mr-2" />
                    Nuevo Proveedor
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProveedores.map((proveedor) => (
                    <Card key={proveedor.id} className="hover:shadow-lg transition-shadow border-gray-200">
                        <CardHeader className="flex flex-row justify-between items-start pb-2">
                            <div className="flex gap-3 items-center">
                                <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                    <Truck size={20} />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{proveedor.nombre}</CardTitle>
                                    <p className="text-xs text-gray-500 font-mono">{proveedor.rfc}</p>
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="sm" onClick={() => openEditModal(proveedor)}>
                                    <Edit size={16} className="text-gray-500 hover:text-blue-600" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => {
                                    if (confirm('¿Eliminar este proveedor?')) deleteMutation.mutate(proveedor.id);
                                }}>
                                    <Trash2 size={16} className="text-gray-500 hover:text-red-600" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-2">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <UsersIcon size={16} className="text-gray-400" />
                                <span>{proveedor.contacto_nombre || 'Sin contacto'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Phone size={16} className="text-gray-400" />
                                <span>{proveedor.telefono || '-'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Mail size={16} className="text-gray-400" />
                                <span className="truncate">{proveedor.email || '-'}</span>
                            </div>
                            <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between text-xs font-medium">
                                <span className="text-gray-500">Crédito</span>
                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                                    {proveedor.dias_credito} días
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-lg text-gray-900">
                                {editingProveedor ? 'Ditar Proveedor' : 'Nuevo Proveedor'}
                            </h3>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / Razón Social *</label>
                                <Input
                                    required
                                    value={formData.nombre}
                                    onChange={e => setFormData({ ...formData, nombre: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">RFC</label>
                                    <Input
                                        value={formData.rfc}
                                        onChange={e => setFormData({ ...formData, rfc: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Días Crédito</label>
                                    <Input
                                        type="number"
                                        value={formData.dias_credito}
                                        onChange={e => setFormData({ ...formData, dias_credito: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Contacto</label>
                                <Input
                                    value={formData.contacto_nombre}
                                    onChange={e => setFormData({ ...formData, contacto_nombre: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                    <Input
                                        value={formData.telefono}
                                        onChange={e => setFormData({ ...formData, telefono: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <Input
                                        type="email"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="ghost" onClick={closeModal}>Cancelar</Button>
                                <Button type="submit" disabled={saveMutation.isPending}>
                                    {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const UsersIcon = ({ className, size }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

export default Proveedores;
