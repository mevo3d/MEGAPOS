import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
    persist(
        (set) => ({
            token: null,
            user: null,
            sucursalId: null,
            isAuthenticated: false,

            login: (token, user, sucursalId) => set({
                token,
                user,
                sucursalId,
                isAuthenticated: true
            }),

            logout: () => set({
                token: null,
                user: null,
                sucursalId: null,
                isAuthenticated: false
            }),

            setSucursal: (id) => set({ sucursalId: id }),
        }),
        {
            name: 'auth-storage',
        }
    )
);
