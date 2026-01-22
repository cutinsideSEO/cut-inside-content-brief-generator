import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'teal' | 'outline';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  removable?: boolean;
  onRemove?: () => void;
  pulse?: boolean;
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  icon,
  removable = false,
  onRemove,
  pulse = false,
  className = '',
  children,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center gap-1.5 font-medium rounded-radius-sm transition-all duration-200';

  const variantStyles = {
    default: 'bg-surface-hover border border-border text-text-secondary',
    success: 'bg-status-complete/10 border border-status-complete/30 text-status-complete',
    warning: 'bg-status-generating/10 border border-status-generating/30 text-status-generating',
    error: 'bg-status-error/10 border border-status-error/30 text-status-error',
    teal: 'bg-teal/10 border border-teal/30 text-teal',
    outline: 'bg-transparent border border-border text-text-tertiary',
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  const pulseStyle = pulse ? 'animate-pulse-subtle' : '';

  const classes = [baseStyles, variantStyles[variant], sizeStyles[size], pulseStyle, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} {...props}>
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="flex-shrink-0 ml-0.5 hover:text-text-primary transition-colors"
          aria-label="Remove"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
};

export default Badge;
