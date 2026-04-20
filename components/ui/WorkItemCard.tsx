import React from 'react';
import { cn } from '@/lib/utils';
import Card from './Card';

export interface WorkItemCardProps extends React.HTMLAttributes<HTMLDivElement> {
  header: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  interactive?: boolean;
  hover?: boolean;
  glow?: 'teal' | 'yellow' | 'none';
  accentClassName?: string;
  selected?: boolean;
  highlighted?: boolean;
  contentClassName?: string;
  footerClassName?: string;
}

const WorkItemCard: React.FC<WorkItemCardProps> = ({
  header,
  footer,
  children,
  interactive = false,
  hover = false,
  glow = 'none',
  accentClassName,
  selected = false,
  highlighted = false,
  contentClassName,
  footerClassName,
  className,
  onClick,
  ...props
}) => {
  const isClickable = interactive || Boolean(onClick);
  return (
    <Card
      variant={isClickable ? 'interactive' : 'default'}
      padding="none"
      hover={isClickable || hover}
      glow={glow}
      onClick={onClick}
      className={cn(
        'group overflow-hidden border-l-4 border-l-transparent focus-within:ring-2 focus-within:ring-teal/40',
        accentClassName,
        selected && 'ring-2 ring-teal/40 border-teal/50',
        highlighted && 'ring-1 ring-status-generating/30 border-amber-400/50',
        className
      )}
      {...props}
    >
      <div className={cn('p-4', contentClassName)}>
        {header}
        {children}
      </div>
      {footer && (
        <div className={cn('px-4 py-2.5 border-t border-border bg-secondary/30', footerClassName)}>
          {footer}
        </div>
      )}
    </Card>
  );
};

export default WorkItemCard;
