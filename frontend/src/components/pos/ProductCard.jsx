import React, { useState } from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { cn } from '../../utils/cn';
import { Plus, Package, ShoppingCart, AlertTriangle, TrendingUp } from 'lucide-react';

export const ProductCard = ({ product, onAdd, quickAdd = true }) => {
    const [isAdding, setIsAdding] = useState(false);
    const [imageError, setImageError] = useState(false);
    const isLowStock = product.stock_fisico < 10;
    const isOutOfStock = product.stock_fisico === 0;

    const handleAdd = async (e) => {
        e.stopPropagation();
        if (isOutOfStock || isAdding) return;

        setIsAdding(true);
        try {
            await onAdd(product);
        } finally {
            setIsAdding(false);
        }
    };

    const formatPrice = (price) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(price);
    };

    const stockStatus = {
        color: isOutOfStock ? 'danger' : isLowStock ? 'warning' : 'success',
        text: isOutOfStock ? 'Agotado' : isLowStock ? `Stock bajo: ${product.stock_fisico}` : `Disponible: ${product.stock_fisico}`,
        icon: isOutOfStock ? AlertTriangle : isLowStock ? AlertTriangle : TrendingUp,
    };

    return (
        <Card
            variant="default"
            hover={true}
            className="group cursor-pointer overflow-hidden bg-white hover:shadow-strong transition-all duration-300"
        >
            {/* Product Image Container */}
            <div className="relative aspect-square bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                {/* Product Image or Placeholder */}
                {product.imagen_url && !imageError ? (
                    <img
                        src={product.imagen_url}
                        alt={product.nombre}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        onError={() => setImageError(true)}
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <Package className="h-16 w-16 text-gray-400" />
                    </div>
                )}

                {/* Overlay with Quick Add Button */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end justify-center pb-4">
                    <Button
                        onClick={handleAdd}
                        disabled={isOutOfStock || isAdding}
                        isLoading={isAdding}
                        size="sm"
                        variant="primary"
                        className="bg-white text-gray-900 hover:bg-gray-100 border-2 border-white shadow-xl px-6"
                    >
                        {isAdding ? (
                            'Agregando...'
                        ) : (
                            <>
                                <ShoppingCart className="h-4 w-4 mr-2" />
                                Agregar
                            </>
                        )}
                    </Button>
                </div>

                {/* Stock Status Badge */}
                <div className="absolute top-3 right-3">
                    <Badge
                        variant={stockStatus.color}
                        size="sm"
                        icon={stockStatus.icon}
                        className="shadow-lg backdrop-blur-sm bg-white/90"
                    >
                        {isOutOfStock ? 'Agotado' : product.stock_fisico}
                    </Badge>
                </div>

                {/* Discount or Special Badge */}
                {product.descuento && product.descuento > 0 && (
                    <div className="absolute top-3 left-3">
                        <Badge variant="danger" size="sm" className="shadow-lg">
                            -{product.descuento}%
                        </Badge>
                    </div>
                )}
            </div>

            {/* Product Info */}
            <CardContent className="p-4 space-y-3">
                {/* Product Name */}
                <div>
                    <h3
                        className="font-semibold text-gray-900 leading-tight line-clamp-2 min-h-[2.5rem] group-hover:text-primary-700 transition-colors"
                        title={product.nombre}
                    >
                        {product.nombre}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 font-mono bg-gray-100 px-2 py-1 rounded-md inline-block">
                        SKU: {product.sku}
                    </p>
                </div>

                {/* Price Section */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            {product.descuento && product.descuento > 0 && (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500 line-through">
                                        {formatPrice(product.precio_original || product.precio)}
                                    </span>
                                    <Badge variant="danger" size="xs">
                                        -{product.descuento}%
                                    </Badge>
                                </div>
                            )}
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-gray-900 leading-none">
                                    ${product.precio}
                                </span>
                                <span className="text-xs text-gray-500">MXN</span>
                            </div>
                        </div>

                        {/* Quick Add Button */}
                        {quickAdd && (
                            <Button
                                onClick={handleAdd}
                                disabled={isOutOfStock || isAdding}
                                isLoading={isAdding}
                                size="icon"
                                variant={isOutOfStock ? 'ghost' : 'primary'}
                                className="shrink-0"
                            >
                                {isAdding ? (
                                    <span className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full" />
                                ) : (
                                    <Plus className="h-5 w-5" />
                                )}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Stock Status Text */}
                <div className="flex items-center gap-2 text-xs">
                    {stockStatus.icon && (
                        <stockStatus.icon className={cn(
                            'h-3 w-3',
                            stockStatus.color === 'danger' ? 'text-danger-500' :
                            stockStatus.color === 'warning' ? 'text-warning-500' :
                            'text-success-500'
                        )} />
                    )}
                    <span className={cn(
                        'font-medium',
                        stockStatus.color === 'danger' ? 'text-danger-600' :
                        stockStatus.color === 'warning' ? 'text-warning-600' :
                        'text-success-600'
                    )}>
                        {stockStatus.text}
                    </span>
                </div>
            </CardContent>
        </Card>
    );
};
