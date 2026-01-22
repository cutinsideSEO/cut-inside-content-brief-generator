import React, { useEffect, useState } from 'react';

export interface ToastProps {
  id: string;
  title: string;
  description?: string;
  variant: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onDismiss: (id: string) => void;
}

const variantIcons = {
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  error: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  ),
  info: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
};

const variantStyles = {
  success: 'bg-status-complete/10 border-status-complete/30 text-status-complete',
  error: 'bg-status-error/10 border-status-error/30 text-status-error',
  warning: 'bg-status-generating/10 border-status-generating/30 text-status-generating',
  info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
};

const Toast: React.FC<ToastProps> = ({
  id,
  title,
  description,
  variant,
  duration = 5000,
  onDismiss,
}) => {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsLeaving(true);
        setTimeout(() => onDismiss(id), 300);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, id, onDismiss]);

  const handleDismiss = () => {
    setIsLeaving(true);
    setTimeout(() => onDismiss(id), 300);
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4
        bg-surface-primary border rounded-radius-lg shadow-card-elevated
        min-w-[300px] max-w-[400px]
        transition-all duration-300
        ${isLeaving ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      style={{ animation: 'slideInRight 0.3s ease-out' }}
    >
      <span className={variantStyles[variant]}>{variantIcons[variant]}</span>
      <div className="flex-1 min-w-0">
        <h4 className="font-heading font-semibold text-text-primary">{title}</h4>
        {description && <p className="text-sm text-text-secondary mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="flex-shrink-0 text-text-muted hover:text-text-secondary transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default Toast;
