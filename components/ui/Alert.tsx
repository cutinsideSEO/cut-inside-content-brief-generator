import React from 'react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant: 'error' | 'warning' | 'success' | 'info';
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  icon?: React.ReactNode;
}

const defaultIcons = {
  error: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
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
  success: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
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

const Alert: React.FC<AlertProps> = ({
  variant,
  title,
  children,
  dismissible = false,
  onDismiss,
  icon,
  className = '',
  ...props
}) => {
  const variantStyles = {
    error: 'bg-status-error/10 border-status-error/30 text-status-error',
    warning: 'bg-status-generating/10 border-status-generating/30 text-status-generating',
    success: 'bg-status-complete/10 border-status-complete/30 text-status-complete',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  };

  const displayIcon = icon || defaultIcons[variant];

  const baseStyles = 'border rounded-radius-lg p-4 transition-all duration-200';

  const classes = [baseStyles, variantStyles[variant], className].filter(Boolean).join(' ');

  return (
    <div className={classes} role="alert" {...props}>
      <div className="flex items-start gap-3">
        <span className="flex-shrink-0 mt-0.5">{displayIcon}</span>
        <div className="flex-1 min-w-0">
          {title && <h4 className="font-heading font-semibold mb-1">{title}</h4>}
          <div className="text-sm opacity-90">{children}</div>
        </div>
        {dismissible && (
          <button
            type="button"
            onClick={onDismiss}
            className="flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;
