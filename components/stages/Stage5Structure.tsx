import React, { useState, useCallback } from 'react';
import type { ContentBrief, OutlineItem, ArticleStructure } from '../../types';
import { ListTreeIcon, XIcon, PuzzleIcon, ZapIcon, FileTextIcon, ChevronDownIcon } from '../Icon';
import { Card, Badge, Callout, Textarea, Input, Tooltip } from '../ui';
import Button from '../Button';

const SNIPPET_FORMAT_LABELS: Record<string, { label: string; icon: string }> = {
  paragraph: { label: 'Paragraph', icon: '¶' },
  list: { label: 'List', icon: '•' },
  table: { label: 'Table', icon: '⊞' }
};

interface StageProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
}

const HeadingInsightsPopover: React.FC<{ keywords?: string[]; competitors?: string[] }> = ({ keywords, competitors }) => {
    if (!keywords?.length && !competitors?.length) return null;
    return (
        <div className="absolute z-10 w-72 p-3 text-sm font-normal text-text-secondary bg-surface-elevated rounded-radius-md border border-border shadow-card-elevated -translate-y-full -translate-x-1/2 left-1/2 -top-2 animate-fade-in">
            {keywords?.length > 0 && (
                <div className="mb-3">
                    <h4 className="font-heading font-semibold text-teal text-xs uppercase tracking-wider">Targeted Keywords</h4>
                    <div className="flex flex-wrap gap-1 mt-2">
                        {keywords.map(kw => (
                            <Badge key={kw} variant="teal" size="sm">{kw}</Badge>
                        ))}
                    </div>
                </div>
            )}
            {competitors?.length > 0 && (
                 <div>
                    <h4 className="font-heading font-semibold text-status-generating text-xs uppercase tracking-wider">Competitor Coverage</h4>
                    <ul className="text-xs text-text-muted mt-2 space-y-1">
                        {competitors.map(c => <li key={c} className="truncate" title={c}>• {c}</li>)}
                    </ul>
                </div>
            )}
        </div>
    )
}

