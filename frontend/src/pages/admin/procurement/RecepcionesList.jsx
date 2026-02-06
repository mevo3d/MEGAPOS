import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../../../utils/api';
import { Card, CardContent } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { PackageCheck, Plus, Calendar, Search } from 'lucide-react';
import { Input } from '../../../../components/ui/Input';

const RecepcionesList = ({ onCreateNueva }) => {
    const { data: recepciones = [], isLoading } = useQuery({
        queryKey: ['recepciones'],
        queryFn: async () => (await api.get('/recepciones')).data
    });

    const [filtro, setFiltro] = React.useState('');

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
                    <Input
                        placeholder="Buscar por proveedor, folio o factura..."
                        className="pl-10"
                        value={filtro}
                        onChange={(e) => setFiltro(e.target.value)}
                    />
                </div>
                <Button onClick={onCreateNueva} className="w-full sm:w-auto bg-green-600 hover:bg-green-700">
                    <Plus className="h-5 w-5 mr-2" />
                    Nueva Recepción
                </Button>
            </div>

            <Card className="border-0 shadow-lg">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-100">
                                <tr>
                                    <th className="p-4">Folio</th>
                                    <th className="p-4">Orden Compra</th>
                                    <th className="p-4">Proveedor</th>
                                    <th className="p-4">Factura</th>
                                    <th className="p-4">Fecha</th>
                                    <th className="p-4">Recibió</th>
                                    <th className="p-4 text-center">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recepciones.filter(r =>
                                    r.proveedor_nombre?.toLowerCase().includes(filtro.toLowerCase()) ||
                                    r.factura_proveedor?.toLowerCase().includes(filtro.toLowerCase()) ||
                                    r.id.toString().includes(filtro)
                                ).map((recepcion) => (
                                    <tr key={recepcion.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-bold text-gray-800">#{recepcion.id}</td>
                                        <td className="p-4 text-blue-600 font-medium">
                                            {recepcion.orden_compra_id ? `#${recepcion.orden_compra_id}` : 'Directa'}
                                        </td>
                                        <td className="p-4 text-gray-900">{recepcion.proveedor_nombre || '-'}</td>
                                        <td className="p-4 text-gray-500">{recepcion.factura_proveedor || 'S/N'}</td>
                                        <td className="p-4 text-gray-500 flex items-center gap-2">
                                            <Calendar size={14} />
                                            {new Date(recepcion.fecha_recepcion).toLocaleDateString()}
                                        </td>
                                        <td className="p-4 text-gray-500">{recepcion.usuario_nombre}</td>
                                        <td className="p-4 text-center">
                                            <Button variant="ghost" size="sm">Ver Detalle</Button>
                                        </td>
                                    </tr>
                                ))}
                                {recepciones.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="p-8 text-center text-gray-400">
                                            No hay recepciones registradas.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default RecepcionesList;
