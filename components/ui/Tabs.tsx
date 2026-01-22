import React from 'react';

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
    pills: 'flex gap-2 p-1 bg-surface-elevated rounded-radius-lg border border-border',
    underline: 'flex gap-6 border-b border-border',
    boxed: 'inline-flex rounded-radius-lg border border-border overflow-hidden',
  };

  const baseTabStyles = {
    pills: 'rounded-radius-md transition-all duration-200',
    underline: 'pb-3 border-b-2 -mb-px transition-all duration-200',
    boxed: 'border-r border-border last:border-r-0 transition-all duration-200',
  };

  const activeTabStyles = {
    pills: 'bg-teal text-brand-white shadow-sm',
    underline: 'border-teal text-teal',
    boxed: 'bg-teal text-brand-white',
  };

  const inactiveTabStyles = {
    pills: 'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
    underline: 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-emphasis',
    boxed: 'text-text-secondary hover:text-text-primary hover:bg-surface-hover',
  };

  const disabledTabStyles = 'opacity-50 cursor-not-allowed';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
  };

  return (
    <div className={`${baseContainerStyles[variant]} ${className}`} role="tablist">
      {items.map((item) => {
        const isActive = item.id === activeId;
        const isDisabled = item.disabled;

        const tabClasses = [
          'flex items-center gap-2 font-medium',
          baseTabStyles[variant],
          sizeStyles[size],
          isActive ? activeTabStyles[variant] : inactiveTabStyles[variant],
          isDisabled ? disabledTabStyles : 'cursor-pointer',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={isActive}
            aria-disabled={isDisabled}
            tabIndex={isDisabled ? -1 : 0}
            className={tabClasses}
            onClick={() => !isDisabled && onChange(item.id)}
          >
            {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
            {item.count !== undefined && (
              <span
                className={`
                  ml-1 px-1.5 py-0.5 text-xs rounded-radius-sm
                  ${isActive ? 'bg-white/20' : 'bg-surface-hover'}
                `}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default Tabs;