const OutlineNode: React.FC<{
  item: OutlineItem;
  path: number[];
  onUpdate: (path: number[], field: keyof OutlineItem, value: any) => void;
  onRemove: (path: number[]) => void;
  expandedPaths: Set<string>;
  onToggleExpand: (pathKey: string) => void;
}> = ({ item, path, onUpdate, onRemove, expandedPaths, onToggleExpand }) => {
  const [isHovered, setIsHovered] = useState(false);
  const pathKey = path.join('-');
  const isExpanded = expandedPaths.has(pathKey);

  const handleInputChange = (field: keyof OutlineItem, value: any) => {
    onUpdate(path, field, value);
  };

  const levelPadding = (path.length - 1) * 1.5;
  const levelColors: Record<string, string> = {
    'H2': 'border-l-teal',
    'H3': 'border-l-status-complete',
    'H4': 'border-l-status-generating',
  };

  const hasSnippet = item.featured_snippet_target?.is_target;

  return (
    <div style={{ marginLeft: `${levelPadding}rem` }}>
      <Card
        variant="outline"
        padding="none"
        className={`border-l-4 ${levelColors[item.level] || 'border-l-border'} overflow-hidden`}
      >
        {/* Compact header - always visible */}
        <button
          type="button"
          onClick={() => onToggleExpand(pathKey)}
          className="w-full flex items-center gap-3 p-3 hover:bg-surface-hover transition-colors text-left"
        >
          <ChevronDownIcon className={`h-4 w-4 text-text-muted flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          <Badge variant="teal" size="sm">{item.level}</Badge>
          <span className="text-sm font-heading font-semibold text-text-primary truncate flex-1">
            {item.heading || 'Untitled section'}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {item.target_word_count && item.target_word_count > 0 && (
              <span className="text-xs text-text-muted">{item.target_word_count.toLocaleString()}w</span>
            )}
            {hasSnippet && (
              <ZapIcon className="h-3.5 w-3.5 text-green-400" />
            )}
            <div
              className="relative"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={(e) => e.stopPropagation()}
            >
              {(item.targeted_keywords?.length || item.competitor_coverage?.length) ? (
                <PuzzleIcon className="h-3.5 w-3.5 text-text-muted" />
              ) : null}
              {isHovered && <HeadingInsightsPopover keywords={item.targeted_keywords} competitors={item.competitor_coverage} />}
            </div>
          </div>
        </button>

        {/* Expanded details */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-2 border-t border-border-subtle space-y-4 animate-fade-in">
            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(path)}
                className="text-text-muted hover:text-status-error"
              >
                <XIcon className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>

            <div>
              <label className="block text-xs font-heading font-medium text-teal uppercase tracking-wider mb-2">Heading</label>
              <Input
                value={item.heading}
                onChange={(e) => handleInputChange('heading', e.target.value)}
                placeholder="Section heading..."
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-medium text-teal uppercase tracking-wider mb-2">Guidelines</label>
              <Textarea
                rows={3}
                value={item.guidelines.join('\n')}
                onChange={(e) => handleInputChange('guidelines', e.target.value.split('\n'))}
                placeholder="Enter guidelines, one per line."
              />
            </div>

            {item.reasoning && (
              <Callout variant="ai" title="AI Reasoning" collapsible defaultCollapsed>
                {item.reasoning}
              </Callout>
            )}

            {/* Featured Snippet Target */}
            {hasSnippet && (
              <Callout variant="tip" title="Featured Snippet Target">
                <div className="flex items-center justify-between">
                  <span>Format: <Badge variant="default" size="sm">{SNIPPET_FORMAT_LABELS[item.featured_snippet_target!.format]?.label}</Badge></span>
                </div>
                {item.featured_snippet_target!.target_query && (
                  <p className="mt-2 text-text-secondary">
                    Target query: <span className="text-teal font-medium">"{item.featured_snippet_target!.target_query}"</span>
                  </p>
                )}
              </Callout>
            )}

            {/* Per-Section Word Count */}
            {item.target_word_count && item.target_word_count > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <FileTextIcon className="h-4 w-4 text-text-muted" />
                <span className="text-text-muted">Target:</span>
                <Badge variant="teal" size="sm">{item.target_word_count.toLocaleString()} words</Badge>
              </div>
            )}

            {/* Additional Resources */}
            {item.additional_resources && item.additional_resources.length > 0 && (
              <Callout variant="warning" title="Additional Resources Needed">
                <ul className="text-sm list-disc list-inside space-y-1">
                  {item.additional_resources.map((resource, i) => (
                    <li key={i}>{resource}</li>
                  ))}
                </ul>
              </Callout>
            )}
          </div>
        )}
      </Card>

      {/* Nested children - always visible to preserve hierarchy */}
      {item.children?.map((child, index) => (
        <div className="mt-2" key={index}>
          <OutlineNode
            item={child}
            path={[...path, index]}
            onUpdate={onUpdate}
            onRemove={onRemove}
            expandedPaths={expandedPaths}
            onToggleExpand={onToggleExpand}
          />
        </div>
      ))}
    </div>
  );
};


const Stage5Structure: React.FC<StageProps> = ({ briefData, setBriefData }) => {
  const structure = briefData.article_structure || { word_count_target: 0, outline: [], reasoning: '' };
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Collect all paths for expand/collapse all
  const getAllPaths = useCallback((items: OutlineItem[], prefix: number[] = []): string[] => {
    const paths: string[] = [];
    items.forEach((item, index) => {
      const currentPath = [...prefix, index];
      paths.push(currentPath.join('-'));
      if (item.children) {
        paths.push(...getAllPaths(item.children, currentPath));
      }
    });
    return paths;
  }, []);

  const handleToggleExpand = useCallback((pathKey: string) => {
    setExpandedPaths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pathKey)) {
        newSet.delete(pathKey);
      } else {
        newSet.add(pathKey);
      }
      return newSet;
    });
  }, []);

  const handleExpandAll = useCallback(() => {
    const allPaths = getAllPaths(structure.outline || []);
    setExpandedPaths(new Set(allPaths));
  }, [structure.outline, getAllPaths]);

  const handleCollapseAll = useCallback(() => {
    setExpandedPaths(new Set());
  }, []);

  const handleWordCountChange = (value: string) => {
    const count = parseInt(value, 10);
    setBriefData(prev => ({
      ...prev,
      article_structure: {
        ...(prev.article_structure || { outline: [], reasoning: '' }),
        word_count_target: isNaN(count) ? 0 : count,
      } as ArticleStructure
    }));
  };

  const handleOutlineChange = (path: number[], field: keyof OutlineItem, value: any) => {
    setBriefData(prev => {
        const newBriefData = JSON.parse(JSON.stringify(prev));
        if (!newBriefData.article_structure) return prev;

        let currentLevel = newBriefData.article_structure.outline;
        for (let i = 0; i < path.length - 1; i++) {
            if (!currentLevel[path[i]] || !currentLevel[path[i]].children) return prev;
            currentLevel = currentLevel[path[i]].children;
        }

        const nodeToUpdate = currentLevel[path[path.length - 1]];
        if (nodeToUpdate) {
            (nodeToUpdate as any)[field] = value;
        }

        return newBriefData;
    });
  };

  const handleRemoveOutlineNode = (path: number[]) => {
    setBriefData(prev => {
        const newBriefData = JSON.parse(JSON.stringify(prev));
        if (!newBriefData.article_structure) return prev;

        let parentLevel = newBriefData.article_structure.outline;
        for (let i = 0; i < path.length - 1; i++) {
            parentLevel = parentLevel[path[i]].children;
        }

        const indexToRemove = path[path.length - 1];
        parentLevel.splice(indexToRemove, 1);

        return newBriefData;
    });
  };

  const isAllExpanded = structure.outline && structure.outline.length > 0 && expandedPaths.size >= getAllPaths(structure.outline).length;

  return (
    <div className="space-y-6">
      <Card variant="default" padding="md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-radius-md bg-teal/10 flex items-center justify-center">
            <ListTreeIcon className="h-5 w-5 text-teal" />
          </div>
          <div>
            <h3 className="text-base font-heading font-semibold text-text-primary">Article Structure</h3>
            <p className="text-sm text-text-muted">Set a target word count and define the content outline</p>
          </div>
        </div>

        {structure.reasoning && (
          <Callout variant="ai" title="AI Reasoning" className="mb-6" collapsible defaultCollapsed>
            {structure.reasoning}
          </Callout>
        )}

        <div className="mb-6">
          <label htmlFor="word_count" className="block text-xs font-heading font-medium text-text-secondary uppercase tracking-wider mb-2">Word Count Target</label>
          <div className="max-w-xs">
            <Input
              type="number"
              id="word_count"
              value={structure.word_count_target || ''}
              onChange={(e) => handleWordCountChange(e.target.value)}
              placeholder="e.g., 2000"
              suffix="words"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-heading font-semibold text-text-primary">Content Outline</h4>
            {structure.outline && structure.outline.length > 0 && (
              <button
                type="button"
                onClick={isAllExpanded ? handleCollapseAll : handleExpandAll}
                className="text-xs text-teal hover:text-teal/80 transition-colors font-medium"
              >
                {isAllExpanded ? 'Collapse All' : 'Expand All'}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {structure.outline?.map((item, index) => (
              <OutlineNode
                key={index}
                item={item}
                path={[index]}
                onUpdate={handleOutlineChange}
                onRemove={handleRemoveOutlineNode}
                expandedPaths={expandedPaths}
                onToggleExpand={handleToggleExpand}
              />
            ))}
            {structure.outline?.length === 0 && (
              <p className="text-sm text-text-muted italic py-4 text-center">No outline sections yet</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Stage5Structure;
