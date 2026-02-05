// Save Status Indicator - Shows auto-save status
import React from 'react';
import type { SaveStatus } from '../types/appState';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  lastSavedAt: Date | null;
}

const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({
  status,
  lastSavedAt,
}) => {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'saved':
        return {
          icon: (
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ),
          text: lastSavedAt ? `Saved at ${formatTime(lastSavedAt)}` : 'Saved',
          className: 'text-emerald-500',
        };
      case 'saving':
        return {
          icon: (
            <svg className="w-4 h-4 text-amber-500 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ),
          text: 'Saving...',
          className: 'text-amber-500',
        };
      case 'unsaved':
        return {
          icon: (
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" />
            </svg>
          ),
          text: 'Unsaved changes',
          className: 'text-gray-400',
        };
      case 'error':
        return {
          icon: (
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          ),
          text: 'Save failed',
          className: 'text-red-500',
        };
      default:
        return {
          icon: null,
          text: '',
          className: '',
        };
    }
  };

  const config = getStatusConfig();

  if (!config.text) return null;

  return (
    <div className={`flex items-center gap-1.5 text-sm ${config.className}`}>
      {config.icon}
      <span>{config.text}</span>
    </div>
  );
};

export default SaveStatusIndicator;
