import React from 'react';
import { cn } from '@/lib/utils';

export interface StatusIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  status: 'saved' | 'saving' | 'unsaved' | 'error' | 'generating';
  label?: string;
  timestamp?: Date;
  compact?: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
  timestamp,
  compact = false,
  className,
  ...props
}) => {
  const statusConfig = {
    saved: {
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      defaultLabel: 'Saved',
    },
    saving: {
      color: 'text-amber-500',
      bgColor: 'bg-amber-500',
      icon: (
        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ),
      defaultLabel: 'Saving...',
    },
    unsaved: {
      color: 'text-gray-400',
      bgColor: 'bg-gray-400',
      icon: (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 8 8">
          <circle cx="4" cy="4" r="3" />
        </svg>
      ),
      defaultLabel: 'Unsaved changes',
    },
    error: {
      color: 'text-red-500',
      bgColor: 'bg-red-500',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      defaultLabel: 'Save failed',
    },
    generating: {
      color: 'text-amber-500',
      bgColor: 'bg-amber-500',
      icon: (
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
        </span>
      ),
      defaultLabel: 'Generating...',
    },
  };

  const config = statusConfig[status];
  const displayLabel = label || config.defaultLabel;

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1.5', config.color, className)} {...props}>
        {config.icon}
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)} {...props}>
      <span className={config.color}>{config.icon}</span>
      <span className={config.color}>{displayLabel}</span>
      {timestamp && status === 'saved' && (
        <span className="text-gray-400">at {formatTimestamp(timestamp)}</span>
      )}
    </div>
  );
};

export default StatusIndicator;
