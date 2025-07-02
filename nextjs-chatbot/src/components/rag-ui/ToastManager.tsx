"use client";

import { useState, useEffect } from "react";
import { CheckCircle, AlertCircle, X, Bell } from "lucide-react";

export interface Toast {
    id: string;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    duration?: number;
}

interface ToastManagerProps {
    toasts: Toast[];
    onRemoveToast: (id: string) => void;
}

export function ToastManager({ toasts, onRemoveToast }: ToastManagerProps) {
    useEffect(() => {
        toasts.forEach(toast => {
            if (toast.duration && toast.duration > 0) {
                const timer = setTimeout(() => {
                    onRemoveToast(toast.id);
                }, toast.duration);
                return () => clearTimeout(timer);
            }
        });
    }, [toasts, onRemoveToast]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'error':
                return <AlertCircle className="h-5 w-5 text-red-500" />;
            default:
                return <Bell className="h-5 w-5 text-blue-500" />;
        }
    };

    const getStyles = (type: string) => {
        switch (type) {
            case 'success':
                return 'bg-green-50 border-green-200 text-green-800';
            case 'error':
                return 'bg-red-50 border-red-200 text-red-800';
            default:
                return 'bg-blue-50 border-blue-200 text-blue-800';
        }
    };

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`max-w-sm rounded-lg border p-4 shadow-lg transition-all duration-300 ${getStyles(toast.type)}`}
                >
                    <div className="flex items-start space-x-3">
                        {getIcon(toast.type)}
                        <div className="flex-1">
                            <h4 className="font-semibold text-sm">{toast.title}</h4>
                            <p className="text-sm mt-1">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => onRemoveToast(toast.id)}
                            className="text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

// Hook to manage toasts
export function useToasts() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = (toast: Omit<Toast, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9);
        const newToast: Toast = {
            ...toast,
            id,
            duration: toast.duration || 5000
        };
        setToasts(prev => [...prev, newToast]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const clearToasts = () => {
        setToasts([]);
    };

    return {
        toasts,
        addToast,
        removeToast,
        clearToasts
    };
}
