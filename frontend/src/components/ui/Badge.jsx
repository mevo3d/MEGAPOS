import React from 'react';
import { cn } from '../../utils/cn';
import { Check, AlertCircle, X, Info } from 'lucide-react';

const Badge = React.forwardRef(({
    className,
    variant = 'default',
    size = 'default',
    children,
    icon,
    removable,
    onRemove,
    ...props
}, ref) => {
    const variants = {
        default: 'bg-primary-100 text-primary-800 border-primary-200',
        secondary: 'bg-gray-100 text-gray-800 border-gray-200',
        success: 'bg-success-100 text-success-800 border-success-200',
        warning: 'bg-warning-100 text-warning-800 border-warning-200',
        danger: 'bg-danger-100 text-danger-800 border-danger-200',
        info: 'bg-blue-100 text-blue-800 border-blue-200',
        outline: 'bg-transparent border-gray-300 text-gray-700',
        gradient: 'bg-gradient-to-r from-primary-500 to-primary-600 text-white border-primary-600',
    };

    const sizes = {
        xs: 'px-1.5 py-0.5 text-xs font-medium',
        sm: 'px-2 py-0.5 text-xs font-medium',
        default: 'px-2.5 py-1 text-sm font-medium',
        lg: 'px-3 py-1.5 text-base font-medium',
        xl: 'px-4 py-2 text-lg font-medium',
    };

    const iconSizes = {
        xs: 'h-3 w-3',
        sm: 'h-3 w-3',
        default: 'h-4 w-4',
        lg: 'h-5 w-5',
        xl: 'h-6 w-6',
    };

    const getIcon = () => {
        if (!icon) return null;

        // Handle Lucide React icons and similar components
        try {
            if (typeof icon === 'function' || icon.$$typeof === Symbol.for('react.forward_ref')) {
                const IconComponent = icon;
                return <IconComponent className={iconSizes[size]} />;
            }
            if (React.isValidElement(icon)) {
                return React.cloneElement(icon, { className: iconSizes[size] });
            }
            // Handle case where icon is a component constructor
            if (typeof icon === 'object' && icon.$$typeof) {
                const IconComponent = icon;
                return <IconComponent className={iconSizes[size]} />;
            }
        } catch (error) {
            console.warn('Error rendering icon:', error);
            return null;
        }

        if (variant === 'success') return <Check className={iconSizes[size]} />;
        if (variant === 'danger') return <X className={iconSizes[size]} />;
        if (variant === 'warning') return <AlertCircle className={iconSizes[size]} />;
        if (variant === 'info') return <Info className={iconSizes[size]} />;
        return null;
    };

    return (
        <span
            ref={ref}
            className={cn(
                'inline-flex items-center gap-1.5 border rounded-full transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1',
                variants[variant],
                sizes[size],
                removable && 'pr-1',
                className
            )}
            {...props}
        >
            {getIcon() && (
                <span className="flex-shrink-0">
                    {getIcon()}
                </span>
            )}
            <span className="truncate">{children}</span>
            {removable && (
                <button
                    type="button"
                    onClick={onRemove}
                    className={cn(
                        'flex-shrink-0 rounded-full hover:bg-black/10 focus:bg-black/10',
                        'transition-colors duration-150',
                        'p-0.5 -mr-1',
                        variant === 'gradient' && 'hover:bg-white/20 focus:bg-white/20'
                    )}
                >
                    <X className={cn(iconSizes[size], 'text-current opacity-60')} />
                </button>
            )}
        </span>
    );
});

Badge.displayName = 'Badge';

export { Badge };