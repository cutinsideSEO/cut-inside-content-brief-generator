import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Spinner from '../Spinner';
import Button from '../Button';
import InlineEditor from '../InlineEditor';
import ContentValidationPanel from '../ContentValidationPanel';
import { BrainCircuitIcon, AlertTriangleIcon, CheckIcon, RefreshCwIcon, EditIcon, XIcon, ZapIcon, FileTextIcon, ShieldCheckIcon } from '../Icon';
import { exportArticleToMarkdown } from '../../services/markdownService';
import { useSound } from '../../App';
import type { ContentBrief, LengthConstraints } from '../../types';

interface ContentGenerationScreenProps {
  isLoading: boolean;
  progress: { currentSection: string; currentIndex: number; total: number } | null;
  article: { title: string; content: string } | null;
  setArticle: (article: { title: string; content: string } | null) => void;
  error: string | null;
  onBack: () => void;
  onRegenerateParagraph?: (fullContent: string, paragraphIndex: number, feedback: string) => Promise<string>;
  language?: string;
  briefData?: Partial<ContentBrief>;
  lengthConstraints?: LengthConstraints;
}

// Parse markdown into structured elements for paragraph-level editing
interface MarkdownElement {
  type: 'h1' | 'h2' | 'h3' | 'paragraph';
  content: string;
  originalIndex: number;
}

const parseMarkdownToElements = (markdown: string): MarkdownElement[] => {
  const lines = markdown.split('\n');
  const elements: MarkdownElement[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith('### ')) {
      elements.push({ type: 'h3', content: line.substring(4), originalIndex: i });
    } else if (line.startsWith('## ')) {
      elements.push({ type: 'h2', content: line.substring(3), originalIndex: i });
    } else if (line.startsWith('# ')) {
      elements.push({ type: 'h1', content: line.substring(2), originalIndex: i });
    } else if (line.trim() !== '') {
      elements.push({ type: 'paragraph', content: line, originalIndex: i });
    }
  });

  return elements;
};

// Interactive markdown preview with paragraph-level feedback
interface InteractiveMarkdownPreviewProps {
  markdown: string;
  onParagraphRegenerate?: (paragraphIndex: number, feedback: string) => Promise<void>;
  isRegenerating: boolean;
  regeneratingIndex: number | null;
}

