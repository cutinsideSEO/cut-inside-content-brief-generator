import React from 'react';
import { cn } from '@/lib/utils';

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
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'rounded-lg transition-all duration-200',

        // Variant
        variant === 'default' && 'bg-card border border-border shadow-card',
        variant === 'elevated' && 'bg-card border border-border shadow-card-elevated',
        variant === 'interactive' && 'bg-card border border-border shadow-card cursor-pointer interactive-card',
        variant === 'outline' && 'bg-transparent border border-border',

        // Padding
        padding === 'sm' && 'p-4',
        padding === 'md' && 'p-5',
        padding === 'lg' && 'p-6',

        // Hover
        hover && 'card-hover-lift hover:shadow-card-hover hover:border-gray-300',

        // Glow
        glow === 'teal' && 'hover:shadow-glow-teal-sm hover:border-teal/30',
        glow === 'yellow' && 'hover:shadow-md hover:border-amber-300',

        // Status border
        statusBorder === 'generating' && 'border-l-4 border-l-amber-400 status-border-generating',
        statusBorder === 'complete' && 'border-l-4 border-l-emerald-400',
        statusBorder === 'draft' && 'border-l-4 border-l-gray-300',
        statusBorder === 'error' && 'border-l-4 border-l-red-400',

        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
