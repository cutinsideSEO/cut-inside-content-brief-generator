import React from 'react';

// Toast component is now handled by Sonner via ToastContext.
// This file remains for backward compatibility of the type export.

export interface ToastProps {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onDismiss: (id: string) => void;
}

// The Toast component is no longer rendered directly.
// Use `useToast()` from ToastContext instead.
const Toast: React.FC<ToastProps> = () => null;

export default Toast;
