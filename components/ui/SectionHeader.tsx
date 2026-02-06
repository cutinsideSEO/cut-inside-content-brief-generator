import React from 'react';
import { cn } from '@/lib/utils';

export interface SectionHeaderProps {
  children: React.ReactNode;
  className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ children, className }) => {
  return (
    <h3 className={cn('text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider', className)}>
      {children}
    </h3>
  );
};

export default SectionHeader;
