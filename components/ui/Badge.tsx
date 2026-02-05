import React from 'react';
import { cn } from '@/lib/utils';

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
  className,
  children,
  ...props
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded transition-all duration-200',

        // Variant
        variant === 'default' && 'bg-gray-100 border border-gray-200 text-gray-600',
        variant === 'success' && 'bg-emerald-50 border border-emerald-200 text-emerald-700',
        variant === 'warning' && 'bg-amber-50 border border-amber-200 text-amber-700',
        variant === 'error' && 'bg-red-50 border border-red-200 text-red-700',
        variant === 'teal' && 'bg-teal-50 border border-teal-200 text-teal-700',
        variant === 'outline' && 'bg-transparent border border-gray-200 text-gray-500',

        // Size
        size === 'sm' && 'px-2 py-0.5 text-xs',
        size === 'md' && 'px-2.5 py-1 text-sm',

        // Pulse
        pulse && 'animate-pulse-subtle',

        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {removable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="flex-shrink-0 ml-0.5 hover:text-gray-900 transition-colors"
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
