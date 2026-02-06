import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

const Button = React.forwardRef(({
    className,
    variant = 'primary',
    size = 'default',
    isLoading,
    disabled,
    children,
    ...props
}, ref) => {
    const variants = {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-soft hover:shadow-medium hover-lift border border-primary-700/20',
        secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300 border border-gray-300 hover:border-gray-400 transition-all',
        outline: 'border-2 border-gray-300 bg-transparent hover:bg-gray-50 hover:border-gray-400 text-gray-700 active:bg-gray-100 transition-all',
        ghost: 'hover:bg-gray-100 text-gray-700 active:bg-gray-200 transition-all',
        danger: 'bg-danger-500 text-white hover:bg-danger-600 active:bg-danger-700 shadow-soft hover:shadow-medium hover-lift border border-danger-600/20',
        success: 'bg-success-500 text-white hover:bg-success-600 active:bg-success-700 shadow-soft hover:shadow-medium hover-lift border border-success-600/20',
        warning: 'bg-warning-500 text-white hover:bg-warning-600 active:bg-warning-700 shadow-soft hover:shadow-medium hover-lift border border-warning-600/20',
        gradient: 'bg-gradient-to-r from-primary-600 to-primary-500 text-white hover:from-primary-700 hover:to-primary-600 shadow-soft hover:shadow-medium hover-lift',
    };

    const sizes = {
        xs: 'h-7 px-2 text-xs font-medium',
        sm: 'h-9 px-3 text-sm font-medium',
        default: 'h-11 px-6 py-2.5 font-medium',
        lg: 'h-13 px-8 text-lg font-medium',
        xl: 'h-15 px-10 text-xl font-medium',
        icon: 'h-11 w-11 p-0 flex items-center justify-center',
        'icon-sm': 'h-9 w-9 p-0 flex items-center justify-center',
        'icon-lg': 'h-13 w-13 p-0 flex items-center justify-center',
    };

    const loadingVariants = {
        primary: 'bg-primary-400 cursor-not-allowed',
        secondary: 'bg-gray-100 text-gray-400 cursor-not-allowed',
        outline: 'border-gray-200 text-gray-400 cursor-not-allowed',
        ghost: 'text-gray-400 cursor-not-allowed',
        danger: 'bg-danger-400 cursor-not-allowed',
        success: 'bg-success-400 cursor-not-allowed',
        warning: 'bg-warning-400 cursor-not-allowed',
        gradient: 'bg-primary-400 cursor-not-allowed',
    };

    return (
        <button
            ref={ref}
            className={cn(
                // Base styles
                'inline-flex items-center justify-center rounded-xl font-sans',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
                'disabled:pointer-events-none transition-all duration-200 ease-out',
                'relative overflow-hidden group',

                // Dynamic styles
                isLoading ? loadingVariants[variant] : variants[variant],
                sizes[size],
                className
            )}
            disabled={isLoading || disabled}
            {...props}
        >
            {/* Loading overlay with spinner */}
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-inherit">
                    <Loader2 className="h-4 w-4 animate-spin" />
                </div>
            )}

            {/* Button content with hide animation when loading */}
            <span className={cn(
                'flex items-center gap-2 transition-opacity duration-200',
                isLoading && 'opacity-0'
            )}>
                {children}
            </span>

            {/* Subtle ripple effect on hover */}
            <span className="absolute inset-0 rounded-xl bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200 pointer-events-none" />
        </button>
    );
});

Button.displayName = 'Button';
export { Button };