const InteractiveMarkdownPreview: React.FC<InteractiveMarkdownPreviewProps> = ({
  markdown,
  onParagraphRegenerate,
  isRegenerating,
  regeneratingIndex,
}) => {
  const [activeFeedback, setActiveFeedback] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const elements = useMemo(() => parseMarkdownToElements(markdown), [markdown]);

  const handleRegenerateClick = async (index: number) => {
    if (!feedbackText.trim() || !onParagraphRegenerate) return;

    try {
      await onParagraphRegenerate(index, feedbackText);
      setActiveFeedback(null);
      setFeedbackText('');
    } catch (error) {
      console.error('Error regenerating paragraph:', error);
    }
  };

  const handleCancelFeedback = () => {
    setActiveFeedback(null);
    setFeedbackText('');
  };

  return (
    <div className="prose space-y-2">
      {onParagraphRegenerate && (
        <div className="flex items-center space-x-2 text-xs text-grey/50 mb-4 pb-2 border-b border-white/10">
          <EditIcon className="h-3 w-3" />
          <span>Click any paragraph to provide feedback and regenerate</span>
        </div>
      )}

      {elements.map((element, idx) => {
        const isActive = activeFeedback === idx;
        const isHovered = hoveredIndex === idx;
        const isThisRegenerating = regeneratingIndex === idx;
        const isParagraph = element.type === 'paragraph';
        const canEdit = isParagraph && onParagraphRegenerate;

        const baseClasses = {
          h1: 'text-4xl font-heading font-bold',
          h2: 'text-2xl font-heading font-bold mt-6 border-b border-white/10 pb-2',
          h3: 'text-xl font-heading font-semibold mt-4',
          paragraph: 'mt-4 text-grey/90 leading-relaxed',
        };

        const Tag = element.type === 'paragraph' ? 'p' : element.type;

        return (
          <div
            key={idx}
            className={`relative group ${canEdit ? 'cursor-pointer' : ''}`}
            onMouseEnter={() => canEdit && setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div
              className={`rounded-lg transition-all ${
                isActive
                  ? 'bg-teal/10 border border-teal/50 p-3 -mx-3'
                  : isHovered && canEdit && !isRegenerating
                  ? 'bg-white/5 border border-white/10 p-3 -mx-3'
                  : ''
              } ${isRegenerating && !isThisRegenerating ? 'opacity-50' : ''}`}
              onClick={() => {
                if (canEdit && !isRegenerating && !isActive) {
                  setActiveFeedback(idx);
                }
              }}
            >
              <Tag className={`${baseClasses[element.type]} ${isThisRegenerating ? 'opacity-50' : ''}`}>
                {element.content}
              </Tag>

              {isThisRegenerating && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  <RefreshCwIcon className="h-5 w-5 text-teal animate-spin" />
                </div>
              )}

              {isHovered && canEdit && !isActive && !isRegenerating && (
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-black/80 px-2 py-1 rounded text-xs text-grey/60">
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
                  placeholder="What should change? e.g., 'Make it more concise', 'Add more detail', 'Change the tone'"
                  className="w-full p-2 bg-black border border-white/20 rounded-md text-sm text-grey h-20 resize-none focus:ring-1 focus:ring-teal"
                  disabled={isThisRegenerating}
                  autoFocus
                />
                <div className="flex items-center space-x-2">
                  <Button
                    onClick={() => handleRegenerateClick(idx)}
                    disabled={isThisRegenerating || !feedbackText.trim()}
                    size="sm"
                    variant="primary"
                  >
                    {isThisRegenerating ? (
                      <>
                        <RefreshCwIcon className="h-4 w-4 mr-1 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCwIcon className="h-4 w-4 mr-1" />
                        Regenerate
                      </>
                    )}
                  </Button>
                  <button
                    onClick={handleCancelFeedback}
                    disabled={isThisRegenerating}
                    className="p-2 text-grey/50 hover:text-white rounded-full hover:bg-white/10 transition-colors"
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

// A simple component to render basic markdown for preview (fallback)
const SimpleMarkdownPreview: React.FC<{ markdown: string }> = ({ markdown }) => {
    const lines = markdown.split('\n');
    const elements = lines.map((line, i) => {
        if (line.startsWith('### ')) return <h3 key={i} className="text-xl font-heading font-semibold mt-4">{line.substring(4)}</h3>;
        if (line.startsWith('## ')) return <h2 key={i} className="text-2xl font-heading font-bold mt-6 border-b border-white/10 pb-2">{line.substring(3)}</h2>;
        if (line.startsWith('# ')) return <h1 key={i} className="text-4xl font-heading font-bold">{line.substring(2)}</h1>;
        if (line.trim() === '') return null; // Don't render empty paragraphs
        return <p key={i} className="mt-4 text-grey/90 leading-relaxed">{line}</p>;
    }).filter(Boolean);

    return <div className="prose">{elements}</div>;
};

type EditMode = 'paragraph' | 'selection' | 'raw';

const ContentGenerationScreen: React.FC<ContentGenerationScreenProps> = ({
  isLoading,
  progress,
  article,
  setArticle,
  error,
  onBack,
  onRegenerateParagraph,
  language = 'English',
  briefData,
  lengthConstraints,
}) => {
  const [showCelebration, setShowCelebration] = useState(true);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [editMode, setEditMode] = useState<EditMode>('paragraph');
  const [showValidationPanel, setShowValidationPanel] = useState(false);
  const sound = useSound();

  // Handle content change from InlineEditor
  const handleInlineEditorChange = useCallback((newContent: string) => {
    if (article) {
      setArticle({ ...article, content: newContent });
    }
  }, [article, setArticle]);

  // Handle validation panel apply changes
  const handleValidationApplyChanges = useCallback((newContent: string) => {
    if (article) {
      // Preserve the title when updating content
      setArticle({ ...article, content: newContent });
    }
  }, [article, setArticle]);

  // Handle paragraph regeneration
  const handleParagraphRegenerate = async (elementIndex: number, feedback: string) => {
    if (!article || !onRegenerateParagraph) return;

    setIsRegenerating(true);
    setRegeneratingIndex(elementIndex);

    try {
      // Parse the content to find the actual paragraph
      const elements = parseMarkdownToElements(article.content);
      const targetElement = elements[elementIndex];

      if (targetElement && targetElement.type === 'paragraph') {
        // Get the new paragraph from the regeneration function
        const newParagraph = await onRegenerateParagraph(
          article.content,
          targetElement.originalIndex,
          feedback
        );

        // Replace the paragraph in the content
        const lines = article.content.split('\n');
        lines[targetElement.originalIndex] = newParagraph;
        const newContent = lines.join('\n');

        setArticle({ ...article, content: newContent });
      }
    } catch (error) {
      console.error('Error regenerating paragraph:', error);
    } finally {
      setIsRegenerating(false);
      setRegeneratingIndex(null);
    }
  };
  
  // Show celebration for 3s then show the editor
  useEffect(() => {
    if (!isLoading && article) {
        sound?.playSound('success');
        const timer = setTimeout(() => setShowCelebration(false), 3000);
        return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, article]);

  const handleDownload = () => {
    if (article) {
      exportArticleToMarkdown(article);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (article) {
        // Re-add the title H1 to the content for saving/export
        const fullContent = `# ${article.title}\n\n${e.target.value}`;
        setArticle({ ...article, content: fullContent });
    }
  };
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (article) {
          // Find content without the old title and prepend the new one
          const bodyContent = article.content.substring(article.content.indexOf('\n\n') + 2);
          const newFullContent = `# ${e.target.value}\n\n${bodyContent}`;
          setArticle({ title: e.target.value, content: newFullContent });
      }
  }

  if (isLoading) {
    const percentage = progress ? Math.round((progress.currentIndex / progress.total) * 100) : 0;
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <Spinner />
        <h1 className="text-2xl font-heading font-bold text-grey mt-6">AI is Writing Your Article...</h1>
        <p className="text-md text-grey/70">This is a profound process and may take several minutes.</p>
        
        {progress && (
            <div className="w-full max-w-lg mt-8">
                <div className="flex justify-between mb-1">
                    <span className="text-base font-medium text-teal">{`Section ${progress.currentIndex} of ${progress.total}`}</span>
                    <span className="text-sm font-medium text-teal">{percentage}%</span>
                </div>
                <div className="w-full bg-grey/10 rounded-full h-2.5">
                    <div className="bg-teal h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                </div>
                <p className="text-sm text-grey/60 mt-2 truncate">Writing: {progress.currentSection}</p>
            </div>
        )}
      </div>
    );
  }

  if (error && !article) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center text-red-400">
        <AlertTriangleIcon className="h-12 w-12 mb-4" />
        <h1 className="text-2xl font-heading font-bold">Content Generation Failed</h1>
        <p className="text-md text-red-300/80 mt-2 max-w-xl">{error}</p>
        <Button onClick={onBack} variant="secondary" className="mt-6 w-auto">
          Back to Dashboard
        </Button>
      </div>
    );
  }
  
  if (!article) {
    return (
        <div className="text-center min-h-[70vh] flex flex-col items-center justify-center">
            <h1 className="text-2xl font-heading font-bold text-grey">No article generated.</h1>
             <Button onClick={onBack} variant="secondary" className="mt-6 w-auto">
                Back to Dashboard
            </Button>
        </div>
    );
  }

  if (showCelebration) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center celebration-container">
              <div className="celebration-icon w-24 h-24 rounded-full bg-teal flex items-center justify-center shadow-glow-teal mb-4">
                  <CheckIcon className="h-16 w-16 text-black"/>
              </div>
              <h1 className="text-3xl font-heading font-bold text-grey">Strategy Deployed.</h1>
              <p className="text-xl text-grey/80">Content Ready.</p>
          </div>
      )
  }

  return (
    <div className="animate-fade-in">
        <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
                <BrainCircuitIcon className="h-8 w-8 text-teal" />
                <div>
                    <h1 className="text-2xl font-heading font-bold text-grey">Generated Article</h1>
                    <p className="text-md text-grey/70">Review, edit, and download your content.</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <Button onClick={onBack} variant="secondary" size="sm" className="w-auto">Back to Dashboard</Button>
                {briefData && (
                  <Button
                    onClick={() => setShowValidationPanel(true)}
                    variant="outline"
                    size="sm"
                    className="w-auto"
                  >
                    <ShieldCheckIcon className="h-4 w-4 mr-2" />
                    Validate Against Brief
                  </Button>
                )}
                <Button onClick={handleDownload} variant="primary" size="sm" className="w-auto shadow-glow-teal">Download .md</Button>
            </div>
        </div>
        
        <div className="mb-4">
            <label className="block text-sm font-heading font-medium text-grey/80 mb-1">Article Title (H1)</label>
             <input 
                type="text"
                value={article.title}
                onChange={handleTitleChange}
                className="w-full p-3 bg-black border border-white/20 rounded-md text-grey font-heading text-xl font-bold focus:ring-2 focus:ring-teal"
             />
        </div>

        {/* Edit Mode Toggle */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-grey/60">Edit Mode:</span>
          <div className="flex bg-black/50 rounded-lg p-1 border border-white/10">
            <button
              onClick={() => setEditMode('paragraph')}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1 ${
                editMode === 'paragraph'
                  ? 'bg-teal text-black font-semibold'
                  : 'text-grey/70 hover:text-white hover:bg-white/10'
              }`}
              title="Click paragraphs to regenerate with AI feedback"
            >
              <EditIcon className="h-3 w-3" />
              Paragraph
            </button>
            <button
              onClick={() => setEditMode('selection')}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1 ${
                editMode === 'selection'
                  ? 'bg-teal text-black font-semibold'
                  : 'text-grey/70 hover:text-white hover:bg-white/10'
              }`}
              title="Select any text to rewrite, expand, or shorten"
            >
              <ZapIcon className="h-3 w-3" />
              Selection
            </button>
            <button
              onClick={() => setEditMode('raw')}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1 ${
                editMode === 'raw'
                  ? 'bg-teal text-black font-semibold'
                  : 'text-grey/70 hover:text-white hover:bg-white/10'
              }`}
              title="Direct markdown editing"
            >
              <FileTextIcon className="h-3 w-3" />
              Raw
            </button>
          </div>
          <span className="text-xs text-grey/50 ml-2">
            {editMode === 'paragraph' && 'Click paragraphs to regenerate with AI'}
            {editMode === 'selection' && 'Select text to rewrite, expand, or shorten'}
            {editMode === 'raw' && 'Edit markdown directly'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[65vh]">
             <div>
                 <label className="block text-sm font-heading font-medium text-grey/80 mb-1">Editor (Markdown)</label>
                <textarea
                    value={article.content.substring(article.content.indexOf('\n\n') + 2)} // Hide the H1 from text area
                    onChange={handleContentChange}
                    className="w-full h-full p-4 bg-black border border-white/20 rounded-md text-grey font-mono text-sm leading-relaxed focus:ring-2 focus:ring-teal resize-none"
                    spellCheck="false"
                />
            </div>
             <div className="h-full overflow-y-auto">
                 <label className="block text-sm font-heading font-medium text-grey/80 mb-1">
                   {editMode === 'paragraph' && 'Interactive Preview (Click paragraphs to edit)'}
                   {editMode === 'selection' && 'Selection Mode (Select text to rewrite)'}
                   {editMode === 'raw' && 'Live Preview'}
                 </label>
                 <div className="w-full h-full p-4 bg-black border border-white/20 rounded-md overflow-y-auto">
                     {editMode === 'paragraph' && onRegenerateParagraph ? (
                       <InteractiveMarkdownPreview
                         markdown={article.content}
                         onParagraphRegenerate={handleParagraphRegenerate}
                         isRegenerating={isRegenerating}
                         regeneratingIndex={regeneratingIndex}
                       />
                     ) : editMode === 'selection' ? (
                       <InlineEditor
                         content={article.content}
                         onChange={handleInlineEditorChange}
                         language={language}
                         sectionContext={article.title}
                       />
                     ) : (
                       <SimpleMarkdownPreview markdown={article.content} />
                     )}
                 </div>
            </div>
        </div>

        {/* Validation Panel */}
        {showValidationPanel && article && briefData && (
          <ContentValidationPanel
            article={article}
            brief={briefData}
            lengthConstraints={lengthConstraints}
            language={language}
            onApplyChanges={handleValidationApplyChanges}
            onClose={() => setShowValidationPanel(false)}
          />
        )}
    </div>
  );
};

export default ContentGenerationScreen;