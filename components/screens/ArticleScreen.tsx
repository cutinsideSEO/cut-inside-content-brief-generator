import React, { useState, useEffect, useCallback, useMemo } from 'react';
import DOMPurify from 'dompurify';
import { getArticle } from '../../services/articleService';
import { getBrief } from '../../services/briefService';
import { exportArticleToMarkdown, copyArticleToClipboardRich } from '../../services/markdownService';
import { toast } from 'sonner';
import type { BriefArticle } from '../../types/database';
import type { ContentBrief, LengthConstraints } from '../../types';
import type { SaveStatus } from '../../types/appState';
import Button from '../Button';
import SaveStatusIndicator from '../SaveStatusIndicator';
import { Badge, Skeleton, Alert, Collapsible, CollapsibleTrigger, CollapsibleContent, Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui';
import { ChevronDownIcon, ChevronUpIcon, CopyIcon, ZapIcon } from '../Icon';
import ArticleOptimizerPanel from '../ArticleOptimizerPanel';

// --- Inline SVG icons not available in Icon.tsx ---

const ArrowLeftIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19 12H5" />
    <path d="m12 19-7-7 7-7" />
  </svg>
);

const DownloadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

// --- Props ---

interface ArticleScreenProps {
  /** Mode 1: Load from DB (past articles) - provide articleId */
  articleId?: string;
  /** Mode 2: Just-generated article - provide article + articleDbId */
  article?: { title: string; content: string };
  /** DB ID of the article (used after saving a just-generated article) */
  articleDbId?: string;
  /** Brief context for the optimizer */
  briefData?: Partial<ContentBrief>;
  /** Length constraints from the brief */
  lengthConstraints?: LengthConstraints;
  /** Content language */
  language?: string;
  /** Navigation callback */
  onBack: () => void;
  /** Notify parent when article content changes (e.g., after optimizer applies) */
  onArticleChange?: (article: { title: string; content: string }) => void;
}

// --- Types ---

interface ParsedSection {
  /** H2 heading text */
  heading: string;
  /** Raw markdown content under this H2 (excluding the H2 line itself) */
  body: string;
  /** Index of this section in the flat list (for collapse tracking) */
  index: number;
}

// --- Helpers ---

/**
 * Parse article markdown into H2-level sections.
 * Content before the first H2 goes into a "preamble" section with an empty heading.
 */
