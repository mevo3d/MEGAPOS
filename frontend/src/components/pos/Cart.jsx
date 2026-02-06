import React from 'react';
import { Trash2, Plus, Minus, ShoppingCart, RotateCcw } from 'lucide-react';
import { Button } from '../ui/Button';

export const Cart = ({ items, onUpdateQuantity, onRemove, onClear, onCheckout, isProcessing }) => {
    const subtotal = items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    const impuestos = subtotal * 0.16;
    const total = subtotal + impuestos;

    return (
        <div className="flex flex-col h-full bg-white border-l shadow-xl w-96">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                <h2 className="font-bold text-lg flex items-center gap-2">
                    Carrito <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{items.length}</span>
                </h2>
                {items.length > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onClear}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 flex items-center gap-1"
                        title="Reiniciar carrito"
                    >
                        <RotateCcw className="h-4 w-4" />
                        Reiniciar
                    </Button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                            <ShoppingCart className="h-8 w-8" />
                        </div>
                        <p>El carrito está vacío</p>
                        <p className="text-xs text-center max-w-[200px]">Escanea un producto o selecciónalo del catálogo</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <div key={item.id} className="flex gap-3 bg-white border rounded-lg p-2 shadow-sm">
                            <div className="w-16 h-16 bg-gray-100 rounded-md flex-shrink-0 overflow-hidden">
                                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xs">IMG</div>
                            </div>
                            <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-medium text-sm truncate pr-2" title={item.nombre}>{item.nombre}</h4>
                                    <button onClick={() => onRemove(item.id)} className="text-gray-400 hover:text-red-500">
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="flex items-center border rounded-md">
                                        <button
                                            className="p-1 hover:bg-gray-100 disabled:opacity-50"
                                            onClick={() => onUpdateQuantity(item.id, item.cantidad - 1)}
                                            disabled={item.cantidad <= 1}
                                        >
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="w-8 text-center text-sm font-medium">{item.cantidad}</span>
                                        <button
                                            className="p-1 hover:bg-gray-100"
                                            onClick={() => onUpdateQuantity(item.id, item.cantidad + 1)}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <span className="font-bold text-blue-600">${(item.precio * item.cantidad).toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 bg-gray-50 border-t space-y-3">
                <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-gray-600">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span>Impuestos (16%)</span>
                        <span>${impuestos.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200 text-gray-900">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                </div>
                <Button
                    className="w-full h-12 text-lg shadow-blue-200 shadow-lg"
                    onClick={onCheckout}
                    disabled={items.length === 0 || isProcessing}
                    isLoading={isProcessing}
                >
                    Cobrar ${total.toFixed(2)}
                </Button>
            </div>
        </div>
    );
};
