import React from 'react';

export interface FloatingPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  maxHeight?: string;
  variant?: 'default' | 'warning' | 'info';
  children: React.ReactNode;
}

const FloatingPanel: React.FC<FloatingPanelProps> = ({
  position = 'bottom-right',
  maxHeight = '400px',
  variant = 'default',
  className = '',
  children,
  ...props
}) => {
  const positionStyles = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  };

  const variantStyles = {
    default: 'border-border',
    warning: 'border-status-generating/50',
    info: 'border-teal/50',
  };

  const baseStyles =
    'fixed z-50 w-80 glass-effect border rounded-radius-xl shadow-card-elevated animate-slide-in-bottom';

  const classes = [baseStyles, positionStyles[position], variantStyles[variant], className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} style={{ maxHeight }} {...props}>
      <div className="overflow-y-auto custom-scrollbar h-full" style={{ maxHeight }}>
        {children}
      </div>
    </div>
  );
};

export interface FloatingPanelHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export const FloatingPanelHeader: React.FC<FloatingPanelHeaderProps> = ({
  icon,
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`flex items-center gap-2 p-4 border-b border-border sticky top-0 glass-effect ${className}`}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="font-heading font-semibold text-text-primary">{children}</span>
    </div>
  );
};

export interface FloatingPanelItemProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  status?: React.ReactNode;
  progress?: React.ReactNode;
  action?: React.ReactNode;
}

export const FloatingPanelItem: React.FC<FloatingPanelItemProps> = ({
  title,
  subtitle,
  status,
  progress,
  action,
  className = '',
  ...props
}) => {
  return (
    <div className={`p-4 border-b border-border last:border-b-0 ${className}`} {...props}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="font-medium text-text-primary truncate">{title}</div>
          {subtitle && <div className="text-sm text-text-muted truncate">{subtitle}</div>}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>
      {status && <div className="text-sm text-text-secondary mb-2">{status}</div>}
      {progress && <div>{progress}</div>}
    </div>
  );
};

export interface FloatingPanelFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const FloatingPanelFooter: React.FC<FloatingPanelFooterProps> = ({
  className = '',
  children,
  ...props
}) => {
  return (
    <div
      className={`p-3 border-t border-border text-xs text-text-muted text-center sticky bottom-0 glass-effect ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default FloatingPanel;
