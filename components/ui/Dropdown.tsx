import React, { useState, useRef, useEffect } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface DropdownProps {
  options: DropdownOption[];
  value: string | string[];
  onChange: (value: string | string[]) => void;
  placeholder?: string;
  searchable?: boolean;
  multi?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchable = false,
  multi = false,
  disabled = false,
  error,
  label,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const selectedOptions = options.filter((opt) => selectedValues.includes(opt.value));

  const filteredOptions = searchable
    ? options.filter((opt) => opt.label.toLowerCase().includes(search.toLowerCase()))
    : options;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen, searchable]);

  const handleSelect = (optionValue: string) => {
    if (multi) {
      const newValues = selectedValues.includes(optionValue)
        ? selectedValues.filter((v) => v !== optionValue)
        : [...selectedValues, optionValue];
      onChange(newValues);
    } else {
      onChange(optionValue);
      setIsOpen(false);
      setSearch('');
    }
  };

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (multi) {
      onChange(selectedValues.filter((v) => v !== optionValue));
    }
  };

  const displayValue = () => {
    if (selectedOptions.length === 0) {
      return <span className="text-text-muted">{placeholder}</span>;
    }

    if (multi) {
      return (
        <div className="flex flex-wrap gap-1">
          {selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-surface-hover rounded-radius-sm text-sm"
            >
              {opt.label}
              <button
                type="button"
                onClick={(e) => handleRemove(opt.value, e)}
                className="hover:text-text-primary"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      );
    }

    return (
      <span className="flex items-center gap-2">
        {selectedOptions[0].icon}
        {selectedOptions[0].label}
      </span>
    );
  };

  const stateStyles = error
    ? 'border-status-error focus-within:border-status-error'
    : 'border-border hover:border-border-emphasis focus-within:border-teal';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="block text-sm font-medium text-text-secondary mb-2">{label}</label>}

      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between gap-2
          bg-surface-elevated border rounded-radius-md
          py-3 px-4 text-left text-text-primary
          transition-all duration-200 focus:outline-none focus-ring
          ${stateStyles}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <div className="flex-1 min-w-0 truncate">{displayValue()}</div>
        <svg
          className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {error && <p className="mt-1.5 text-sm text-status-error">{error}</p>}

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-surface-primary border border-border rounded-radius-md shadow-card-elevated animate-slide-up">
          {searchable && (
            <div className="p-2 border-b border-border">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full bg-surface-elevated border border-border rounded-radius-md py-2 px-3 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-teal"
              />
            </div>
          )}

          <div className="max-h-60 overflow-y-auto custom-scrollbar py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-text-muted text-center">No options found</div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selectedValues.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={option.disabled}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    className={`
                      w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm
                      transition-colors
                      ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-surface-hover'}
                      ${isSelected ? 'bg-teal/10 text-teal' : 'text-text-primary'}
                    `}
                  >
                    {multi && (
                      <span
                        className={`
                          w-4 h-4 rounded border flex items-center justify-center
                          ${isSelected ? 'bg-teal border-teal' : 'border-border'}
                        `}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                    )}
                    {option.icon && <span className="flex-shrink-0">{option.icon}</span>}
                    <span>{option.label}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dropdown;
