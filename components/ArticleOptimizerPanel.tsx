import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import Button from './Button';
import Spinner from './Spinner';
import {
  XIcon,
  CheckIcon,
  AlertTriangleIcon,
  SendIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ZapIcon,
  BarChartIcon,
} from './Icon';
import { Badge, Progress, Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui';
import { validateGeneratedContent, optimizeArticleWithChat } from '../services/geminiService';
import { updateArticleContent } from '../services/articleService';
import { calculateArticleMetrics } from '../utils/articleMetrics';
import { toast } from 'sonner';
import type { ContentBrief, LengthConstraints, ContentValidationResult } from '../types';
import type { SaveStatus } from '../types/appState';
import type { ArticleMetrics } from '../utils/articleMetrics';

interface ArticleOptimizerPanelProps {
  article: { title: string; content: string };
  brief: Partial<ContentBrief>;
  lengthConstraints?: LengthConstraints;
  language: string;
  onApplyChanges: (newContent: string) => void;
  onClose: () => void;
  articleId?: string;
  mode?: 'overlay' | 'inline';
  onSaveStatusChange?: (status: SaveStatus, savedAt?: Date) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

// Format a metric as a compact stat
const StatBox: React.FC<{ label: string; value: string | number; sub?: string; color?: string }> = ({
  label,
  value,
  sub,
  color = 'text-foreground',
}) => (
  <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg border border-gray-100 min-w-0">
    <span className={`text-xl font-bold ${color}`}>{value}</span>
    <span className="text-xs text-muted-foreground mt-0.5">{label}</span>
    {sub && <span className="text-xs text-muted-foreground/70">{sub}</span>}
  </div>
);

// Generate suggested actions based on metrics
function generateSuggestions(
  metrics: ArticleMetrics,
  validationResult: ContentValidationResult | null
): { label: string; instruction: string }[] {
  const suggestions: { label: string; instruction: string; priority: number }[] = [];

  // Word count too low
  if (metrics.targetWordCount > 0 && metrics.wordCount < metrics.targetWordCount * 0.85) {
    suggestions.push({
      label: `Expand article to reach ${metrics.targetWordCount} words`,
      instruction: `The article is currently ${metrics.wordCount} words but the target is ${metrics.targetWordCount} words. Expand the article by adding more depth, examples, and detail to existing sections to reach the target word count. Do not add new sections unless necessary.`,
      priority: 10,
    });
  }

  // Missing sections
  if (metrics.missingSections.length > 0) {
    const sectionList = metrics.missingSections.slice(0, 3).join(', ');
    suggestions.push({
      label: `Add missing sections: ${sectionList}`,
      instruction: `The article is missing these sections from the brief outline: ${metrics.missingSections.join(', ')}. Add these sections with appropriate content following the brief guidelines.`,
      priority: 9,
    });
  }

  // Low keyword density
  const lowKeywords = metrics.keywordMetrics.filter((k) => k.isPrimary && k.density < 0.5);
  if (lowKeywords.length > 0) {
    const kwList = lowKeywords.map((k) => k.keyword).join(', ');
    suggestions.push({
      label: `Improve keyword usage for: ${kwList}`,
      instruction: `These primary keywords have low density and need more natural integration throughout the article: ${kwList}. Add them naturally into existing paragraphs, headings where appropriate, and new sentences.`,
      priority: 8,
    });
  }

  // Long sentences
  if (metrics.avgSentenceLength > 25) {
    suggestions.push({
      label: 'Improve readability (shorter sentences)',
      instruction: `The average sentence length is ${metrics.avgSentenceLength} words, which is too long for web content. Break up long sentences, use shorter paragraphs, and improve overall readability while maintaining the same information.`,
      priority: 6,
    });
  }

  // Brief alignment score
  if (validationResult && validationResult.scores.briefAlignment.score < 70) {
    suggestions.push({
      label: 'Better align content with brief guidelines',
      instruction: `The content has a low brief alignment score (${validationResult.scores.briefAlignment.score}/100). Review the brief guidelines for each section and rewrite to better follow the specified guidelines, keywords, and topics.`,
      priority: 7,
    });
  }

  // Always add a general optimization option
  suggestions.push({
    label: 'Optimize overall quality and SEO',
    instruction: 'Review the entire article and optimize for overall quality, SEO best practices, readability, keyword integration, and adherence to the content brief guidelines.',
    priority: 1,
  });

  // Sort by priority (highest first) and take top 3
  return suggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
    .map(({ label, instruction }) => ({ label, instruction }));
}

// Format metrics into a context string for the AI
function formatMetricsContext(metrics: ArticleMetrics): string {
  let context = `Word count: ${metrics.wordCount}/${metrics.targetWordCount} (${metrics.wordCountPercentage}%)`;
  context += `\nAvg sentence length: ${metrics.avgSentenceLength} words`;
  context += `\nParagraphs: ${metrics.paragraphCount}`;
  context += `\nHeadings: H1=${metrics.headingCount.h1}, H2=${metrics.headingCount.h2}, H3=${metrics.headingCount.h3}`;

  if (metrics.missingSections.length > 0) {
    context += `\nMissing sections: ${metrics.missingSections.join(', ')}`;
  }

  context += '\n\nKeyword metrics:';
  for (const kw of metrics.keywordMetrics) {
    context += `\n- "${kw.keyword}": ${kw.count} occurrences, ${kw.density}% density${kw.isPrimary ? ' (PRIMARY)' : ''}`;
  }

  if (metrics.sectionBreakdown.length > 0) {
    context += '\n\nSection breakdown:';
    for (const section of metrics.sectionBreakdown) {
      const target = section.targetWords > 0 ? ` / target: ${section.targetWords} (${section.percentage}%)` : '';
      context += `\n- ${section.level} "${section.heading}": ${section.actualWords} words${target}`;
    }
  }

  return context;
}

const ArticleOptimizerPanel: React.FC<ArticleOptimizerPanelProps> = ({
  article,
  brief,
  lengthConstraints,
  language,
  onApplyChanges,
  onClose,
  articleId,
  mode = 'overlay',
  onSaveStatusChange,
}) => {
  const [metrics, setMetrics] = useState<ArticleMetrics | null>(null);
  const [validationResult, setValidationResult] = useState<ContentValidationResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [streamedContent, setStreamedContent] = useState('');
  const [pendingContent, setPendingContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSections, setShowSections] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamedContent]);

  // Calculate metrics on mount
  useEffect(() => {
    const m = calculateArticleMetrics(article.content, brief, lengthConstraints);
    setMetrics(m);
  }, [article.content, brief, lengthConstraints]);

  // Run initial AI analysis on mount
  useEffect(() => {
    runInitialAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runInitialAnalysis = useCallback(async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await validateGeneratedContent({
        generatedContent: article.content,
        brief,
        lengthConstraints,
        language,
      });
      setValidationResult(result);

      // Add initial AI message
      setMessages([
        {
          id: `ai-init-${Date.now()}`,
          role: 'assistant',
          content: result.summary,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Analysis failed';
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  }, [article.content, brief, lengthConstraints, language]);

  const suggestions = useMemo(() => {
    if (!metrics) return [];
    return generateSuggestions(metrics, validationResult);
  }, [metrics, validationResult]);

  const handleSendInstruction = useCallback(
    async (instruction: string) => {
      if (!instruction.trim() || isOptimizing || !metrics) return;

      // Add user message
      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: instruction.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setUserInput('');
      setIsOptimizing(true);
      setStreamedContent('');
      setPendingContent(null);
      setError(null);

      // Add streaming AI message placeholder
      const aiMsgId = `ai-stream-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: aiMsgId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          isStreaming: true,
        },
      ]);

      try {
        const metricsContext = formatMetricsContext(metrics);
        let accumulated = '';

        const result = await optimizeArticleWithChat({
          currentArticle: article.content,
          brief,
          lengthConstraints,
          userInstruction: instruction.trim(),
          metricsContext,
          language,
          onStream: (chunk) => {
            accumulated += chunk;
            setStreamedContent(accumulated);
          },
        });

        // Replace streaming message with final message
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? {
                  ...m,
                  content: 'Article rewrite complete. Review the changes and click "Apply Changes" to update your article.',
                  isStreaming: false,
                }
              : m
          )
        );

        setPendingContent(result);
        setStreamedContent('');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Optimization failed';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMsgId
              ? { ...m, content: `Error: ${errorMessage}`, isStreaming: false }
              : m
          )
        );
        setError(errorMessage);
      } finally {
        setIsOptimizing(false);
      }
    },
    [isOptimizing, metrics, article.content, brief, lengthConstraints, language]
  );

  const handleSuggestionClick = useCallback(
    (instruction: string) => {
      handleSendInstruction(instruction);
    },
    [handleSendInstruction]
  );

  const handleSendMessage = useCallback(() => {
    handleSendInstruction(userInput);
  }, [userInput, handleSendInstruction]);

  const handleApplyChanges = useCallback(async () => {
    if (!pendingContent) return;

    // Save to DB if article ID is available
    if (articleId) {
      onSaveStatusChange?.('saving');
      const title = pendingContent.match(/^# (.+)$/m)?.[1] || article.title;
      const { error } = await updateArticleContent(articleId, title, pendingContent);
      if (error) {
        toast.error('Failed to save changes to database');
        onSaveStatusChange?.('error');
        // Still apply locally even if DB save fails
      } else {
        toast.success('Article saved');
        onSaveStatusChange?.('saved', new Date());
      }
    }

    // Apply changes to parent state
    onApplyChanges(pendingContent);

    // Clear pending content but DON'T close — stay open for further optimization
    setPendingContent(null);
    setStreamedContent('');

    // Recalculate metrics with new content (the article prop will update from parent)
  }, [pendingContent, articleId, article.title, onApplyChanges, onSaveStatusChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getWordCountColor = () => {
    if (!metrics || metrics.targetWordCount === 0) return 'text-foreground';
    const pct = metrics.wordCountPercentage;
    if (pct >= 90 && pct <= 110) return 'text-emerald-600';
    if (pct >= 75 && pct <= 125) return 'text-amber-600';
    return 'text-red-600';
  };

  const overallScore = validationResult?.overallScore ?? null;

  return (
    <div className={
      mode === 'inline'
        ? 'flex flex-col h-full bg-white border-l border-gray-200'
        : 'fixed inset-y-0 right-0 w-full md:w-[520px] lg:w-[580px] bg-white border-l border-gray-200 shadow-2xl z-50 flex flex-col animate-slide-in-right'
    }>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2.5">
          <ZapIcon className="h-5 w-5 text-teal" />
          <div>
            <h2 className="text-base font-heading font-bold text-foreground">Article Optimizer</h2>
            <p className="text-xs text-muted-foreground">AI-powered article improvement</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {overallScore !== null && (
            <div
              className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                overallScore >= 80
                  ? 'bg-emerald-100 text-emerald-700'
                  : overallScore >= 60
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {overallScore}/100
            </div>
          )}
          {mode !== 'inline' && (
            <button
              onClick={onClose}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-gray-100 transition-colors"
            >
              <XIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Metrics Dashboard */}
        {metrics && (
          <div className="px-4 py-3 border-b border-gray-200">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <StatBox
                label="Words"
                value={metrics.wordCount.toLocaleString()}
                sub={metrics.targetWordCount > 0 ? `/ ${metrics.targetWordCount.toLocaleString()}` : undefined}
                color={getWordCountColor()}
              />
              <StatBox
                label="Brief Score"
                value={validationResult?.scores.briefAlignment.score ?? '--'}
                sub="/100"
                color={
                  validationResult
                    ? validationResult.scores.briefAlignment.score >= 80
                      ? 'text-emerald-600'
                      : validationResult.scores.briefAlignment.score >= 60
                        ? 'text-amber-600'
                        : 'text-red-600'
                    : 'text-muted-foreground'
                }
              />
              <StatBox
                label="Avg KW Density"
                value={
                  metrics.keywordMetrics.length > 0
                    ? `${(metrics.keywordMetrics.filter((k) => k.isPrimary).reduce((sum, k) => sum + k.density, 0) / Math.max(1, metrics.keywordMetrics.filter((k) => k.isPrimary).length)).toFixed(1)}%`
                    : '--'
                }
                color="text-foreground"
              />
            </div>

            {/* Section breakdown (collapsible) */}
            {metrics.sectionBreakdown.length > 0 && (
              <button
                onClick={() => setShowSections(!showSections)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mt-1"
              >
                {showSections ? (
                  <ChevronUpIcon className="h-3 w-3" />
                ) : (
                  <ChevronDownIcon className="h-3 w-3" />
                )}
                <BarChartIcon className="h-3 w-3" />
                Section breakdown ({metrics.sectionBreakdown.length})
                {metrics.missingSections.length > 0 && (
                  <span className="text-amber-600 ml-1">
                    ({metrics.missingSections.length} missing)
                  </span>
                )}
              </button>
            )}

            {showSections && (
              <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                {metrics.sectionBreakdown.map((section, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground w-6 text-right font-mono">
                      {section.level}
                    </span>
                    <span className="flex-1 truncate text-foreground">{section.heading}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {section.actualWords}
                      {section.targetWords > 0 && `/${section.targetWords}`}
                    </span>
                    {section.targetWords > 0 && (
                      <div className="w-12">
                        <Progress
                          value={Math.min(100, section.percentage)}
                          className="h-1.5"
                        />
                      </div>
                    )}
                  </div>
                ))}
                {metrics.missingSections.length > 0 && (
                  <div className="pt-1.5 border-t border-gray-100">
                    <span className="text-xs font-medium text-amber-600">Missing:</span>
                    {metrics.missingSections.map((s, i) => (
                      <span key={i} className="text-xs text-amber-600/80 ml-1">
                        {s}
                        {i < metrics.missingSections.length - 1 ? ',' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Chat area */}
        <div className="px-4 py-3 space-y-3">
          {/* Loading state */}
          {isAnalyzing && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Spinner />
              <p className="text-muted-foreground mt-3 text-sm">Analyzing article against brief...</p>
            </div>
          )}

          {/* Error state (no results at all) */}
          {error && !validationResult && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-red-600">
              <AlertTriangleIcon className="h-10 w-10 mb-3" />
              <p className="text-sm text-center">{error}</p>
              <Button onClick={runInitialAnalysis} variant="secondary" size="sm" className="mt-3 w-auto">
                Retry
              </Button>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2.5 ${
                  msg.role === 'user'
                    ? 'bg-teal-50 border border-teal-200 text-foreground'
                    : 'bg-gray-50 border border-gray-200 text-foreground'
                }`}
              >
                {msg.isStreaming && !streamedContent ? (
                  <div className="flex items-center gap-2">
                    <RefreshCwIcon className="h-3.5 w-3.5 text-teal animate-spin" />
                    <span className="text-sm text-muted-foreground">Rewriting article...</span>
                  </div>
                ) : (
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                )}
                <span className="text-xs text-muted-foreground/60 mt-1 block">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {/* Streaming preview */}
          {isOptimizing && streamedContent && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCwIcon className="h-3.5 w-3.5 text-teal animate-spin" />
                <span className="text-xs font-medium text-muted-foreground">Rewriting article...</span>
                <span className="text-xs text-muted-foreground/60">
                  {streamedContent.trim().split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto text-xs text-muted-foreground font-mono whitespace-pre-wrap">
                {streamedContent.slice(-500)}
              </div>
            </div>
          )}

          {/* Suggested actions */}
          {!isOptimizing && !pendingContent && suggestions.length > 0 && messages.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Suggested actions:</span>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSuggestionClick(s.instruction)}
                    className="text-xs px-2.5 py-1.5 rounded-md bg-teal-50 text-teal border border-teal-200 hover:bg-teal-100 transition-colors text-left"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Apply changes prompt */}
          {pendingContent && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <CheckIcon className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">Rewrite complete</span>
              </div>
              <p className="text-xs text-emerald-600 mb-3">
                New article: {pendingContent.trim().split(/\s+/).filter(Boolean).length} words.
                Click below to replace the current article.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleApplyChanges} variant="primary" size="sm" className="flex-1">
                  <CheckIcon className="h-4 w-4 mr-1" />
                  {articleId ? 'Apply & Save' : 'Apply Changes'}
                </Button>
                <Button
                  onClick={() => setPendingContent(null)}
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                >
                  Discard
                </Button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <div className="flex gap-2">
          <textarea
            ref={textareaRef}
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Describe how to improve the article..."
            className="flex-1 p-2.5 bg-white border border-gray-200 rounded-lg text-sm text-foreground resize-none h-16 focus:ring-1 focus:ring-teal focus:border-teal placeholder:text-muted-foreground/60"
            disabled={isOptimizing}
          />
          <button
            onClick={handleSendMessage}
            disabled={isOptimizing || !userInput.trim()}
            className="px-3.5 bg-teal-50 hover:bg-teal-100 disabled:bg-gray-100 disabled:text-gray-300 text-teal rounded-lg transition-colors border border-teal-200 disabled:border-gray-200"
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ArticleOptimizerPanel;
