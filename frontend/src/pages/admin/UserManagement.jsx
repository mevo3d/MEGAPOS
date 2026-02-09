import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Users, UserPlus, Edit, Trash2, Eye, EyeOff, Key, Mail, User, MapPin, Building } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../context/authStore';

const UserManagement = () => {
    const queryClient = useQueryClient();
    const [showPassword, setShowPassword] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        username: '',
        password: '',
        rol: 'cajero',
        sucursal_id: '',
        caja_asignada_id: '',
        activo: true
    });

    // Query para obtener todos los puntos de venta (cajas)
    const { data: puntosVenta = [] } = useQuery({
        queryKey: ['puntosVenta'],
        queryFn: async () => {
            const response = await api.get('/puntosVenta');
            return response.data;
        }
    });

    // Query para obtener usuarios
    const { data: users = [], isLoading, error } = useQuery({
        queryKey: ['empleados'],
        queryFn: async () => {
            const response = await api.get('/empleados');
            return response.data;
        }
    });

    // Query para obtener sucursales
    const { data: sucursales = [] } = useQuery({
        queryKey: ['sucursales'],
        queryFn: async () => {
            const response = await api.get('/empleados/sucursales');
            return response.data;
        }
    });

    // Mutation para crear usuario
    const createUserMutation = useMutation({
        mutationFn: async (userData) => {
            const response = await api.post('/empleados', userData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['empleados'] });
            toast.success('Usuario creado exitosamente');
            resetForm();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Error al crear usuario');
        }
    });

    // Mutation para actualizar usuario
    const updateUserMutation = useMutation({
        mutationFn: async ({ id, userData }) => {
            const response = await api.put(`/empleados/${id}`, userData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['empleados'] });
            toast.success('Usuario actualizado exitosamente');
            resetForm();
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Error al actualizar usuario');
        }
    });

    // Mutation para eliminar/desactivar usuario
    const deleteUserMutation = useMutation({
        mutationFn: async (id) => {
            const response = await api.delete(`/empleados/${id}`);
            return response.data;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['empleados'] });
            toast.success(data.message);
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Error al desactivar usuario');
        }
    });

    // Mutation para cambiar contraseña
    const changePasswordMutation = useMutation({
        mutationFn: async ({ id, password }) => {
            const response = await api.put(`/empleados/${id}/password`, { password });
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['empleados'] });
            toast.success('Contraseña actualizada exitosamente');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Error al actualizar contraseña');
        }
    });

    const resetForm = () => {
        setFormData({
            nombre: '',
            email: '',
            username: '',
            password: '',
            rol: 'cajero',
            sucursal_id: '',
            caja_asignada_id: '',
            activo: true
        });
        setShowCreateForm(false);
        setEditingUser(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingUser) {
            updateUserMutation.mutate({ id: editingUser.id, userData: formData });
        } else {
            createUserMutation.mutate(formData);
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({
            nombre: user.nombre,
            email: user.email,
            username: user.username || '',
            password: '',
            rol: user.rol,
            sucursal_id: user.sucursal_id || '',
            caja_asignada_id: user.caja_asignada_id || '',
            activo: user.activo === 1 || user.activo === true
        });
        setShowCreateForm(true);
    };

    const handleDelete = (user) => {
        const message = user.activo
            ? '¿Está seguro de desactivar este usuario?'
            : '¿Está seguro de eliminar PERMANENTEMENTE este usuario? Esta acción no se puede deshacer.';

        if (window.confirm(message)) {
            deleteUserMutation.mutate(user.id);
        }
    };

    const handlePasswordChange = (userId) => {
        const newPassword = window.prompt('Ingrese la nueva contraseña:');
        if (newPassword && newPassword.length >= 6) {
            changePasswordMutation.mutate({ id: userId, password: newPassword });
        } else if (newPassword) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
        }
    };

    const filteredUsers = users.filter(user =>
        user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.rol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const roles = [
        { value: 'superadmin', label: 'Superusuario' },
        { value: 'admin', label: 'Administrador' },
        { value: 'gerente', label: 'Gerente' },
        { value: 'cajero', label: 'Cajero' },
        { value: 'vendedor', label: 'Vendedor' },
        { value: 'telemarketing', label: 'Telemarketing' },
        { value: 'compras', label: 'Compras' },
        { value: 'capturista', label: 'Capturista Móvil' },
        { value: 'bodeguero', label: 'Bodeguero' },
        { value: 'rutero', label: 'Rutero' }
    ];

    if (isLoading) {
        return (
            <Card className="glass border-0 shadow-xl">
                <CardContent className="p-8">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-gray-500 mt-2">Cargando usuarios...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="glass border-0 shadow-xl">
                <CardContent className="p-8">
                    <div className="text-center text-red-500">
                        <p>Error al cargar usuarios</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header con buscador y botón agregar */}
            <Card className="glass border-0 shadow-xl">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-600" />
                                Administración de Usuarios
                            </h2>
                            <p className="text-sm text-gray-500">Gestiona los usuarios del sistema</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <input
                                type="text"
                                placeholder="Buscar usuarios..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                            />
                            <Button
                                onClick={() => setShowCreateForm(true)}
                                className="hover-lift w-full sm:w-auto"
                            >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Agregar Usuario
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Formulario de creación/edición */}
            {showCreateForm && (
                <Card className="glass border-0 shadow-xl animate-slide-up">
                    <CardHeader>
                        <CardTitle>
                            {editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre completo
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        required
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Usuario (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Contraseña {editingUser && '(dejar en blanco para mantener actual)'}
                                    </label>
                                    <input
                                        type="password"
                                        required={!editingUser}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Rol
                                    </label>
                                    <select
                                        required
                                        value={formData.rol}
                                        onChange={(e) => setFormData({ ...formData, rol: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {roles.map(role => (
                                            <option key={role.value} value={role.value}>
                                                {role.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Sucursal
                                    </label>
                                    <select
                                        value={formData.sucursal_id}
                                        onChange={(e) => setFormData({ ...formData, sucursal_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Seleccionar sucursal</option>
                                        {sucursales.map(sucursal => (
                                            <option key={sucursal.id} value={sucursal.id}>
                                                {sucursal.nombre}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Caja Asignada
                                    </label>
                                    <select
                                        value={formData.caja_asignada_id}
                                        onChange={(e) => setFormData({ ...formData, caja_asignada_id: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">Sin caja asignada</option>
                                        {puntosVenta
                                            .filter(pv => !formData.sucursal_id || pv.sucursal_id === parseInt(formData.sucursal_id))
                                            .map(pv => (
                                                <option key={pv.id} value={pv.id}>
                                                    {pv.nombre} ({pv.es_maestra ? 'Maestra' : 'Esclava'})
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={resetForm}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={createUserMutation.isLoading || updateUserMutation.isLoading}
                                >
                                    {createUserMutation.isLoading || updateUserMutation.isLoading
                                        ? 'Guardando...'
                                        : (editingUser ? 'Actualizar' : 'Crear')
                                    }
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card >
            )}

            {/* Lista de usuarios */}
            <Card className="glass border-0 shadow-xl">
                <CardContent className="p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Usuario</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Contacto</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Rol</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Sucursal</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                                    <th className="text-left py-3 px-4 font-medium text-gray-700">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                                                    {user.nombre.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{user.nombre}</p>
                                                    <p className="text-sm text-gray-500">@{user.username || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-1 text-gray-600">
                                                <Mail className="h-4 w-4" />
                                                <span className="text-sm">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.rol === 'superadmin' ? 'bg-red-100 text-red-800 border border-red-200' :
                                                user.rol === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                    user.rol === 'gerente' ? 'bg-blue-100 text-blue-800' :
                                                        user.rol === 'cajero' ? 'bg-green-100 text-green-800' :
                                                            'bg-gray-100 text-gray-800'
                                                }`}>
                                                {roles.find(r => r.value === user.rol)?.label || user.rol}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-1 text-gray-600">
                                                <Building className="h-4 w-4" />
                                                <span className="text-sm">{user.sucursal_nombre || 'Sin asignar'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {user.activo ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleEdit(user)}
                                                    title="Editar"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handlePasswordChange(user.id)}
                                                    title="Cambiar contraseña"
                                                >
                                                    <Key className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(user)}
                                                    title={user.activo ? "Desactivar" : "Eliminar permanentemente"}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredUsers.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                                <p>No se encontraron usuarios</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div >
    );
};

export default UserManagement;