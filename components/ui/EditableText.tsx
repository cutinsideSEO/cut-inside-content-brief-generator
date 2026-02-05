import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface EditableTextProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  textClassName?: string;
}

const PencilSvg: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 3a2.85 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z" />
    <path d="M15 5l4 4" />
  </svg>
);

const EditableText: React.FC<EditableTextProps> = ({
  value,
  onChange,
  placeholder,
  multiline = true,
  className = '',
  textClassName = '',
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync editValue when value prop changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value);
    }
  }, [value, isEditing]);

  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    if (isEditing && multiline) {
      adjustTextareaHeight();
    }
  }, [isEditing, multiline, adjustTextareaHeight]);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (isEditing) {
      if (multiline && textareaRef.current) {
        textareaRef.current.focus();
        // Place cursor at end
        const len = textareaRef.current.value.length;
        textareaRef.current.setSelectionRange(len, len);
      } else if (!multiline && inputRef.current) {
        inputRef.current.focus();
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }
  }, [isEditing, multiline]);

  const enterEditMode = () => {
    setEditValue(value);
    setIsEditing(true);
  };

  const saveAndExit = () => {
    const trimmed = editValue.trim();
    onChange(trimmed);
    setIsEditing(false);
  };

  const cancelAndExit = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditValue(e.target.value);
    adjustTextareaHeight();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      cancelAndExit();
    }
    // For single-line input, Enter saves
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      saveAndExit();
    }
  };

  const displayText = value || '';
  const isEmpty = displayText.trim().length === 0;
  const displayPlaceholder = placeholder || 'Click to edit...';

  const defaultTextClasses = 'text-text-primary text-sm leading-relaxed';
  const resolvedTextClasses = textClassName || defaultTextClasses;

  // Edit mode
  if (isEditing) {
    const editStyles =
      'w-full bg-surface-elevated border border-border rounded-radius-md text-text-primary text-sm leading-relaxed py-3 px-4 focus:outline-none focus:border-teal resize-none';

    if (multiline) {
      return (
        <div className={className}>
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={handleTextareaChange}
            onBlur={saveAndExit}
            onKeyDown={handleKeyDown}
            className={editStyles}
            rows={1}
          />
        </div>
      );
    }

    return (
      <div className={className}>
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={handleInputChange}
          onBlur={saveAndExit}
          onKeyDown={handleKeyDown}
          className={editStyles}
        />
      </div>
    );
  }

  // Display mode
  return (
    <div
      className={`group relative cursor-text ${className}`}
      onClick={enterEditMode}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          enterEditMode();
        }
      }}
    >
      <p
        className={`px-2 py-1.5 -mx-2 rounded-radius-sm transition-colors duration-150 group-hover:bg-surface-hover/50 ${
          isEmpty
            ? 'text-text-muted italic'
            : resolvedTextClasses
        }`}
      >
        {isEmpty ? displayPlaceholder : displayText}
      </p>
      <span className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <PencilSvg className="w-3.5 h-3.5 text-text-muted/50" />
      </span>
    </div>
  );
};

export default EditableText;
