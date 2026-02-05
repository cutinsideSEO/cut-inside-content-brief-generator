import React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'pills' | 'underline' | 'boxed';
  size?: 'sm' | 'md';
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  variant = 'pills',
  size = 'md',
  className = '',
}) => {
  const baseContainerStyles = {
    pills: 'flex gap-2 p-1 bg-gray-100 rounded-lg border border-gray-200',
    underline: 'flex gap-6 border-b border-gray-200',
    boxed: 'inline-flex rounded-lg border border-gray-200 overflow-hidden',
  };

  const baseTabStyles = {
    pills: 'rounded-md transition-all duration-200',
    underline: 'pb-3 border-b-2 -mb-px transition-all duration-200',
    boxed: 'border-r border-gray-200 last:border-r-0 transition-all duration-200',
  };

  const activeTabStyles = {
    pills: 'bg-primary text-primary-foreground shadow-sm',
    underline: 'border-primary text-primary',
    boxed: 'bg-primary text-primary-foreground',
  };

  const inactiveTabStyles = {
    pills: 'text-muted-foreground hover:text-foreground hover:bg-gray-50',
    underline: 'border-transparent text-muted-foreground hover:text-foreground hover:border-gray-400',
    boxed: 'text-muted-foreground hover:text-foreground hover:bg-gray-50',
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
  };

  return (
    <TabsPrimitive.Root value={activeId} onValueChange={onChange}>
      <TabsPrimitive.List className={cn(baseContainerStyles[variant], className)}>
        {items.map((item) => {
          const isActive = item.id === activeId;

          return (
            <TabsPrimitive.Trigger
              key={item.id}
              value={item.id}
              disabled={item.disabled}
              className={cn(
                'flex items-center gap-2 font-medium',
                baseTabStyles[variant],
                sizeStyles[size],
                isActive ? activeTabStyles[variant] : inactiveTabStyles[variant],
                item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
              )}
            >
              {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
              <span>{item.label}</span>
              {item.count !== undefined && (
                <span
                  className={cn(
                    'ml-1 px-1.5 py-0.5 text-xs rounded',
                    isActive ? 'bg-white/20' : 'bg-gray-200'
                  )}
                >
                  {item.count}
                </span>
              )}
            </TabsPrimitive.Trigger>
          );
        })}
      </TabsPrimitive.List>
    </TabsPrimitive.Root>
  );
};

export default Tabs;
