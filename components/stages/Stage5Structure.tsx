import React, { useState, useCallback } from 'react';
import type { ContentBrief, OutlineItem, ArticleStructure } from '../../types';
import { XIcon, PuzzleIcon, ZapIcon, ChevronDownIcon } from '../Icon';
import { Badge, Input, AIReasoningIcon, EditableText, Collapsible, CollapsibleTrigger, CollapsibleContent } from '../ui';
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
        <div className="absolute z-10 w-72 p-3 text-sm font-normal text-gray-600 bg-white rounded-md border border-gray-200 shadow-card-elevated -translate-y-full -translate-x-1/2 left-1/2 -top-2 animate-fade-in">
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
                    <h4 className="font-heading font-semibold text-amber-500 text-xs uppercase tracking-wider">Competitor Coverage</h4>
                    <ul className="text-xs text-gray-400 mt-2 space-y-1">
                        {competitors.map(c => <li key={c} className="truncate" title={c}>• {c}</li>)}
                    </ul>
                </div>
            )}
        </div>
    );
};

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
    'H3': 'border-l-emerald-400',
    'H4': 'border-l-amber-400',
  };

  const hasSnippet = item.featured_snippet_target?.is_target;

  return (
    <div style={{ marginLeft: `${levelPadding}rem` }}>
      <Collapsible open={isExpanded} onOpenChange={() => onToggleExpand(pathKey)} className={`border-l-2 ${levelColors[item.level] || 'border-l-border'}`}>
        {/* Compact header - always visible */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center gap-3 py-2.5 pl-4 pr-2 hover:bg-gray-100 transition-colors text-left rounded-r-sm"
          >
            <ChevronDownIcon className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            <Badge variant="teal" size="sm">{item.level}</Badge>
            <span className="text-sm font-heading font-semibold text-foreground truncate flex-1">
              {item.heading || 'Untitled section'}
            </span>
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.target_word_count && item.target_word_count > 0 && (
                <span className="text-xs text-gray-400">{item.target_word_count.toLocaleString()}w</span>
              )}
              {hasSnippet && (
                <ZapIcon className="h-3.5 w-3.5 text-emerald-500" />
              )}
              <div
                className="relative"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={(e) => e.stopPropagation()}
              >
                {(item.targeted_keywords?.length || item.competitor_coverage?.length) ? (
                  <PuzzleIcon className="h-3.5 w-3.5 text-gray-400" />
                ) : null}
                {isHovered && <HeadingInsightsPopover keywords={item.targeted_keywords} competitors={item.competitor_coverage} />}
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Expanded details */}
        <CollapsibleContent>
          <div className="pl-4 pr-2 pb-3 pt-1 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {item.reasoning && <AIReasoningIcon reasoning={item.reasoning} />}
                {hasSnippet && item.featured_snippet_target && (
                  <span className="text-xs text-gray-400">
                    Snippet: <Badge variant="default" size="sm">{SNIPPET_FORMAT_LABELS[item.featured_snippet_target.format]?.label}</Badge>
                    {item.featured_snippet_target.target_query && (
                      <span className="ml-1 text-teal">"{item.featured_snippet_target.target_query}"</span>
                    )}
                  </span>
                )}
                {item.additional_resources && item.additional_resources.length > 0 && (
                  <span className="text-xs text-amber-500">
                    {item.additional_resources.length} resource{item.additional_resources.length > 1 ? 's' : ''} needed
                  </span>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(path)}
                className="text-gray-400 hover:text-red-500"
              >
                <XIcon className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div>
              <label className="block text-xs font-heading font-medium text-muted-foreground uppercase tracking-wider mb-1">Heading</label>
              <Input
                value={item.heading}
                onChange={(e) => handleInputChange('heading', e.target.value)}
                placeholder="Section heading..."
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-medium text-muted-foreground uppercase tracking-wider mb-1">Guidelines</label>
              <EditableText
                value={item.guidelines.join('\n')}
                onChange={(val) => handleInputChange('guidelines', val.split('\n'))}
                placeholder="Enter guidelines, one per line."
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Nested children */}
      {item.children?.map((child, index) => (
        <div className="mt-1" key={index}>
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
    <div className="space-y-8">
      {/* Word count + reasoning */}
      <div className="bg-card border border-border rounded-lg p-4 shadow-card">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <label htmlFor="word_count" className="text-sm font-heading font-medium text-muted-foreground">Word Count Target</label>
          {structure.reasoning && <AIReasoningIcon reasoning={structure.reasoning} />}
        </div>
        <div className="w-40">
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
      </div>

      {/* Content Outline */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider">Content Outline</h3>
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
        <div className="bg-card border border-border rounded-lg p-4 shadow-card">
        <div className="space-y-1">
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
            <p className="text-sm text-muted-foreground italic py-8 text-center">No outline sections yet</p>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default Stage5Structure;
