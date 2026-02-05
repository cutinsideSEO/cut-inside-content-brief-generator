import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
  label?: string;
  hint?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ size = 'md', error, icon, suffix, label, hint, className, id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full bg-white border rounded-md text-foreground placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus-ring',

              // Size
              size === 'sm' && 'py-2 px-3 text-sm',
              size === 'md' && 'py-3 px-4 text-base',
              size === 'lg' && 'py-4 px-5 text-lg',

              // State
              error
                ? 'border-red-400 focus:border-red-400'
                : 'border-gray-200 hover:border-gray-300 focus:border-teal',

              // Icon/suffix padding
              icon && 'pl-10',
              suffix && 'pr-10',

              className
            )}
            {...props}
          />
          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{suffix}</div>
          )}
        </div>
        {hint && !error && <p className="mt-1.5 text-sm text-gray-400">{hint}</p>}
        {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