function parseIntoSections(markdown: string): ParsedSection[] {
  const lines = markdown.split('\n');
  const sections: ParsedSection[] = [];
  let currentHeading = '';
  let currentBodyLines: string[] = [];
  let sectionIndex = 0;

  const flushSection = () => {
    const body = currentBodyLines.join('\n').trim();
    if (currentHeading || body) {
      sections.push({ heading: currentHeading, body, index: sectionIndex++ });
    }
    currentBodyLines = [];
  };

  for (const line of lines) {
    // Skip H1 headings (displayed in the header)
    if (/^# (?!#)/.test(line)) {
      continue;
    }

    if (/^## (?!#)/.test(line)) {
      flushSection();
      currentHeading = line.replace(/^## /, '').trim();
    } else {
      currentBodyLines.push(line);
    }
  }
  flushSection();

  return sections;
}

/**
 * Convert a section body (markdown fragment) to sanitized HTML.
 * Handles H3, bold, italic, bullet lists, numbered lists, links, and paragraphs.
 */
function markdownToHtml(text: string): string {
  if (!text) return '';

  let html = text
    // H3 headings
    .replace(
      /^### (.+)$/gm,
      '<h3 class="text-lg font-heading font-semibold text-gray-900 mt-5 mb-2">$1</h3>'
    )
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic (single asterisks that are not part of bold)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Links [text](url)
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-teal hover:underline">$1</a>'
    )
    // Unordered list items
    .replace(/^- (.+)$/gm, '<li class="ml-5 list-disc text-gray-600 leading-relaxed">$1</li>')
    // Ordered list items
    .replace(
      /^(\d+)\. (.+)$/gm,
      '<li class="ml-5 list-decimal text-gray-600 leading-relaxed">$2</li>'
    );

  // Wrap consecutive <li> items in <ul>/<ol>
  html = html.replace(
    /((?:<li class="ml-5 list-disc[^>]*>.*?<\/li>\n?)+)/g,
    '<ul class="my-2 space-y-1">$1</ul>'
  );
  html = html.replace(
    /((?:<li class="ml-5 list-decimal[^>]*>.*?<\/li>\n?)+)/g,
    '<ol class="my-2 space-y-1">$1</ol>'
  );

  // Wrap remaining non-tag lines in <p> tags
  html = html
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      if (/^<(h[1-6]|ul|ol|li|div|p|blockquote)/.test(trimmed)) return trimmed;
      return '<p class="text-gray-600 leading-relaxed mb-3">' + trimmed + '</p>';
    })
    .join('\n');

  return DOMPurify.sanitize(html);
}

/**
 * Count words in a string.
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// --- Component ---

const ArticleScreen: React.FC<ArticleScreenProps> = ({
  articleId,
  article: articleProp,
  articleDbId,
  briefData: briefDataProp,
  lengthConstraints,
  language = 'English',
  onBack,
  onArticleChange,
}) => {
  const [articleData, setArticleData] = useState<BriefArticle | null>(null);
  const [currentContent, setCurrentContent] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [briefContext, setBriefContext] = useState<Partial<ContentBrief> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Set<number>>(new Set());
  const [showOptimizer, setShowOptimizer] = useState(true);
  const [copyLabel, setCopyLabel] = useState<'idle' | 'copied'>('idle');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [seoMetadataOpen, setSeoMetadataOpen] = useState(true);

  // -- Loading logic --

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        if (articleId) {
          const { data: fetchedArticle, error: articleError } = await getArticle(articleId);
          if (cancelled) return;
          if (articleError || !fetchedArticle) {
            setError(articleError || 'Article not found');
            setIsLoading(false);
            return;
          }

          setArticleData(fetchedArticle);
          setCurrentContent({ title: fetchedArticle.title, content: fetchedArticle.content });

          if (fetchedArticle.brief_id) {
            const { data: fetchedBrief } = await getBrief(fetchedArticle.brief_id);
            if (!cancelled && fetchedBrief?.brief_data) {
              setBriefContext(fetchedBrief.brief_data);
            }
          }
        } else if (articleProp) {
          setCurrentContent(articleProp);
          if (briefDataProp) {
            setBriefContext(briefDataProp);
          }
        } else {
          setError('No article data provided');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load article');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [articleId, articleProp, briefDataProp]);

  useEffect(() => {
    if (briefDataProp) {
      setBriefContext(briefDataProp);
    }
  }, [briefDataProp]);

  // -- Parsed sections --

  const sections = useMemo(() => {
    if (!currentContent?.content) return [];
    return parseIntoSections(currentContent.content);
  }, [currentContent?.content]);

  const wordCount = useMemo(() => {
    return currentContent?.content ? countWords(currentContent.content) : 0;
  }, [currentContent?.content]);

  // -- Handlers --

  const toggleSection = useCallback((index: number) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleCopyForDocs = useCallback(async () => {
    if (!currentContent?.content) return;
    try {
      await copyArticleToClipboardRich(currentContent.content);
      setCopyLabel('copied');
      toast.success('Copied to clipboard (rich text for Google Docs)');
      setTimeout(() => setCopyLabel('idle'), 2500);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }, [currentContent]);

  const handleDownloadMd = useCallback(() => {
    if (!currentContent) return;
    exportArticleToMarkdown(currentContent);
    toast.success('Markdown file downloaded');
  }, [currentContent]);

  const handleApplyChanges = useCallback(
    (newContent: string) => {
      const title =
        newContent.match(/^# (.+)$/m)?.[1] || currentContent?.title || 'Untitled';
      const newArticle = { title, content: newContent };
      setCurrentContent(newArticle);
      onArticleChange?.(newArticle);
      toast.success('Article updated');
    },
    [currentContent, onArticleChange]
  );

  const handleSaveStatusChange = useCallback((status: SaveStatus, savedAt?: Date) => {
    setSaveStatus(status);
    if (savedAt) setLastSavedAt(savedAt);
  }, []);

  const resolvedBriefData = briefContext || briefDataProp || null;

  const seoMetadata = useMemo(() => {
    const seo = resolvedBriefData?.on_page_seo;
    if (!seo) return null;
    const rows: { element: string; recommendation: string }[] = [];
    if (seo.title_tag?.value) rows.push({ element: 'Meta Title', recommendation: seo.title_tag.value });
    if (seo.meta_description?.value) rows.push({ element: 'Meta Description', recommendation: seo.meta_description.value });
    if (seo.url_slug?.value) rows.push({ element: 'URL Slug', recommendation: seo.url_slug.value });
    if (seo.h1?.value) rows.push({ element: 'H1', recommendation: seo.h1.value });
    if (seo.og_title?.value) rows.push({ element: 'OG Title', recommendation: seo.og_title.value });
    if (seo.og_description?.value) rows.push({ element: 'OG Description', recommendation: seo.og_description.value });
    return rows.length > 0 ? rows : null;
  }, [resolvedBriefData]);

  // -- Loading state --

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-6 py-4 border-b border-border bg-card">
          <Skeleton variant="text" width="30%" height={20} className="mb-3" />
          <Skeleton variant="text" width="60%" height={28} className="mb-2" />
          <Skeleton variant="text" width="40%" height={16} />
        </div>
        <div className="flex-1 flex p-6 gap-6">
          <div className="flex-[3] space-y-4">
            <Skeleton variant="text" width="100%" height={200} />
            <Skeleton variant="text" width="100%" height={150} />
            <Skeleton variant="text" width="100%" height={180} />
          </div>
          <div className="flex-[2] hidden md:block">
            <Skeleton variant="text" width="100%" height={400} />
          </div>
        </div>
      </div>
    );
  }

  // -- Error state --

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <Alert variant="error" title="Error loading article">
            {error}
          </Alert>
          <Button variant="secondary" onClick={onBack} className="mt-4">
            Back
          </Button>
        </div>
      </div>
    );
  }

  if (!currentContent) return null;

  // -- Render --

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="px-6 py-4 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-teal transition-colors mb-2 group"
            >
              <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              Back
            </button>
            <h1 className="text-2xl font-heading font-bold text-foreground truncate">
              {currentContent.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {articleData && (
                <Badge variant="default" size="sm">
                  Version {articleData.version}
                </Badge>
              )}
              {articleData?.is_current && (
                <Badge variant="success" size="sm">
                  Current
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                {wordCount.toLocaleString()} words
              </span>
              {articleData?.created_at && (
                <span className="text-sm text-muted-foreground">
                  {new Date(articleData.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              )}
              {(articleData?.id || articleDbId) && (
                <SaveStatusIndicator status={saveStatus} lastSavedAt={lastSavedAt} />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyForDocs}
              icon={<CopyIcon className="h-4 w-4" />}
            >
              {copyLabel === 'copied' ? 'Copied!' : 'Copy for Docs'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadMd}
              icon={<DownloadIcon className="h-4 w-4" />}
            >
              .md
            </Button>
            {!showOptimizer && resolvedBriefData && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOptimizer(true)}
                icon={<ZapIcon className="h-4 w-4" />}
              >
                <span className="hidden sm:inline">Show Optimizer</span>
                <span className="sm:hidden">Optimizer</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Body: split layout */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Left pane: collapsible article reader */}
        <div
          className={`flex-1 overflow-y-auto p-6 min-h-0 ${
            showOptimizer && resolvedBriefData ? 'md:w-[60%] md:flex-none' : ''
          }`}
        >
          {sections.length === 0 && (
            <div className="text-muted-foreground text-sm italic">
              No content to display.
            </div>
          )}

          <div className="max-w-3xl space-y-1">
            {seoMetadata && (
              <Collapsible open={seoMetadataOpen} onOpenChange={() => setSeoMetadataOpen(!seoMetadataOpen)}>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 w-full text-left py-3 mb-2 group">
                    <SearchIcon className="h-4 w-4 text-teal flex-shrink-0" />
                    <span className="text-sm font-heading font-semibold text-foreground group-hover:text-teal transition-colors">
                      On-Page SEO Recommendations
                    </span>
                    <span className="flex-shrink-0 text-muted-foreground ml-auto">
                      {seoMetadataOpen ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )}
                    </span>
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mb-6 border border-border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[140px]">Element</TableHead>
                          <TableHead>Recommendation</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seoMetadata.map((row) => (
                          <TableRow key={row.element}>
                            <TableCell className="font-medium text-foreground whitespace-nowrap">{row.element}</TableCell>
                            <TableCell className="text-muted-foreground">{row.recommendation}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {sections.map((section) => {
              const isCollapsed = collapsedSections.has(section.index);

              if (!section.heading) {
                return (
                  <div key={`section-${section.index}`} className="mb-6">
                    <div
                      className="prose-article"
                      dangerouslySetInnerHTML={{
                        __html: markdownToHtml(section.body),
                      }}
                    />
                  </div>
                );
              }

              return (
                <Collapsible
                  key={`section-${section.index}`}
                  open={!isCollapsed}
                  onOpenChange={() => toggleSection(section.index)}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      className="flex items-center gap-2 w-full text-left py-3 group"
                      aria-expanded={!isCollapsed}
                    >
                      <span className="flex-shrink-0 text-muted-foreground transition-transform duration-200">
                        {isCollapsed ? (
                          <ChevronDownIcon className="h-5 w-5" />
                        ) : (
                          <ChevronUpIcon className="h-5 w-5" />
                        )}
                      </span>
                      <h2 className="text-xl font-heading font-bold text-gray-900 group-hover:text-teal transition-colors">
                        {section.heading}
                      </h2>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-7 pb-4">
                      <div
                        className="prose-article"
                        dangerouslySetInnerHTML={{
                          __html: markdownToHtml(section.body),
                        }}
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        </div>

        {/* Right pane: optimizer chat */}
        {showOptimizer && resolvedBriefData && currentContent && (
          <div className="border-t md:border-t-0 md:border-l border-border md:w-[40%] flex-shrink-0 flex flex-col bg-card overflow-hidden h-full min-h-0">
            <ArticleOptimizerPanel
              article={currentContent}
              brief={resolvedBriefData}
              lengthConstraints={lengthConstraints}
              language={language}
              onApplyChanges={handleApplyChanges}
              onClose={() => setShowOptimizer(false)}
              articleId={articleData?.id || articleDbId}
              mode="inline"
              onSaveStatusChange={handleSaveStatusChange}
            />
          </div>
        )}

        {/* If no brief data, show a notice in the right pane area */}
        {showOptimizer && !resolvedBriefData && (
          <div className="border-t md:border-t-0 md:border-l border-border md:w-[40%] flex-shrink-0 flex flex-col items-center justify-center p-6 bg-card">
            <ZapIcon className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground text-center max-w-xs">
              Optimizer requires brief data. Load an article that is linked to a brief to
              enable optimization.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOptimizer(false)}
              className="mt-3"
            >
              Hide Panel
            </Button>
          </div>
        )}
      </div>

      {/* Mobile optimizer toggle */}
      {!showOptimizer && resolvedBriefData && (
        <div className="md:hidden border-t border-border p-3 bg-card flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            fullWidth
            onClick={() => setShowOptimizer(true)}
            icon={<ZapIcon className="h-4 w-4" />}
          >
            Show Optimizer
          </Button>
        </div>
      )}
    </div>
  );
};

export default ArticleScreen;
