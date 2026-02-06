import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { X, UserPlus } from 'lucide-react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export const QuickClientModal = ({ show, onClose, onClientCreated }) => {
    const [formData, setFormData] = useState({
        nombre: '',
        telefono: '',
        email: '',
        direccion: '',
        tipo_cliente_id: null,
        lista_precio_id: 1 // Precio general por defecto
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.nombre.trim()) {
            toast.error('El nombre es obligatorio');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await api.post('/clientes', formData);
            toast.success('Cliente creado exitosamente');
            onClientCreated(response.data);
            onClose();
            setFormData({
                nombre: '',
                telefono: '',
                email: '',
                direccion: '',
                tipo_cliente_id: null,
                lista_precio_id: 1
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al crear cliente');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-500 to-blue-600">
                    <div className="flex items-center gap-2 text-white">
                        <UserPlus className="h-5 w-5" />
                        <h2 className="text-xl font-bold">Agregar Cliente Rápido</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre del Cliente *
                        </label>
                        <Input
                            type="text"
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            placeholder="Ej: Juan Pérez"
                            required
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Teléfono
                        </label>
                        <Input
                            type="tel"
                            value={formData.telefono}
                            onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                            placeholder="Ej: 5551234567"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="Ej: correo@ejemplo.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Dirección
                        </label>
                        <Input
                            type="text"
                            value={formData.direccion}
                            onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                            placeholder="Calle, número, colonia..."
                        />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-xs text-blue-800">
                            <strong>Nota:</strong> El número de cliente y puntos se asignarán automáticamente.
                            Para configuraciones avanzadas, usa el módulo de CRM.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            className="flex-1"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Guardando...' : 'Crear Cliente'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
