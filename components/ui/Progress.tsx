import React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: 'linear' | 'circular';
  size?: 'sm' | 'md' | 'lg';
  color?: 'teal' | 'yellow' | 'green' | 'red';
  showLabel?: boolean;
  label?: string;
}

const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  variant = 'linear',
  size = 'md',
  color = 'teal',
  showLabel = false,
  label,
  className,
  ...props
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const colorStyles = {
    teal: 'bg-primary',
    yellow: 'bg-amber-500',
    green: 'bg-emerald-500',
    red: 'bg-red-500',
  };

  const trackColorStyles = {
    teal: 'bg-teal-100',
    yellow: 'bg-amber-100',
    green: 'bg-emerald-100',
    red: 'bg-red-100',
  };

  if (variant === 'circular') {
    const circularSizes = {
      sm: { size: 32, stroke: 3 },
      md: { size: 48, stroke: 4 },
      lg: { size: 64, stroke: 5 },
    };

    const { size: svgSize, stroke } = circularSizes[size];
    const radius = (svgSize - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const strokeColors = {
      teal: '#0D9488',
      yellow: '#F59E0B',
      green: '#10B981',
      red: '#EF4444',
    };

    return (
      <div className={cn('relative inline-flex items-center justify-center', className)} {...props}>
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-gray-200"
          />
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke={strokeColors[color]}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300"
          />
        </svg>
        {showLabel && (
          <span className="absolute text-xs font-medium text-muted-foreground">
            {label || `${Math.round(percentage)}%`}
          </span>
        )}
      </div>
    );
  }

  const linearSizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={cn(className)} {...props}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-sm text-muted-foreground">{label}</span>}
          {showLabel && <span className="text-sm text-gray-400">{Math.round(percentage)}%</span>}
        </div>
      )}
      <ProgressPrimitive.Root
        value={percentage}
        className={cn('w-full rounded-full overflow-hidden', linearSizes[size], trackColorStyles[color])}
      >
        <ProgressPrimitive.Indicator
          className={cn('h-full rounded-full transition-all duration-300 ease-out', colorStyles[color])}
          style={{ width: `${percentage}%` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
};

export default Progress;
