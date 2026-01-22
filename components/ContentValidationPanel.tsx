import React, { useState, useCallback, useEffect, useRef } from 'react';
import Button from './Button';
import Spinner from './Spinner';
import {
  XIcon,
  CheckIcon,
  AlertTriangleIcon,
  AlertCircleIcon,
  LightbulbIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronRightIcon,
  SendIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
} from './Icon';
import { validateGeneratedContent } from '../services/geminiService';
import type { ContentBrief, LengthConstraints, ContentValidationResult, ProposedChange, ValidationMessage } from '../types';

interface ContentValidationPanelProps {
  article: { title: string; content: string };
  brief: Partial<ContentBrief>;
  lengthConstraints?: LengthConstraints;
  language: string;
  onApplyChanges: (newContent: string) => void;
  onClose: () => void;
}

// Score badge color helper
const getScoreColor = (score: number): string => {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  return 'bg-red-500';
};

const getScoreTextColor = (score: number): string => {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  return 'text-red-400';
};

// Severity badge component
const SeverityBadge: React.FC<{ severity: ProposedChange['severity'] }> = ({ severity }) => {
  const config = {
    critical: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/50', icon: AlertCircleIcon },
    warning: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/50', icon: AlertTriangleIcon },
    suggestion: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/50', icon: LightbulbIcon },
  };
  const { bg, text, border, icon: Icon } = config[severity];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${bg} ${text} border ${border}`}>
      <Icon className="h-3 w-3" />
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
};

// Score bar component
const ScoreBar: React.FC<{ label: string; score: number; explanation?: string }> = ({ label, score, explanation }) => {
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          className="text-sm text-grey/80 hover:text-white flex items-center gap-1 transition-colors"
        >
          {showExplanation ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
          {label}
        </button>
        <span className={`text-sm font-bold ${getScoreTextColor(score)}`}>{score}/100</span>
      </div>
      <div className="w-full bg-grey/20 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${getScoreColor(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
      {showExplanation && explanation && (
        <p className="text-xs text-grey/60 mt-1 pl-4 border-l border-white/10">{explanation}</p>
      )}
    </div>
  );
};

// Proposed change card component
const ProposedChangeCard: React.FC<{
  change: ProposedChange;
  isSelected: boolean;
  onToggle: () => void;
}> = ({ change, isSelected, onToggle }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`border rounded-lg p-3 mb-2 transition-all ${
        isSelected
          ? 'border-teal/50 bg-teal/10'
          : 'border-white/10 bg-white/5 hover:border-white/20'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="mt-1 h-4 w-4 rounded border-grey/30 bg-black text-teal focus:ring-teal"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <SeverityBadge severity={change.severity} />
            {change.location.sectionHeading && (
              <span className="text-xs text-grey/50 truncate">
                in "{change.location.sectionHeading}"
              </span>
            )}
          </div>
          <p className="text-sm text-grey/90">{change.description}</p>

          {(change.currentText || change.proposedText) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-teal hover:text-teal/80 mt-2 flex items-center gap-1"
            >
              {expanded ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
              {expanded ? 'Hide diff' : 'Show diff'}
            </button>
          )}

          {expanded && (
            <div className="mt-2 space-y-2 animate-fade-in">
              {change.currentText && (
                <div className="bg-red-500/10 border border-red-500/30 rounded p-2">
                  <span className="text-xs text-red-400 font-medium block mb-1">Current:</span>
                  <p className="text-xs text-grey/80 whitespace-pre-wrap">{change.currentText}</p>
                </div>
              )}
              {change.proposedText && (
                <div className="bg-green-500/10 border border-green-500/30 rounded p-2">
                  <span className="text-xs text-green-400 font-medium block mb-1">Proposed:</span>
                  <p className="text-xs text-grey/80 whitespace-pre-wrap">{change.proposedText}</p>
                </div>
              )}
              <div className="bg-white/5 border border-white/10 rounded p-2">
                <span className="text-xs text-grey/60 font-medium block mb-1">Reasoning:</span>
                <p className="text-xs text-grey/70">{change.reasoning}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Message bubble component
const MessageBubble: React.FC<{ message: ValidationMessage }> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className={`max-w-[85%] rounded-lg p-3 ${
          isUser
            ? 'bg-teal/20 border border-teal/30'
            : 'bg-white/5 border border-white/10'
        }`}
      >
        <p className="text-sm text-grey/90 whitespace-pre-wrap">{message.content}</p>
        <span className="text-xs text-grey/50 mt-1 block">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
};

const ContentValidationPanel: React.FC<ContentValidationPanelProps> = ({
  article,
  brief,
  lengthConstraints,
  language,
  onApplyChanges,
  onClose,
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [isApplyingChanges, setIsApplyingChanges] = useState(false);
  const [validationResult, setValidationResult] = useState<ContentValidationResult | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ValidationMessage[]>([]);
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set());
  const [userMessage, setUserMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory]);

  // Initial validation on mount
  useEffect(() => {
    runValidation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runValidation = useCallback(async (userInstructions?: string) => {
    setIsValidating(true);
    setError(null);

    try {
      const result = await validateGeneratedContent({
        generatedContent: article.content,
        brief,
        lengthConstraints,
        userInstructions,
        previousValidation: validationResult || undefined,
        language,
      });

      setValidationResult(result);

      // Select all changes by default
      const allChangeIds = new Set(result.proposedChanges.map((c) => c.id));
      setSelectedChanges(allChangeIds);

      // Add AI response to conversation
      const aiMessage: ValidationMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: result.summary,
        timestamp: new Date(),
        validationResult: result,
      };
      setConversationHistory((prev) => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Validation failed';
      setError(errorMessage);
    } finally {
      setIsValidating(false);
    }
  }, [article.content, brief, lengthConstraints, language, validationResult]);

  const handleSendMessage = useCallback(async () => {
    if (!userMessage.trim() || isValidating) return;

    // Add user message to conversation
    const userMsg: ValidationMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userMessage.trim(),
      timestamp: new Date(),
    };
    setConversationHistory((prev) => [...prev, userMsg]);
    setUserMessage('');

    // Re-run validation with user instructions
    await runValidation(userMessage.trim());
  }, [userMessage, isValidating, runValidation]);

  const handleToggleChange = useCallback((changeId: string) => {
    setSelectedChanges((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(changeId)) {
        newSet.delete(changeId);
      } else {
        newSet.add(changeId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (validationResult) {
      setSelectedChanges(new Set(validationResult.proposedChanges.map((c) => c.id)));
    }
  }, [validationResult]);

  const handleDeselectAll = useCallback(() => {
    setSelectedChanges(new Set());
  }, []);

  const handleApplyChanges = useCallback(() => {
    if (!validationResult || selectedChanges.size === 0) return;

    setIsApplyingChanges(true);

    let newContent = article.content;

    // Sort changes by paragraph index descending to avoid index shifting
    const changesToApply = validationResult.proposedChanges
      .filter((c) => selectedChanges.has(c.id) && c.currentText && c.proposedText)
      .sort((a, b) => (b.location.paragraphIndex || 0) - (a.location.paragraphIndex || 0));

    // Apply each change
    for (const change of changesToApply) {
      if (change.currentText && change.proposedText) {
        // Use simple string replacement - will replace first occurrence
        newContent = newContent.replace(change.currentText, change.proposedText);
      }
    }

    onApplyChanges(newContent);
    setIsApplyingChanges(false);
    onClose();
  }, [validationResult, selectedChanges, article.content, onApplyChanges, onClose]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const selectedCount = selectedChanges.size;
  const totalChanges = validationResult?.proposedChanges.length || 0;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[500px] lg:w-[550px] bg-black border-l border-white/20 shadow-2xl z-50 flex flex-col animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <ShieldCheckIcon className="h-6 w-6 text-teal" />
          <div>
            <h2 className="text-lg font-heading font-bold text-grey">Content Validation</h2>
            <p className="text-xs text-grey/60">AI analysis against brief</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {validationResult && (
            <div
              className={`px-3 py-1 rounded-full text-sm font-bold text-black ${getScoreColor(
                validationResult.overallScore
              )}`}
            >
              {validationResult.overallScore}/100
            </div>
          )}
          <button
            onClick={onClose}
            className="p-2 text-grey/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {isValidating && conversationHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Spinner />
            <p className="text-grey/70 mt-4">Analyzing content against brief...</p>
          </div>
        ) : error && !validationResult ? (
          <div className="flex flex-col items-center justify-center h-full text-red-400">
            <AlertTriangleIcon className="h-12 w-12 mb-4" />
            <p className="text-center">{error}</p>
            <Button onClick={() => runValidation()} variant="secondary" size="sm" className="mt-4 w-auto">
              Retry
            </Button>
          </div>
        ) : (
          <>
            {/* Score bars */}
            {validationResult && (
              <div className="mb-6 pb-4 border-b border-white/10">
                <h3 className="text-sm font-heading font-semibold text-grey/80 mb-3">Quality Scores</h3>
                <ScoreBar
                  label="Brief Alignment"
                  score={validationResult.scores.briefAlignment.score}
                  explanation={validationResult.scores.briefAlignment.explanation}
                />
                <ScoreBar
                  label="Structure Adherence"
                  score={validationResult.scores.structureAdherence.score}
                  explanation={validationResult.scores.structureAdherence.explanation}
                />
                <ScoreBar
                  label="Keyword Usage"
                  score={validationResult.scores.keywordUsage.score}
                  explanation={validationResult.scores.keywordUsage.explanation}
                />
                <ScoreBar
                  label="Paragraph Quality"
                  score={validationResult.scores.paragraphLengths.score}
                  explanation={validationResult.scores.paragraphLengths.explanation}
                />
                <div className="flex items-center justify-between text-sm text-grey/70 mt-2">
                  <span>Word Count</span>
                  <span>
                    {validationResult.scores.totalWordCount.actual} /{' '}
                    {validationResult.scores.totalWordCount.target} words
                  </span>
                </div>
              </div>
            )}

            {/* Conversation history */}
            <div className="space-y-2 mb-4">
              {conversationHistory.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {isValidating && conversationHistory.length > 0 && (
                <div className="flex justify-start mb-3">
                  <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex items-center gap-2">
                    <RefreshCwIcon className="h-4 w-4 text-teal animate-spin" />
                    <span className="text-sm text-grey/70">Re-analyzing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Proposed changes */}
            {validationResult && validationResult.proposedChanges.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-heading font-semibold text-grey/80">
                    Proposed Changes ({selectedCount}/{totalChanges} selected)
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="text-xs text-teal hover:text-teal/80"
                    >
                      Select all
                    </button>
                    <span className="text-grey/30">|</span>
                    <button
                      onClick={handleDeselectAll}
                      className="text-xs text-grey/60 hover:text-grey/80"
                    >
                      Deselect all
                    </button>
                  </div>
                </div>
                {validationResult.proposedChanges.map((change) => (
                  <ProposedChangeCard
                    key={change.id}
                    change={change}
                    isSelected={selectedChanges.has(change.id)}
                    onToggle={() => handleToggleChange(change.id)}
                  />
                ))}
              </div>
            )}

            {validationResult && validationResult.proposedChanges.length === 0 && (
              <div className="text-center py-8 text-grey/60">
                <CheckIcon className="h-12 w-12 mx-auto mb-2 text-green-400" />
                <p>No issues found! Your content aligns well with the brief.</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-white/10 p-4">
        <div className="flex gap-2 mb-3">
          <textarea
            ref={textareaRef}
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add instructions or ask for changes..."
            className="flex-1 p-2 bg-black border border-white/20 rounded-lg text-sm text-grey resize-none h-16 focus:ring-1 focus:ring-teal focus:border-teal"
            disabled={isValidating}
          />
          <button
            onClick={handleSendMessage}
            disabled={isValidating || !userMessage.trim()}
            className="px-4 bg-teal/20 hover:bg-teal/30 disabled:bg-grey/10 disabled:text-grey/30 text-teal rounded-lg transition-colors"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="secondary"
            size="sm"
            className="flex-1"
            disabled={isApplyingChanges}
          >
            Keep As-Is
          </Button>
          <Button
            onClick={handleApplyChanges}
            variant="primary"
            size="sm"
            className="flex-1"
            disabled={isApplyingChanges || selectedCount === 0 || isValidating}
          >
            {isApplyingChanges ? (
              <>
                <RefreshCwIcon className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4 mr-2" />
                Apply Selected ({selectedCount})
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContentValidationPanel;
