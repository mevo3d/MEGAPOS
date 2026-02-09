import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Theme Store - Maneja el tema global de la aplicación
 * Persiste en localStorage para recordar preferencia del usuario
 */
export const useThemeStore = create(
    persist(
        (set, get) => ({
            // 'light' | 'dark'
            theme: 'light',

            toggleTheme: () => {
                const newTheme = get().theme === 'light' ? 'dark' : 'light';
                set({ theme: newTheme });

                // Actualizar clase en el documento
                if (newTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            },

            setTheme: (theme) => {
                set({ theme });
                if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            },

            // Inicializar tema al cargar
            initTheme: () => {
                const theme = get().theme;
                if (theme === 'dark') {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
        }),
        {
            name: 'theme-storage'
        }
    )
);
