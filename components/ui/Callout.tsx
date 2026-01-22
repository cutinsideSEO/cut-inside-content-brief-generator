import React, { useState } from 'react';

export interface CalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'tip' | 'warning' | 'ai';
  icon?: React.ReactNode;
  title?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const defaultIcons = {
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
  tip: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
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
  ai: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  ),
};

const Callout: React.FC<CalloutProps> = ({
  variant = 'info',
  icon,
  title,
  children,
  collapsible = false,
  defaultCollapsed = false,
  className = '',
  ...props
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const variantStyles = {
    info: 'border-l-blue-500 bg-blue-500/5',
    tip: 'border-l-green-500 bg-green-500/5',
    warning: 'border-l-status-generating bg-status-generating/5',
    ai: 'border-l-teal bg-teal/5',
  };

  const iconColors = {
    info: 'text-blue-400',
    tip: 'text-green-400',
    warning: 'text-status-generating',
    ai: 'text-teal',
  };

  const displayIcon = icon || defaultIcons[variant];

  const baseStyles =
    'border-l-4 rounded-radius-md p-4 transition-all duration-200';

  const classes = [baseStyles, variantStyles[variant], className].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      <div className="flex items-start gap-3">
        <span className={`flex-shrink-0 ${iconColors[variant]}`}>{displayIcon}</span>
        <div className="flex-1 min-w-0">
          {title && (
            <div className="flex items-center justify-between">
              <h4 className="font-heading font-semibold text-text-primary mb-1">{title}</h4>
              {collapsible && (
                <button
                  type="button"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="text-text-muted hover:text-text-secondary transition-colors ml-2"
                  aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
          )}
          {(!collapsible || !isCollapsed) && (
            <div className="text-text-secondary text-sm">{children}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Callout;
