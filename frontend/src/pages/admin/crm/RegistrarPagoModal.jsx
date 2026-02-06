import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../../../utils/api';
import { useAuthStore } from '../../../../context/authStore';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { Input } from '../../../../components/ui/Input';
import { DollarSign, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

const RegistrarPagoModal = ({ cliente, onClose }) => {
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [monto, setMonto] = useState('');
    const [metodo, setMetodo] = useState('efectivo');
    const [referencia, setReferencia] = useState('');

    const pagoMutation = useMutation({
        mutationFn: async () => {
            return api.post('/pagos', {
                cliente_id: cliente.id,
                usuario_id: user.id,
                monto: parseFloat(monto),
                metodo_pago: metodo,
                referencia
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['clientes']);
            toast.success('Pago registrado correctamente');
            onClose();
        },
        onError: () => toast.error('Error al registrar pago')
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!monto || parseFloat(monto) <= 0) return toast.error('Monto inválido');
        pagoMutation.mutate();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-in fade-in">
            <Card className="w-full max-w-md m-4">
                <CardHeader className="flex flex-row justify-between items-center bg-green-50 border-b border-green-100 pb-4">
                    <CardTitle className="text-green-800 flex items-center gap-2">
                        <DollarSign />
                        Registrar Pago
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}><X size={20} /></Button>
                </CardHeader>
                <CardContent className="pt-6">
                    <p className="mb-4 text-sm text-gray-600">
                        Cliente: <span className="font-bold text-gray-800">{cliente.nombre}</span> <br />
                        Saldo Actual: <span className="font-bold text-red-600">${cliente.saldo_actual}</span>
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="text-sm font-medium">Monto a Pagar ($)</label>
                            <Input
                                type="number"
                                step="0.01"
                                autoFocus
                                value={monto}
                                onChange={(e) => setMonto(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">Método de Pago</label>
                            <select
                                className="w-full p-2 border rounded-lg bg-gray-50 focus:ring-2 focus:ring-green-500 outline-none"
                                value={metodo}
                                onChange={(e) => setMetodo(e.target.value)}
                            >
                                <option value="efectivo">Efectivo</option>
                                <option value="transferencia">Transferencia</option>
                                <option value="cheque">Cheque</option>
                                <option value="deposito">Depósito</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-sm font-medium">Referencia / Folio</label>
                            <Input
                                placeholder="Opcional"
                                value={referencia}
                                onChange={(e) => setReferencia(e.target.value)}
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-green-600 hover:bg-green-700 mt-2"
                            disabled={pagoMutation.isPending}
                        >
                            {pagoMutation.isPending ? 'Procesando...' : 'Confirmar Pago'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
};

export default RegistrarPagoModal;
