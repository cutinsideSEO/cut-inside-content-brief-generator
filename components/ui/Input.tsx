import React, { forwardRef } from 'react';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
  label?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ size = 'md', error, icon, suffix, label, hint, className = '', id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    const baseStyles =
      'w-full bg-surface-elevated border rounded-radius-md text-text-primary placeholder:text-text-muted transition-all duration-200 focus:outline-none focus-ring';

    const sizeStyles = {
      sm: 'py-2 px-3 text-sm',
      md: 'py-3 px-4 text-base',
      lg: 'py-4 px-5 text-lg',
    };

    const stateStyles = error
      ? 'border-status-error focus:border-status-error'
      : 'border-border hover:border-border-emphasis focus:border-teal';

    const iconPadding = icon ? 'pl-10' : '';
    const suffixPadding = suffix ? 'pr-10' : '';

    const inputClasses = [baseStyles, sizeStyles[size], stateStyles, iconPadding, suffixPadding, className]
      .filter(Boolean)
      .join(' ');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
              {icon}
            </div>
          )}
          <input ref={ref} id={inputId} className={inputClasses} {...props} />
          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">{suffix}</div>
          )}
        </div>
        {hint && !error && <p className="mt-1.5 text-sm text-text-muted">{hint}</p>}
        {error && <p className="mt-1.5 text-sm text-status-error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
