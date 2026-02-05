import React, { useState, useRef, useEffect, useCallback } from 'react';
import Button from './Button';
import { RefreshCwIcon, ZapIcon, EditIcon, XIcon } from './Icon';
import type { RewriteAction } from '../types';
import { rewriteSelection } from '../services/geminiService';

interface InlineEditorProps {
  content: string;
  onChange: (newContent: string) => void;
  language: string;
  sectionContext?: string;
  readOnly?: boolean;
}

const rewriteActions: { action: RewriteAction; label: string; icon: React.ReactNode; description: string }[] = [
  { action: 'rewrite', label: 'Rewrite', icon: <RefreshCwIcon className="h-4 w-4" />, description: 'Rewrite for clarity' },
  { action: 'expand', label: 'Expand', icon: <ZapIcon className="h-4 w-4" />, description: 'Add more detail' },
  { action: 'shorten', label: 'Shorten', icon: <EditIcon className="h-4 w-4" />, description: 'Make it concise' },
  { action: 'custom', label: 'Custom', icon: <EditIcon className="h-4 w-4" />, description: 'Custom instruction' },
];

const InlineEditor: React.FC<InlineEditorProps> = ({
  content,
  onChange,
  language,
  sectionContext,
  readOnly = false,
}) => {
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [isRewriting, setIsRewriting] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const handleSelection = useCallback(() => {
    if (readOnly) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !editorRef.current) {
      setShowToolbar(false);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 5) {
      setShowToolbar(false);
      return;
    }

    // Get the range relative to the content
    const range = selection.getRangeAt(0);
    const editorContent = editorRef.current.textContent || '';

    // Find the selection start and end positions
    const preCaretRange = document.createRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    const start = preCaretRange.toString().length;
    const end = start + text.length;

    // Calculate toolbar position
    const rect = range.getBoundingClientRect();
    const editorRect = editorRef.current.getBoundingClientRect();

    setSelectedText(text);
    setSelectionRange({ start, end });
    setToolbarPosition({
      top: rect.top - editorRect.top - 50,
      left: rect.left - editorRect.left + (rect.width / 2),
    });
    setShowToolbar(true);
    setShowCustomInput(false);
    setCustomInstruction('');
  }, [readOnly]);

  useEffect(() => {
    document.addEventListener('mouseup', handleSelection);
    return () => document.removeEventListener('mouseup', handleSelection);
  }, [handleSelection]);

  // Hide toolbar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node) &&
        editorRef.current &&
        !editorRef.current.contains(e.target as Node)
      ) {
        setShowToolbar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRewrite = async (action: RewriteAction) => {
    if (!selectionRange || !selectedText) return;

    if (action === 'custom' && !showCustomInput) {
      setShowCustomInput(true);
      return;
    }

    if (action === 'custom' && !customInstruction.trim()) {
      return;
    }

    setIsRewriting(true);
    try {
      const newText = await rewriteSelection(
        selectedText,
        action,
        sectionContext || content.slice(
          Math.max(0, selectionRange.start - 200),
          Math.min(content.length, selectionRange.end + 200)
        ),
        action === 'custom' ? customInstruction : undefined,
        language
      );

      // Replace the selected text with the new text
      const newContent =
        content.slice(0, selectionRange.start) +
        newText +
        content.slice(selectionRange.end);

      onChange(newContent);
      setShowToolbar(false);
      setSelectedText('');
      setSelectionRange(null);
      setShowCustomInput(false);
      setCustomInstruction('');
    } catch (error) {
      console.error('Error rewriting selection:', error);
    } finally {
      setIsRewriting(false);
    }
  };

  const handleCancelCustom = () => {
    setShowCustomInput(false);
    setCustomInstruction('');
  };

  return (
    <div className="relative">
      {/* Selection hint */}
      {!readOnly && !showToolbar && (
        <div className="text-xs text-gray-600/50 mb-2 flex items-center space-x-1">
          <EditIcon className="h-3 w-3" />
          <span>Select text to rewrite, expand, or shorten</span>
        </div>
      )}

      {/* Editor content */}
      <div
        ref={editorRef}
        className={`prose prose-invert max-w-none ${
          readOnly ? 'cursor-default' : 'cursor-text'
        }`}
        contentEditable={!readOnly && !isRewriting}
        suppressContentEditableWarning
        onBlur={(e) => {
          if (!readOnly && e.currentTarget.textContent !== content) {
            onChange(e.currentTarget.textContent || '');
          }
        }}
        dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br>') }}
      />

      {/* Floating toolbar */}
      {showToolbar && (
        <div
          ref={toolbarRef}
          className="absolute z-50 bg-black/95 border border-white/20 rounded-lg shadow-xl p-2 animate-fade-in"
          style={{
            top: `${Math.max(0, toolbarPosition.top)}px`,
            left: `${toolbarPosition.left}px`,
            transform: 'translateX(-50%)',
          }}
        >
          {!showCustomInput ? (
            <div className="flex items-center space-x-1">
              {rewriteActions.map((item) => (
                <button
                  key={item.action}
                  onClick={() => handleRewrite(item.action)}
                  disabled={isRewriting}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-md text-sm transition-colors ${
                    isRewriting
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-white/10 text-gray-600/80 hover:text-white'
                  }`}
                  title={item.description}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
              {isRewriting && (
                <div className="flex items-center space-x-2 px-3 py-1.5 text-teal">
                  <RefreshCwIcon className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Rewriting...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col space-y-2 min-w-[300px]">
              <input
                type="text"
                value={customInstruction}
                onChange={(e) => setCustomInstruction(e.target.value)}
                placeholder="Enter your instruction, e.g., 'Make it more formal'"
                className="w-full p-2 bg-background border border-white/20 rounded-md text-sm text-gray-600 focus:ring-1 focus:ring-teal"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customInstruction.trim()) {
                    handleRewrite('custom');
                  } else if (e.key === 'Escape') {
                    handleCancelCustom();
                  }
                }}
                disabled={isRewriting}
              />
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => handleRewrite('custom')}
                  disabled={isRewriting || !customInstruction.trim()}
                  size="sm"
                  variant="primary"
                >
                  {isRewriting ? (
                    <>
                      <RefreshCwIcon className="h-4 w-4 mr-1 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    'Apply'
                  )}
                </Button>
                <button
                  onClick={handleCancelCustom}
                  disabled={isRewriting}
                  className="p-2 text-gray-600/50 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InlineEditor;
