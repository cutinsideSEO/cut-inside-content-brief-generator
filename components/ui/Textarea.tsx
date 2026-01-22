import React, { forwardRef, useEffect, useRef, useImperativeHandle } from 'react';

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
      className = '',
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

    const baseStyles =
      'w-full bg-surface-elevated border rounded-radius-md text-text-primary placeholder:text-text-muted transition-all duration-200 focus:outline-none focus-ring resize-none custom-scrollbar py-3 px-4';

    const stateStyles = error
      ? 'border-status-error focus:border-status-error'
      : 'border-border hover:border-border-emphasis focus:border-teal';

    const textareaClasses = [baseStyles, stateStyles, className].filter(Boolean).join(' ');

    const currentLength = typeof value === 'string' ? value.length : 0;
    const showCounter = showCount || maxLength;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-text-secondary mb-2">
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
            className={textareaClasses}
            {...props}
          />
          {showCounter && (
            <div className="absolute bottom-2 right-3 text-xs text-text-muted">
              {currentLength}
              {maxLength && `/${maxLength}`}
            </div>
          )}
        </div>
        {hint && !error && <p className="mt-1.5 text-sm text-text-muted">{hint}</p>}
        {error && <p className="mt-1.5 text-sm text-status-error">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
