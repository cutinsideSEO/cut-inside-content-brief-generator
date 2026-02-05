import React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';

export interface AIReasoningIconProps {
  reasoning: string;
  className?: string;
}

const SparkleSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    <path d="M20 3v4" />
    <path d="M22 5h-4" />
  </svg>
);

const AIReasoningIcon: React.FC<AIReasoningIconProps> = ({
  reasoning,
  className,
}) => {
  return (
    <PopoverPrimitive.Root>
      <div className={cn('relative inline-flex', className)}>
        <PopoverPrimitive.Trigger asChild>
          <button
            type="button"
            className="text-teal/40 hover:text-teal data-[state=open]:text-teal transition-colors duration-200"
            aria-label="View AI reasoning"
          >
            <SparkleSvg className="w-4 h-4" />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            side="top"
            align="start"
            sideOffset={8}
            className="z-50 w-80 max-h-60 overflow-y-auto p-3 bg-white border border-gray-200 rounded-md shadow-lg custom-scrollbar animate-scale-in"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <SparkleSvg className="w-3.5 h-3.5 text-teal" />
              <span className="text-xs font-heading font-semibold text-gray-400 uppercase tracking-wider">
                AI Reasoning
              </span>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {reasoning}
            </p>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </div>
    </PopoverPrimitive.Root>
  );
};

export default AIReasoningIcon;
