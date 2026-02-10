import React, { useState, useEffect } from 'react';
import api from '../../../utils/api';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import {
    Users, Briefcase, FileText, Plus, Search,
    ExternalLink, UserCheck, UserMinus
} from 'lucide-react';

export default function HRDashboard({ onSelectEmpleado }) {
    const [empleados, setEmpleados] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchEmpleados();
    }, []);

    const fetchEmpleados = async () => {
        try {
            setLoading(true);
            const res = await api.get('/empleados');
            setEmpleados(res.data);
        } catch (error) {
            console.error('Error fetching empleados:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredEmpleados = empleados.filter(e =>
        e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.rol.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const stats = {
        total: empleados.length,
        activos: empleados.filter(e => e.activo === 1).length,
        inactivos: empleados.filter(e => e.activo === 0).length,
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Recursos Humanos</h2>
                    <p className="text-gray-500">Gestión de expedientes y personal</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={fetchEmpleados}>Actualizar</Button>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" /> Nuevo Ingreso
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-500 rounded-lg text-white">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-blue-600">Total Plantilla</p>
                                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-500 rounded-lg text-white">
                                <UserCheck size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-green-600">Activos</p>
                                <p className="text-2xl font-bold text-green-900">{stats.activos}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-orange-50 border-orange-100">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-orange-500 rounded-lg text-white">
                                <UserMinus size={24} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-orange-600">Bajas/Inactivos</p>
                                <p className="text-2xl font-bold text-orange-900">{stats.inactivos}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Listado */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-lg font-bold">Listado de Personal</CardTitle>
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o puesto..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <th className="px-4 py-3">Empleado</th>
                                    <th className="px-4 py-3">Puesto / Rol</th>
                                    <th className="px-4 py-3">Sucursal</th>
                                    <th className="px-4 py-3">Estado</th>
                                    <th className="px-4 py-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading ? (
                                    <tr><td colSpan="5" className="text-center py-8 text-gray-400">Cargando...</td></tr>
                                ) : filteredEmpleados.map(e => (
                                    <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                                    {e.nombre.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900">{e.nombre}</p>
                                                    <p className="text-xs text-gray-500">{e.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium capitalize">
                                                {e.rol}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-sm text-gray-600">
                                            {e.sucursal_nombre || 'N/A'}
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${e.activo === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                }`}>
                                                {e.activo === 1 ? 'Activo' : 'Inactivo'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-blue-600 hover:text-blue-700"
                                                onClick={() => onSelectEmpleado(e.id)}
                                            >
                                                <ExternalLink size={16} className="mr-1" /> Expediente
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
