import React from 'react';

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
  className = '',
  ...props
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const colorStyles = {
    teal: 'bg-teal',
    yellow: 'bg-status-generating',
    green: 'bg-status-complete',
    red: 'bg-status-error',
  };

  const trackColorStyles = {
    teal: 'bg-teal/20',
    yellow: 'bg-status-generating/20',
    green: 'bg-status-complete/20',
    red: 'bg-status-error/20',
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
      teal: '#008080',
      yellow: '#EAB308',
      green: '#14B8A6',
      red: '#EF4444',
    };

    return (
      <div className={`relative inline-flex items-center justify-center ${className}`} {...props}>
        <svg width={svgSize} height={svgSize} className="-rotate-90">
          <circle
            cx={svgSize / 2}
            cy={svgSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-surface-hover"
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
          <span className="absolute text-xs font-medium text-text-secondary">
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
    <div className={className} {...props}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-sm text-text-secondary">{label}</span>}
          {showLabel && <span className="text-sm text-text-muted">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={`w-full ${linearSizes[size]} ${trackColorStyles[color]} rounded-full overflow-hidden`}>
        <div
          className={`h-full ${colorStyles[color]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default Progress;
