import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api from '../../utils/api';
import { Loading } from '../ui/Loading';
import { useAuthStore } from '../../context/authStore';

const CajaGuard = ({ children }) => {
    const { user } = useAuthStore();
    const [status, setStatus] = useState('loading'); // loading, open, closed, no-box
    const location = useLocation();

    useEffect(() => {
        const checkCajaStatus = async () => {
            try {
                // 1. Obtener mi caja asignada
                const { data: caja } = await api.get('/cajas/mi-caja');

                // 2. Verificar estado de la caja
                const { data: estado } = await api.get(`/cajas/${caja.id}/estado`);

                if (estado && estado.estado === 'abierta') {
                    // Validar si es el tipo de caja correcto para la ruta (opcional pero bueno)
                    setStatus('open');
                } else {
                    setStatus('closed');
                }
            } catch (error) {
                console.error('Error guard caja:', error);
                if (error.response?.status === 404) {
                    setStatus('no-box');
                } else {
                    setStatus('error');
                }
            }
        };

        checkCajaStatus();
    }, [location.pathname]);

    if (status === 'loading') {
        return <Loading overlay text="Verificando estado de caja..." />;
    }

    if (status === 'no-box') {
        return <Navigate to="/pos/apertura" />; // Apertura maneja el mensaje de "no box"
    }

    if (status === 'closed') {
        return <Navigate to="/pos/apertura" />;
    }

    return children;
};

export default CajaGuard;
