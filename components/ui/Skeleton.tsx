import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave';
  lines?: number;
}

const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  animation = 'wave',
  lines = 1,
  className,
  style,
  ...props
}) => {
  const animationStyles = {
    pulse: 'animate-pulse',
    wave: 'skeleton-shimmer',
  };

  const variantStyles = {
    text: 'rounded-sm',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  const getSize = () => {
    if (variant === 'text') {
      return {
        width: width || '100%',
        height: height || '1em',
      };
    }
    if (variant === 'circular') {
      const size = width || height || 40;
      return {
        width: size,
        height: size,
      };
    }
    return {
      width: width || '100%',
      height: height || 100,
    };
  };

  const sizeStyle = getSize();

  const classes = cn(
    'bg-muted rounded',
    animationStyles[animation],
    variantStyles[variant],
    className
  );

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2" {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={classes}
            style={{
              ...style,
              width: index === lines - 1 ? '75%' : sizeStyle.width,
              height: sizeStyle.height,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={classes}
      style={{
        ...style,
        width: sizeStyle.width,
        height: sizeStyle.height,
      }}
      {...props}
    />
  );
};

export default Skeleton;
