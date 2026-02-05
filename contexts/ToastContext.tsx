import React, { createContext, useContext, useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';
import { Toaster } from '@/components/ui/primitives/sonner';

export interface ToastOptions {
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

function showSonnerToast(options: ToastOptions) {
  const opts = {
    description: options.description,
    duration: options.duration ?? 5000,
  };

  switch (options.variant) {
    case 'success':
      sonnerToast.success(options.title, opts);
      break;
    case 'error':
      sonnerToast.error(options.title, opts);
      break;
    case 'warning':
      sonnerToast.warning(options.title, opts);
      break;
    case 'info':
      sonnerToast.info(options.title, opts);
      break;
    default:
      sonnerToast(options.title, opts);
  }
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const toast = useCallback((options: ToastOptions) => {
    showSonnerToast(options);
  }, []);

  const success = useCallback((title: string, description?: string) => {
    showSonnerToast({ title, description, variant: 'success' });
  }, []);

  const error = useCallback((title: string, description?: string) => {
    showSonnerToast({ title, description, variant: 'error' });
  }, []);

  const warning = useCallback((title: string, description?: string) => {
    showSonnerToast({ title, description, variant: 'warning' });
  }, []);

  const info = useCallback((title: string, description?: string) => {
    showSonnerToast({ title, description, variant: 'info' });
  }, []);

  const value = {
    toast,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster position="bottom-right" richColors />
    </ToastContext.Provider>
  );
};

export default ToastContext;
