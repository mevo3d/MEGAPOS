import axios from 'axios';
import { useAuthStore } from '../context/authStore';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const { token, sucursalId } = useAuthStore.getState();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    if (sucursalId) {
        config.headers['x-sucursal-id'] = sucursalId;
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
        }
        return Promise.reject(error);
    }
);

export default api;
