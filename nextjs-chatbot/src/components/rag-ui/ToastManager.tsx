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
                return <CheckCircle className="h-5 w-5 text-green-400" />;
            case 'error':
                return <AlertCircle className="h-5 w-5 text-red-400" />;
            default:
                return <Bell className="h-5 w-5 text-blue-400" />;
        }
    };

    const getStyles = (type: string) => {
        switch (type) {
            case 'success':
                return 'glass-dark border-green-400/30 text-green-400';
            case 'error':
                return 'glass-dark border-red-400/30 text-red-400';
            default:
                return 'glass-dark border-blue-400/30 text-blue-400';
        }
    };

    return (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={`max-w-sm rounded-xl border p-4 shadow-2xl transition-all duration-300 animate-float ${getStyles(toast.type)}`}
                >
                    <div className="flex items-start space-x-3">
                        {getIcon(toast.type)}
                        <div className="flex-1">
                            <h4 className="font-semibold text-sm text-stellar-white">{toast.title}</h4>
                            <p className="text-sm mt-1 text-lunar-grey">{toast.message}</p>
                        </div>
                        <button
                            onClick={() => onRemoveToast(toast.id)}
                            className="text-lunar-grey hover:text-stellar-white transition-colors hover:scale-110"
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
