import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2, RefreshCw, Activity } from 'lucide-react';

const Loading = React.forwardRef(({
    className,
    size = 'default',
    variant = 'spinner',
    text,
    overlay = false,
    transparent = false,
    ...props
}, ref) => {
    const sizes = {
        sm: 'h-4 w-4',
        default: 'h-6 w-6',
        lg: 'h-8 w-8',
        xl: 'h-12 w-12',
        '2xl': 'h-16 w-16',
    };

    const textSizes = {
        sm: 'text-xs',
        default: 'text-sm',
        lg: 'text-base',
        xl: 'text-lg',
        '2xl': 'text-xl',
    };

    const SpinIcon = ({ className: iconClassName }) => (
        <Loader2 className={cn('animate-spin', sizes[size], iconClassName)} />
    );

    const PulseIcon = ({ className: iconClassName }) => (
        <Activity className={cn('animate-pulse', sizes[size], iconClassName)} />
    );

    const RefreshIcon = ({ className: iconClassName }) => (
        <RefreshCw className={cn('animate-spin', sizes[size], iconClassName)} />
    );

    const DotLoader = () => (
        <div className="flex gap-1">
            {[0, 1, 2].map((index) => (
                <div
                    key={index}
                    className={cn(
                        'rounded-full bg-primary-600 animate-pulse',
                        sizes[size].replace('h-', 'h-').replace('w-', 'w-').replace('4', '2').replace('6', '3').replace('8', '4').replace('12', '6').replace('16', '8'),
                        'animation-delay-' + (index * 150) + 'ms'
                    )}
                    style={{
                        animationDelay: `${index * 150}ms`,
                    }}
                />
            ))}
        </div>
    );

    const icons = {
        spinner: <SpinIcon />,
        pulse: <PulseIcon />,
        refresh: <RefreshIcon />,
        dots: <DotLoader />,
    };

    const content = (
        <div
            ref={ref}
            className={cn(
                'flex flex-col items-center justify-center gap-3',
                className
            )}
            {...props}
        >
            {icons[variant] || icons.spinner}
            {text && (
                <p className={cn(
                    'text-gray-600 font-medium',
                    textSizes[size]
                )}>
                    {text}
                </p>
            )}
        </div>
    );

    if (overlay) {
        return (
            <div className={cn(
                'fixed inset-0 z-50 flex items-center justify-center',
                transparent ? 'bg-black/20' : 'bg-white/80 backdrop-blur-sm',
                'animate-fade-in'
            )}>
                {content}
            </div>
        );
    }

    return content;
});

Loading.displayName = 'Loading';

// Skeleton loader component
const Skeleton = React.forwardRef(({
    className,
    lines = 1,
    height = 'h-4',
    width = 'w-full',
    ...props
}, ref) => {
    return (
        <div ref={ref} className={cn('space-y-2', className)} {...props}>
            {Array.from({ length: lines }).map((_, index) => (
                <div
                    key={index}
                    className={cn(
                        'bg-gray-200 rounded-lg animate-pulse',
                        height,
                        index === lines - 1 && lines > 1 ? 'w-3/4' : width
                    )}
                    style={{
                        animationDelay: `${index * 100}ms`,
                    }}
                />
            ))}
        </div>
    );
});

Skeleton.displayName = 'Skeleton';

// Card skeleton component
const CardSkeleton = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'bg-white rounded-xl border border-gray-200 p-6 space-y-4',
            'animate-pulse',
            className
        )}
        {...props}
    >
        <div className="flex items-center space-x-4">
            <div className="h-12 w-12 bg-gray-200 rounded-lg" />
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
            </div>
        </div>
        <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded" />
            <div className="h-3 bg-gray-200 rounded w-5/6" />
            <div className="h-3 bg-gray-200 rounded w-4/6" />
        </div>
        <div className="flex justify-between items-center pt-4">
            <div className="h-8 w-20 bg-gray-200 rounded-lg" />
            <div className="h-10 w-24 bg-gray-200 rounded-lg" />
        </div>
    </div>
));

CardSkeleton.displayName = 'CardSkeleton';

export { Loading, Skeleton, CardSkeleton };