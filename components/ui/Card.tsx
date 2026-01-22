import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'outline';
  padding?: 'sm' | 'md' | 'lg' | 'none';
  hover?: boolean;
  glow?: 'teal' | 'yellow' | 'none';
  statusBorder?: 'generating' | 'complete' | 'draft' | 'error' | 'none';
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  hover = false,
  glow = 'none',
  statusBorder = 'none',
  className = '',
  children,
  ...props
}) => {
  const baseStyles = 'rounded-radius-lg transition-all duration-200';

  const variantStyles = {
    default: 'bg-surface-elevated border border-border shadow-card shadow-inner-subtle',
    elevated: 'bg-surface-elevated border border-border shadow-card-elevated',
    interactive: 'bg-surface-elevated border border-border shadow-card cursor-pointer interactive-card',
    outline: 'bg-transparent border border-border',
  };

  const paddingStyles = {
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
    none: '',
  };

  const hoverStyles = hover ? 'card-hover-lift hover:shadow-card-hover hover:border-border-emphasis' : '';

  const glowStyles = {
    teal: 'hover:shadow-glow-teal-sm hover:border-teal/30',
    yellow: 'hover:shadow-glow-yellow-sm hover:border-yellow/30',
    none: '',
  };

  const statusBorderStyles = {
    generating: 'border-l-4 border-l-status-generating status-border-generating',
    complete: 'border-l-4 border-l-status-complete',
    draft: 'border-l-4 border-l-status-draft',
    error: 'border-l-4 border-l-status-error',
    none: '',
  };

  const classes = [
    baseStyles,
    variantStyles[variant],
    paddingStyles[padding],
    hoverStyles,
    glowStyles[glow],
    statusBorderStyles[statusBorder],
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Card;
