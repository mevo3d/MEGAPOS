import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../../context/themeStore';

/**
 * Toggle de tema día/noche
 * Se coloca en la esquina superior derecha de los paneles
 */
export function ThemeToggle({ className = '' }) {
    const { theme, toggleTheme } = useThemeStore();

    return (
        <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-all duration-300 ${theme === 'dark'
                    ? 'bg-slate-700 hover:bg-slate-600 text-yellow-400'
                    : 'bg-gray-100 hover:bg-gray-200 text-slate-700'
                } ${className}`}
            title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
            {theme === 'dark' ? (
                <Sun className="w-5 h-5" />
            ) : (
                <Moon className="w-5 h-5" />
            )}
        </button>
    );
}

export default ThemeToggle;
