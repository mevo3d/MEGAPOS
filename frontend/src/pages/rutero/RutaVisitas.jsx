import React, { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, CheckCircle, Navigation, Star, MessageSquare, Phone, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { Loading } from '../../components/ui/Loading';
import toast from 'react-hot-toast';

export default function RutaVisitas() {
    const navigate = useNavigate();
    const [visitas, setVisitas] = useState([]);
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCalificacionModal, setShowCalificacionModal] = useState(false);
    const [visitaACalificar, setVisitaACalificar] = useState(null);
    const [calificacion, setCalificacion] = useState(0);
    const [feedback, setFeedback] = useState('');
    const [estadisticas, setEstadisticas] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [visitasRes, clientesRes, statsRes] = await Promise.all([
                api.get('/rutero/visitas/hoy'),
                api.get('/rutero/clientes/pendientes').catch(() => ({ data: [] })),
                api.get('/rutero/visitas/estadisticas').catch(() => ({ data: null }))
            ]);
            setVisitas(visitasRes.data);
            setClientes(clientesRes.data || []);
            setEstadisticas(statsRes.data);
        } catch (error) {
            console.error(error);
            // Fallback a todos los clientes si falla pendientes
            try {
                const cliRes = await api.get('/clientes?limit=100');
                setClientes(cliRes.data.data || []);
            } catch (e) {
                console.error(e);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async (cliente) => {
        if (!confirm(`¿Registrar visita a ${cliente.nombre}?`)) return;

        const toastId = toast.loading('Registrando ubicación...');

        if (!navigator.geolocation) {
            toast.error('Geolocalización no soportada', { id: toastId });
            return;
        }

        navigator.geolocation.getCurrentPosition(async (pos) => {
            try {
                const payload = {
                    cliente_id: cliente.id,
                    latitud: pos.coords.latitude,
                    longitud: pos.coords.longitude,
                    notas: 'Check-in manual',
                    resultado: 'visita'
                };
                const res = await api.post('/rutero/visitas', payload);
                toast.success('Check-in exitoso', { id: toastId });

                // Abrir modal de calificación
                if (res.data.visita) {
                    setVisitaACalificar({ ...res.data.visita, cliente_nombre: cliente.nombre });
                    setShowCalificacionModal(true);
                }

                loadData();
            } catch (error) {
                toast.error('Error al registrar visita', { id: toastId });
            }
        }, (err) => {
            toast.error('No se pudo obtener ubicación', { id: toastId });
        });
    };

    const handleCalificar = async () => {
        if (!calificacion) {
            toast.error('Selecciona una calificación');
            return;
        }

        try {
            await api.put(`/rutero/visitas/${visitaACalificar.id}/calificacion`, {
                calificacion,
                feedback
            });
            toast.success('¡Calificación guardada!');
            setShowCalificacionModal(false);
            setCalificacion(0);
            setFeedback('');
            setVisitaACalificar(null);
            loadData();
        } catch (error) {
            toast.error('Error al guardar calificación');
        }
    };

    const openCalificacionModal = (visita) => {
        setVisitaACalificar(visita);
        setCalificacion(visita.calificacion || 0);
        setFeedback(visita.feedback_cliente || '');
        setShowCalificacionModal(true);
    };

    const StarRating = ({ value, onChange, size = 'w-8 h-8' }) => (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={() => onChange && onChange(star)}
                    className={`transition-all ${onChange ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
                >
                    <Star
                        className={`${size} ${star <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                    />
                </button>
            ))}
        </div>
    );

    if (loading) return <Loading />;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="bg-white p-4 flex items-center gap-4 shadow-sm sticky top-0 z-10">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-6 h-6 text-gray-700" />
                </button>
                <h1 className="text-lg font-bold text-gray-800">Ruta del Día</h1>
            </header>

            <div className="p-4 flex-1 overflow-y-auto space-y-6">

                {/* Estadísticas Rápidas */}
                {estadisticas && (
                    <section className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
                        <h3 className="text-sm font-medium opacity-80 mb-2">Esta Semana</h3>
                        <div className="grid grid-cols-4 gap-2 text-center">
                            <div>
                                <p className="text-2xl font-bold">{estadisticas.total_visitas || 0}</p>
                                <p className="text-xs opacity-80">Visitas</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{estadisticas.ventas || 0}</p>
                                <p className="text-xs opacity-80">Ventas</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{estadisticas.visitas_calificadas || 0}</p>
                                <p className="text-xs opacity-80">Calificadas</p>
                            </div>
                            <div className="flex flex-col items-center">
                                <div className="flex items-center gap-1">
                                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                                    <p className="text-xl font-bold">
                                        {estadisticas.calificacion_promedio ? parseFloat(estadisticas.calificacion_promedio).toFixed(1) : '-'}
                                    </p>
                                </div>
                                <p className="text-xs opacity-80">Promedio</p>
                            </div>
                        </div>
                    </section>
                )}

                {/* Historial Hoy */}
                <section>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">
                        Visitas Realizadas ({visitas.length})
                    </h2>
                    <div className="space-y-3">
                        {visitas.map(v => (
                            <div
                                key={v.id}
                                className="bg-green-50 border border-green-100 p-3 rounded-xl flex items-center justify-between"
                                onClick={() => openCalificacionModal(v)}
                            >
                                <div className="flex items-center gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <div>
                                        <p className="font-semibold text-green-800">{v.cliente_nombre}</p>
                                        <p className="text-xs text-green-600">{new Date(v.fecha_hora).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {v.calificacion ? (
                                        <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg">
                                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                            <span className="text-sm font-bold text-gray-700">{v.calificacion}</span>
                                        </div>
                                    ) : (
                                        <button className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-lg hover:bg-yellow-200">
                                            Calificar
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {visitas.length === 0 && <p className="text-sm text-gray-400 italic">Aún no has hecho visitas hoy.</p>}
                    </div>
                </section>

                {/* Lista Clientes Pendientes */}
                <section>
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">
                        Clientes Pendientes ({clientes.length})
                    </h2>
                    <div className="space-y-3">
                        {clientes.slice(0, 10).map(c => {
                            const visitado = visitas.some(v => v.cliente_id === c.id);
                            if (visitado) return null;

                            return (
                                <div key={c.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center hover:bg-blue-50 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900">{c.nombre}</h3>
                                        <p className="text-xs text-gray-500 flex items-center gap-1 truncate">
                                            <MapPin className="w-3 h-3 flex-shrink-0" />
                                            {c.direccion || 'Sin dirección'}
                                        </p>
                                        {c.telefono && (
                                            <a
                                                href={`tel:${c.telefono}`}
                                                className="text-xs text-blue-600 flex items-center gap-1 mt-1"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Phone className="w-3 h-3" />
                                                {c.telefono}
                                            </a>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleCheckIn(c)}
                                        className="bg-blue-600 text-white p-3 rounded-xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all ml-3"
                                    >
                                        <Navigation className="w-5 h-5" />
                                    </button>
                                </div>
                            );
                        })}
                        {clientes.length === 0 && (
                            <div className="bg-green-50 p-4 rounded-xl text-center">
                                <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                <p className="text-green-700 font-medium">¡Todos los clientes visitados!</p>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Modal de Calificación */}
            {showCalificacionModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 animate-slide-up">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Calificar Visita</h3>
                            <button
                                onClick={() => setShowCalificacionModal(false)}
                                className="p-1 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="text-center mb-6">
                            <p className="text-gray-600 mb-4">{visitaACalificar?.cliente_nombre}</p>
                            <StarRating value={calificacion} onChange={setCalificacion} />
                            <p className="text-sm text-gray-400 mt-2">
                                {calificacion === 1 && 'Muy mala'}
                                {calificacion === 2 && 'Mala'}
                                {calificacion === 3 && 'Regular'}
                                {calificacion === 4 && 'Buena'}
                                {calificacion === 5 && '¡Excelente!'}
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                <MessageSquare className="w-4 h-4 inline mr-1" />
                                Comentario (opcional)
                            </label>
                            <textarea
                                className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="¿Cómo estuvo la visita?"
                                rows={3}
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCalificacionModal(false)}
                                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50"
                            >
                                Omitir
                            </button>
                            <button
                                onClick={handleCalificar}
                                disabled={!calificacion}
                                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes slide-up {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up { animation: slide-up 0.2s ease-out; }
            `}</style>
        </div>
    );
}
