import { useEffect, useCallback } from 'react';

interface KeyboardShortcutHandlers {
  /** Ctrl+S: Trigger manual save */
  onSave?: () => void;
  /** Ctrl+Enter: Advance to next step */
  onNextStep?: () => void;
  /** Escape: Close any open modal / go back */
  onEscape?: () => void;
}

/**
 * Global keyboard shortcuts hook.
 * - Ctrl+S: Save
 * - Ctrl+Enter: Next step
 * - Escape: Close modal / dismiss
 */
export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs/textareas (except Escape)
      const target = e.target as HTMLElement;
      const isEditing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      // Ctrl+S / Cmd+S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handlers.onSave?.();
        return;
      }

      // Ctrl+Enter / Cmd+Enter: Next step
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handlers.onNextStep?.();
        return;
      }

      // Escape: Close modal (works even in inputs)
      if (e.key === 'Escape') {
        // Don't prevent default for Escape in inputs - let them blur naturally
        if (!isEditing) {
          e.preventDefault();
        }
        handlers.onEscape?.();
        return;
      }
    },
    [handlers]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
