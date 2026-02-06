import React from 'react';
import { cn } from '../../utils/cn';

const Card = React.forwardRef(({ className, variant = 'default', hover = false, ...props }, ref) => {
    const variants = {
        default: 'bg-white border-gray-200 shadow-soft hover:shadow-medium',
        outlined: 'bg-white border-2 border-gray-300 hover:border-primary-300',
        elevated: 'bg-white border-gray-100 shadow-medium hover:shadow-strong',
        glass: 'bg-white/80 backdrop-blur-lg border-white/20 shadow-medium hover:shadow-strong',
        gradient: 'bg-gradient-to-br from-white to-gray-50 border-gray-200 shadow-soft hover:shadow-medium',
        filled: 'bg-gray-50 border-gray-200 hover:bg-gray-100',
        success: 'bg-success-50 border-success-200 hover:bg-success-100',
        warning: 'bg-warning-50 border-warning-200 hover:bg-warning-100',
        danger: 'bg-danger-50 border-danger-200 hover:bg-danger-100',
    };

    return (
        <div
            ref={ref}
            className={cn(
                'rounded-xl transition-all duration-300 ease-out',
                'focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2',
                variants[variant],
                hover && 'hover:-translate-y-1 hover-lift',
                className
            )}
            {...props}
        />
    );
});
Card.displayName = 'Card';

const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'flex flex-col space-y-2 p-6 border-b border-gray-100',
            'last:border-b-0',
            className
        )}
        {...props}
    />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef(({ className, size = 'default', ...props }, ref) => {
    const sizes = {
        sm: 'text-lg font-semibold',
        default: 'text-xl font-semibold',
        lg: 'text-2xl font-bold',
        xl: 'text-3xl font-bold',
    };

    return (
        <h3
            ref={ref}
            className={cn(
                'leading-tight tracking-tight text-gray-900',
                sizes[size],
                className
            )}
            {...props}
        />
    );
});
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn(
            'text-sm text-gray-600 leading-relaxed',
            className
        )}
        {...props}
    />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('p-6 space-y-4 animate-fade-in', className)}
        {...props}
    />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'flex items-center justify-between p-6 pt-0 border-t border-gray-100',
            className
        )}
        {...props}
    />
));
CardFooter.displayName = 'CardFooter';

const CardActions = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'flex items-center gap-3 p-6 pt-0',
            className
        )}
        {...props}
    />
));
CardActions.displayName = 'CardActions';

export {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    CardActions,
};
