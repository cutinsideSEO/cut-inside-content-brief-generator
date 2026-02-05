import React, { useState, useRef, useEffect, useCallback } from 'react';

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
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    if (
      containerRef.current &&
      !containerRef.current.contains(event.target as Node)
    ) {
      setIsOpen(false);
    }
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClickOutside, handleKeyDown]);

  const togglePopover = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  return (
    <div ref={containerRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={togglePopover}
        className={`transition-colors duration-200 ${
          isOpen ? 'text-teal' : 'text-teal/50 hover:text-teal'
        }`}
        aria-label="View AI reasoning"
        aria-expanded={isOpen}
      >
        <SparkleSvg className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-80 max-h-60 overflow-y-auto p-3 bg-surface-elevated border border-border rounded-radius-md shadow-lg custom-scrollbar">
          <div className="flex items-center gap-1.5 mb-2">
            <SparkleSvg className="w-3.5 h-3.5 text-teal" />
            <span className="text-xs font-heading font-semibold text-text-muted uppercase tracking-wider">
              AI Reasoning
            </span>
          </div>
          <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
            {reasoning}
          </p>
        </div>
      )}
    </div>
  );
};

export default AIReasoningIcon;
