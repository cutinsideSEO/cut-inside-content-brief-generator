import React, { forwardRef, useEffect, useRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  rows?: number;
  autoResize?: boolean;
  maxLength?: number;
  error?: string;
  label?: string;
  hint?: string;
  showCount?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      rows = 4,
      autoResize = false,
      maxLength,
      error,
      label,
      hint,
      showCount = false,
      className,
      id,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const internalRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => internalRef.current!);

    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

    const adjustHeight = () => {
      if (autoResize && internalRef.current) {
        internalRef.current.style.height = 'auto';
        internalRef.current.style.height = `${internalRef.current.scrollHeight}px`;
      }
    };

    useEffect(() => {
      adjustHeight();
    }, [value, autoResize]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (onChange) {
        onChange(e);
      }
      adjustHeight();
    };

    const currentLength = typeof value === 'string' ? value.length : 0;
    const showCounter = showCount || maxLength;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <textarea
            ref={internalRef}
            id={textareaId}
            rows={rows}
            maxLength={maxLength}
            value={value}
            onChange={handleChange}
            className={cn(
              'w-full bg-white border rounded-md text-foreground placeholder:text-gray-400 transition-all duration-200 focus:outline-none focus-ring resize-none custom-scrollbar py-3 px-4',

              // State
              error
                ? 'border-red-400 focus:border-red-400'
                : 'border-gray-200 hover:border-gray-300 focus:border-teal',

              className
            )}
            {...props}
          />
          {showCounter && (
            <div className="absolute bottom-2 right-3 text-xs text-gray-400">
              {currentLength}
              {maxLength && `/${maxLength}`}
            </div>
          )}
        </div>
        {hint && !error && <p className="mt-1.5 text-sm text-gray-400">{hint}</p>}
        {error && <p className="mt-1.5 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
