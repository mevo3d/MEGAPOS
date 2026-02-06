import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import api from '../../utils/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Store, User, Lock, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [isLoading, setIsLoading] = useState(false);
    const [logoUrl, setLogoUrl] = useState(null);
    const [logoLoading, setLogoLoading] = useState(true);
    const login = useAuthStore((state) => state.login);
    const navigate = useNavigate();

    // Cargar logo al montar el componente
    useEffect(() => {
        loadLogo();
    }, []);

    const loadLogo = async () => {
        try {
            setLogoLoading(true);
            // Intentar obtener el logo. Si no existe, no mostraremos nada
            const response = await api.get('/configuracion/logo', {
                responseType: 'blob',
                timeout: 5000 // Timeout de 5 segundos
            });
            const url = URL.createObjectURL(response.data);
            setLogoUrl(url);
        } catch (error) {
            // Es normal si no hay logo, no mostrar error
            console.log('Logo no disponible');
        } finally {
            setLogoLoading(false);
        }
    };

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            const res = await api.post('/auth/login', data);
            const { token, user } = res.data;

            login(token, user, user.sucursal_id);
            toast.success(`¡Bienvenido ${user.nombre}!`, {
                icon: '👋',
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                },
            });

            // Redirigir según el rol del usuario
            switch (user.rol) {
                case 'superadmin':
                case 'admin':
                    navigate('/admin');
                    break;
                case 'gerente':
                    navigate('/gerente');
                    break;
                case 'telemarketing':
                    navigate('/telemarketing');
                    break;
                case 'compras':
                    navigate('/compras');
                    break;
                case 'capturista':
                    navigate('/mobile/capture');
                    break;
                case 'cajero':
                case 'vendedor':
                default:
                    navigate('/pos');
                    break;
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error al iniciar sesión', {
                icon: '❌',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>

            <Card className="w-full max-w-md shadow-2xl glass animate-slide-up relative z-10">
                <CardHeader className="text-center space-y-4 pb-8">
                    {/* Logo Dinámico o Icono por defecto */}
                    <div className="mx-auto bg-gradient-to-br from-blue-600 to-purple-600 p-4 rounded-2xl w-fit shadow-lg shadow-blue-500/50 hover-lift">
                        {logoLoading ? (
                            <Store className="h-10 w-10 text-white animate-pulse" />
                        ) : logoUrl ? (
                            <img
                                src={logoUrl}
                                alt="Logo"
                                className="h-10 w-10 object-contain"
                            />
                        ) : (
                            <Store className="h-10 w-10 text-white" />
                        )}
                    </div>

                    <div>
                        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            MegaMayoreo POS
                        </CardTitle>
                        <p className="text-sm text-gray-500 mt-2 flex items-center justify-center gap-2">
                            <Sparkles className="h-4 w-4 text-yellow-500" />
                            Sistema Offline-First
                        </p>
                    </div>
                </CardHeader>

                <CardContent className="space-y-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        <div className="space-y-2">
                            <div className="relative group">
                                <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                <Input
                                    className="pl-10 h-12 border-2 focus:border-blue-500 transition-all"
                                    placeholder="Usuario o Correo Electrónico"
                                    type="text"
                                    {...register('email', { required: 'El usuario es requerido' })}
                                    error={errors.email?.message}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="relative group">
                                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                                <Input
                                    type="password"
                                    className="pl-10 h-12 border-2 focus:border-blue-500 transition-all"
                                    placeholder="Contraseña"
                                    {...register('password', { required: 'La contraseña es requerida' })}
                                    error={errors.password?.message}
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-base gradient-primary hover:opacity-90 shadow-lg shadow-blue-500/50 hover-lift"
                            isLoading={isLoading}
                        >
                            {isLoading ? 'Iniciando...' : 'Iniciar Sesión'}
                        </Button>
                    </form>

                    <div className="pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-400 text-center">
                            v1.0.0 | Desarrollado con ❤️ para MegaMayoreo
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
