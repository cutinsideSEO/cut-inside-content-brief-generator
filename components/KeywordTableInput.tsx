import React, { useState, useCallback, useRef } from 'react';
import { XIcon } from './Icon';

interface KeywordRow {
  id: string;
  keyword: string;
  volume: string;
}

interface KeywordTableInputProps {
  value: KeywordRow[];
  onChange: (rows: KeywordRow[]) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const KeywordTableInput: React.FC<KeywordTableInputProps> = ({ value, onChange }) => {
  const tableRef = useRef<HTMLDivElement>(null);

  const addRow = useCallback(() => {
    onChange([...value, { id: generateId(), keyword: '', volume: '' }]);
  }, [value, onChange]);

  const removeRow = useCallback((id: string) => {
    if (value.length <= 1) return; // Keep at least one row
    onChange(value.filter(row => row.id !== id));
  }, [value, onChange]);

  const updateRow = useCallback((id: string, field: 'keyword' | 'volume', newValue: string) => {
    onChange(value.map(row =>
      row.id === id ? { ...row, [field]: newValue } : row
    ));
  }, [value, onChange]);

  // Handle paste from spreadsheet (supports tab, comma, or multiple lines)
  const handlePaste = useCallback((e: React.ClipboardEvent, rowId: string, field: 'keyword' | 'volume') => {
    const pastedText = e.clipboardData.getData('text');

    // Check if it looks like multi-line or multi-column data
    const lines = pastedText.split(/\r?\n/).filter(line => line.trim());

    if (lines.length > 1 || pastedText.includes('\t') || (pastedText.includes(',') && lines[0].split(',').length === 2)) {
      e.preventDefault();

      const newRows: KeywordRow[] = [];

      for (const line of lines) {
        // Try tab first (spreadsheet paste), then comma
        let parts = line.split('\t');
        if (parts.length < 2) {
          parts = line.split(',');
        }

        if (parts.length >= 2) {
          const keyword = parts[0].trim();
          const volume = parts[1].trim().replace(/[^0-9]/g, ''); // Only numbers
          if (keyword) {
            newRows.push({ id: generateId(), keyword, volume });
          }
        } else if (parts[0].trim()) {
          // Single column paste - just keywords
          newRows.push({ id: generateId(), keyword: parts[0].trim(), volume: '' });
        }
      }

      if (newRows.length > 0) {
        // Find current row index
        const currentIndex = value.findIndex(r => r.id === rowId);

        // If current row is empty, replace it; otherwise insert after
        const currentRow = value[currentIndex];
        if (!currentRow.keyword && !currentRow.volume) {
          // Replace current empty row and add the rest
          const before = value.slice(0, currentIndex);
          const after = value.slice(currentIndex + 1);
          onChange([...before, ...newRows, ...after]);
        } else {
          // Insert after current row
          const before = value.slice(0, currentIndex + 1);
          const after = value.slice(currentIndex + 1);
          onChange([...before, ...newRows, ...after]);
        }
      }
    }
  }, [value, onChange]);

  // Handle Enter key to add new row
  const handleKeyDown = useCallback((e: React.KeyboardEvent, rowIndex: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (rowIndex === value.length - 1) {
        addRow();
        // Focus the new row's keyword input after render
        setTimeout(() => {
          const inputs = tableRef.current?.querySelectorAll('input[data-field="keyword"]');
          if (inputs && inputs.length > 0) {
            (inputs[inputs.length - 1] as HTMLInputElement).focus();
          }
        }, 0);
      }
    }
  }, [value.length, addRow]);

  return (
    <div ref={tableRef} className="bg-black/50 rounded-lg border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[1fr_120px_40px] gap-2 p-3 bg-white/5 border-b border-white/10">
        <div className="text-sm font-heading font-semibold text-gray-600/80">Keyword</div>
        <div className="text-sm font-heading font-semibold text-gray-600/80">Volume</div>
        <div></div>
      </div>

      {/* Rows */}
      <div className="max-h-64 overflow-y-auto">
        {value.map((row, index) => (
          <div
            key={row.id}
            className="grid grid-cols-[1fr_120px_40px] gap-2 p-2 border-b border-white/5 hover:bg-white/5 transition-colors"
          >
            <input
              type="text"
              data-field="keyword"
              value={row.keyword}
              onChange={(e) => updateRow(row.id, 'keyword', e.target.value)}
              onPaste={(e) => handlePaste(e, row.id, 'keyword')}
              onKeyDown={(e) => handleKeyDown(e, index)}
              placeholder="Enter keyword..."
              className="w-full px-3 py-2 bg-background border border-white/20 rounded text-gray-600 text-sm focus:ring-1 focus:ring-teal focus:border-teal"
            />
            <input
              type="text"
              inputMode="numeric"
              data-field="volume"
              value={row.volume}
              onChange={(e) => {
                // Only allow numbers
                const val = e.target.value.replace(/[^0-9]/g, '');
                updateRow(row.id, 'volume', val);
              }}
              onPaste={(e) => handlePaste(e, row.id, 'volume')}
              onKeyDown={(e) => handleKeyDown(e, index)}
              placeholder="0"
              className="w-full px-3 py-2 bg-background border border-white/20 rounded text-gray-600 text-sm text-right focus:ring-1 focus:ring-teal focus:border-teal"
            />
            <button
              onClick={() => removeRow(row.id)}
              disabled={value.length <= 1}
              className="p-2 text-gray-600/40 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-600/40 disabled:hover:bg-transparent"
              title="Remove row"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Footer with Add button and paste hint */}
      <div className="p-3 bg-white/5 border-t border-white/10 flex items-center justify-between">
        <button
          onClick={addRow}
          className="px-4 py-2 text-sm font-heading font-semibold text-teal hover:text-white bg-teal/10 hover:bg-teal/20 rounded transition-colors"
        >
          + Add Keyword
        </button>
        <span className="text-xs text-gray-600/50">
          Tip: Paste from Excel/Sheets (Keyword + Volume columns)
        </span>
      </div>

      {/* Summary */}
      {value.some(r => r.keyword && r.volume) && (
        <div className="px-3 py-2 bg-teal/10 border-t border-teal/20 text-xs text-teal">
          {value.filter(r => r.keyword && r.volume).length} keywords ready
          {' • '}
          Total volume: {value.reduce((sum, r) => sum + (parseInt(r.volume) || 0), 0).toLocaleString()}
        </div>
      )}
    </div>
  );
};

export default KeywordTableInput;
