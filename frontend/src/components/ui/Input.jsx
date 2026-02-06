import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

const Input = React.forwardRef(({
    className,
    type = 'text',
    error,
    label,
    placeholder,
    required,
    disabled,
    leftIcon,
    rightIcon,
    helperText,
    size = 'default',
    variant = 'default',
    ...props
}, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    const sizes = {
        sm: 'h-9 px-3 text-sm',
        default: 'h-11 px-4 text-base',
        lg: 'h-13 px-5 text-lg',
    };

    const variants = {
        default: 'border-gray-300 bg-white focus:border-primary-500 focus:ring-primary-500',
        filled: 'border-gray-200 bg-gray-50 focus:border-primary-500 focus:ring-primary-50',
        outlined: 'border-2 border-gray-300 bg-transparent focus:border-primary-500 focus:ring-primary-500',
        error: 'border-danger-500 focus:border-danger-500 focus:ring-danger-500 bg-danger-50',
    };

    return (
        <div className="w-full space-y-2">
            {/* Label */}
            {label && (
                <label className={cn(
                    'block text-sm font-medium transition-colors',
                    error ? 'text-danger-700' : isFocused ? 'text-primary-700' : 'text-gray-700'
                )}>
                    {label}
                    {required && <span className="text-danger-500 ml-1">*</span>}
                </label>
            )}

            {/* Input Container */}
            <div className="relative">
                {/* Left Icon */}
                {leftIcon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        {leftIcon}
                    </div>
                )}

                {/* Input Field */}
                <input
                    type={inputType}
                    ref={ref}
                    disabled={disabled}
                    className={cn(
                        // Base styles
                        'flex w-full rounded-xl border-2 transition-all duration-200 ease-out',
                        'placeholder:text-gray-400',
                        'focus:outline-none focus:ring-2 focus:ring-offset-0',
                        'disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500',
                        'file:border-0 file:bg-transparent file:text-sm file:font-medium',

                        // Dynamic styles
                        sizes[size],
                        variants[error ? 'error' : variant],

                        // Icon spacing
                        leftIcon && 'pl-11',
                        (rightIcon || isPassword) && 'pr-11',

                        // Custom focus styles
                        isFocused && !error && 'shadow-soft border-primary-500 bg-primary-50/30',

                        className
                    )}
                    placeholder={placeholder}
                    onFocus={(e) => {
                        setIsFocused(true);
                        props.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        props.onBlur?.(e);
                    }}
                    {...props}
                />

                {/* Right Icon */}
                {rightIcon && !isPassword && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        {rightIcon}
                    </div>
                )}

                {/* Password Toggle */}
                {isPassword && (
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:text-primary-600 transition-colors p-1 rounded-md hover:bg-gray-100"
                        tabIndex={-1}
                    >
                        {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                    </button>
                )}

                {/* Error Icon */}
                {error && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-danger-500">
                        <AlertCircle className="h-4 w-4" />
                    </div>
                )}
            </div>

            {/* Helper Text or Error Message */}
            {(helperText || error) && (
                <div className="flex items-start gap-2">
                    {error && <AlertCircle className="h-4 w-4 text-danger-500 mt-0.5 flex-shrink-0" />}
                    <p className={cn(
                        'text-sm',
                        error ? 'text-danger-600' : 'text-gray-500'
                    )}>
                        {error || helperText}
                    </p>
                </div>
            )}
        </div>
    );
});

Input.displayName = 'Input';
export { Input };
