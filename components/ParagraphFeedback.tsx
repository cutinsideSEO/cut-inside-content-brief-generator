import React, { useState } from 'react';
import Button from './Button';
import { RefreshCwIcon, EditIcon, XIcon } from './Icon';
import type { ParagraphFeedback as ParagraphFeedbackType } from '../types';

interface ParagraphFeedbackProps {
  paragraphs: string[];
  onRegenerateParagraph: (index: number, feedback: string) => Promise<string>;
  onUpdateParagraph: (index: number, newContent: string) => void;
  isLoading: boolean;
  sectionTitle?: string;
}

const ParagraphFeedback: React.FC<ParagraphFeedbackProps> = ({
  paragraphs,
  onRegenerateParagraph,
  onUpdateParagraph,
  isLoading,
  sectionTitle,
}) => {
  const [activeFeedback, setActiveFeedback] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const handleRegenerateClick = async (index: number) => {
    if (!feedbackText.trim()) return;

    setRegeneratingIndex(index);
    try {
      const newParagraph = await onRegenerateParagraph(index, feedbackText);
      onUpdateParagraph(index, newParagraph);
      setActiveFeedback(null);
      setFeedbackText('');
    } catch (error) {
      console.error('Error regenerating paragraph:', error);
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const handleCancelFeedback = () => {
    setActiveFeedback(null);
    setFeedbackText('');
  };

  return (
    <div className="space-y-4">
      {sectionTitle && (
        <div className="flex items-center space-x-2 text-xs text-gray-600/50 mb-2">
          <EditIcon className="h-3 w-3" />
          <span>Click any paragraph to provide feedback</span>
        </div>
      )}

      {paragraphs.map((paragraph, index) => {
        const isActive = activeFeedback === index;
        const isRegenerating = regeneratingIndex === index;
        const isHovered = hoveredIndex === index;

        return (
          <div
            key={index}
            className="relative group"
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              className={`p-3 rounded-lg transition-all cursor-pointer ${
                isActive
                  ? 'bg-teal/10 border border-teal/50'
                  : isHovered && !isLoading
                  ? 'bg-white/5 border border-white/10'
                  : 'border border-transparent'
              } ${isLoading && !isRegenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if (!isLoading && !isActive) {
                  setActiveFeedback(index);
                }
              }}
            >
              <p className={`text-gray-600 text-sm ${isRegenerating ? 'opacity-50' : ''}`}>
                {paragraph}
              </p>

              {isRegenerating && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <RefreshCwIcon className="h-5 w-5 text-teal animate-spin" />
                </div>
              )}

              {isHovered && !isActive && !isLoading && (
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/80 px-2 py-1 rounded text-xs text-gray-600/60">
                    Click to edit
                  </div>
                </div>
              )}
            </div>

            {isActive && (
              <div className="mt-2 space-y-2 animate-fade-in">
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="What should change? e.g., 'Make it more concise', 'Add more technical detail', 'Change the tone to be friendlier'"
                  className="w-full p-2 bg-background border border-white/20 rounded-md text-sm text-gray-600 h-20 resize-none focus:ring-1 focus:ring-teal"
                  disabled={isRegenerating}
                  autoFocus
                />
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handleRegenerateClick(index)}
                    disabled={isRegenerating || !feedbackText.trim()}
                    size="sm"
                    variant="primary"
                  >
                    {isRegenerating ? (
                      <>
                        <RefreshCwIcon className="h-4 w-4 mr-1 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCwIcon className="h-4 w-4 mr-1" />
                        Regenerate Paragraph
                      </>
                    )}
                  </Button>
                  <button
                    onClick={handleCancelFeedback}
                    disabled={isRegenerating}
                    className="p-2 text-gray-600/50 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ParagraphFeedback;
