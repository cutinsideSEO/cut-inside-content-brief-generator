import React, { useState } from 'react';
import type { ContentBrief, OutlineItem, ArticleStructure } from '../../types';
import { ListTreeIcon, LightbulbIcon, XIcon, PuzzleIcon, ZapIcon, FileTextIcon } from '../Icon';

const SNIPPET_FORMAT_LABELS: Record<string, { label: string; icon: string }> = {
  paragraph: { label: 'Paragraph', icon: '¶' },
  list: { label: 'List', icon: '•' },
  table: { label: 'Table', icon: '⊞' }
};

interface StageProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
}

const ReasoningDisplay: React.FC<{ reasoning?: string; isNested?: boolean }> = ({ reasoning, isNested }) => {
  if (!reasoning) return null;
  const marginClass = isNested ? "mt-2" : "mb-4";
  return (
    <div className={`${marginClass} p-3 bg-black/50 border-l-4 border-teal rounded-r-md`}>
      <div className="flex items-center">
        <LightbulbIcon className="h-4 w-4 mr-2 text-teal flex-shrink-0" />
        <p className="text-xs font-heading font-semibold text-teal">AI Reasoning</p>
      </div>
      <p className="text-sm text-grey/70 italic pt-1 pl-6">{reasoning}</p>
    </div>
  );
};

const HeadingInsightsPopover: React.FC<{ keywords?: string[]; competitors?: string[] }> = ({ keywords, competitors }) => {
    if (!keywords?.length && !competitors?.length) return null;
    return (
        <div className="absolute z-10 w-72 p-3 text-sm font-normal text-grey bg-black rounded-lg border border-white/10 shadow-lg -translate-y-full -translate-x-1/2 left-1/2 -top-2 opacity-100 transition-opacity duration-300 pointer-events-none">
            {keywords?.length > 0 && (
                <div className="mb-2">
                    <h4 className="font-heading font-semibold text-teal">Targeted Keywords</h4>
                    <ul className="list-disc list-inside text-xs space-y-0.5">
                        {keywords.map(kw => <li key={kw}>{kw}</li>)}
                    </ul>
                </div>
            )}
            {competitors?.length > 0 && (
                 <div>
                    <h4 className="font-heading font-semibold text-yellow">Competitor Coverage</h4>
                    <ul className="list-disc list-inside text-xs space-y-0.5">
                        {competitors.map(c => <li key={c} className="truncate" title={c}>{c}</li>)}
                    </ul>
                </div>
            )}
            <div className="tooltip-arrow" data-popper-arrow></div>
        </div>
    )
}

const OutlineNode: React.FC<{
  item: OutlineItem;
  path: number[];
  onUpdate: (path: number[], field: keyof OutlineItem, value: any) => void;
  onRemove: (path: number[]) => void;
}> = ({ item, path, onUpdate, onRemove }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleInputChange = (field: keyof OutlineItem, value: any) => {
    onUpdate(path, field, value);
  };
  
  const levelPadding = (path.length - 1) * 2;

  return (
    <div 
      className="p-4 bg-black/30 rounded-lg border border-white/10"
      style={{ marginLeft: `${levelPadding}rem` }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="relative" onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
            <span className="text-xs font-heading font-bold uppercase tracking-wider text-teal bg-black/50 px-2 py-1 rounded-md">{item.level}</span>
            {isHovered && <HeadingInsightsPopover keywords={item.targeted_keywords} competitors={item.competitor_coverage} />}
        </div>
        <button 
            onClick={() => onRemove(path)}
            className="p-1 text-grey/50 hover:text-red-500 rounded-full hover:bg-white/10"
            title="Remove this section and all its children"
        >
            <XIcon className="h-4 w-4" />
        </button>
      </div>
      
      <label className="block text-xs font-heading font-medium text-teal mt-3 mb-1">Heading</label>
      <input
        type="text"
        className="w-full p-2 bg-black border border-white/20 rounded-md text-grey font-semibold focus:ring-2 focus:ring-teal"
        value={item.heading}
        onChange={(e) => handleInputChange('heading', e.target.value)}
      />
      <label className="block text-xs font-heading font-medium text-teal mt-3 mb-1">Guidelines</label>
      <textarea
        rows={3}
        className="w-full p-2 bg-black border border-white/20 rounded-md text-grey text-sm focus:ring-2 focus:ring-teal"
        value={item.guidelines.join('\n')}
        onChange={(e) => handleInputChange('guidelines', e.target.value.split('\n'))}
        placeholder="Enter guidelines, one per line."
      />
       <ReasoningDisplay reasoning={item.reasoning} isNested={true} />

      {/* Featured Snippet Target - N2 */}
      {item.featured_snippet_target?.is_target && (
        <div className="mt-3 p-3 bg-purple-500/10 border-l-4 border-purple-500 rounded-r-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ZapIcon className="h-4 w-4 mr-2 text-purple-400 flex-shrink-0" />
              <p className="text-xs font-heading font-semibold text-purple-400">Featured Snippet Target</p>
            </div>
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 text-xs rounded-md font-medium">
              {SNIPPET_FORMAT_LABELS[item.featured_snippet_target.format]?.icon} {SNIPPET_FORMAT_LABELS[item.featured_snippet_target.format]?.label}
            </span>
          </div>
          {item.featured_snippet_target.target_query && (
            <p className="text-sm text-grey/70 pt-1 pl-6">
              Target query: <span className="text-purple-300 font-medium">"{item.featured_snippet_target.target_query}"</span>
            </p>
          )}
        </div>
      )}

      {/* Per-Section Word Count - N5 */}
      {item.target_word_count && item.target_word_count > 0 && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          <FileTextIcon className="h-4 w-4 text-grey/50" />
          <span className="text-grey/50">Target:</span>
          <span className="px-2 py-0.5 bg-teal/20 text-teal text-xs rounded-md font-medium">
            {item.target_word_count.toLocaleString()} words
          </span>
        </div>
      )}

      {item.additional_resources && item.additional_resources.length > 0 && (
          <div className="mt-3 p-3 bg-yellow/10 border-l-4 border-yellow rounded-r-md">
              <div className="flex items-center">
                  <PuzzleIcon className="h-4 w-4 mr-2 text-yellow flex-shrink-0" />
                  <p className="text-xs font-heading font-semibold text-yellow">Additional Resources Needed</p>
              </div>
              <ul className="text-sm text-grey/80 list-disc list-inside pt-1 pl-6 space-y-1">
                  {item.additional_resources.map((resource, i) => (
                      <li key={i}>{resource}</li>
                  ))}
              </ul>
          </div>
      )}

      {item.children?.map((child, index) => (
        <div className="mt-4" key={index}>
            <OutlineNode 
                item={child}
                path={[...path, index]}
                onUpdate={onUpdate}
                onRemove={onRemove}
            />
        </div>
      ))}
    </div>
  );
};


const Stage5Structure: React.FC<StageProps> = ({ briefData, setBriefData }) => {
  const structure = briefData.article_structure || { word_count_target: 0, outline: [], reasoning: '' };

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
            if (!currentLevel[path[i]] || !currentLevel[path[i]].children) return prev; // Path safety
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
        // Traverse to the parent of the node to be removed
        for (let i = 0; i < path.length - 1; i++) {
            parentLevel = parentLevel[path[i]].children;
        }
        
        // Remove the node from its parent's children array
        const indexToRemove = path[path.length - 1];
        parentLevel.splice(indexToRemove, 1);
        
        return newBriefData;
    });
  };

  return (
    <div className="space-y-6">
       <div className="p-4 bg-black/20 rounded-lg border border-white/10">
         <div className="flex items-center mb-2">
            <ListTreeIcon className="h-6 w-6 mr-2 text-teal" />
            <h2 className="text-lg font-heading font-semibold text-grey">Article Structure</h2>
        </div>
        <p className="text-sm text-grey/60 mb-4">Set a target word count and define the content outline.</p>
        
        <ReasoningDisplay reasoning={structure.reasoning} />

        <div>
          <label htmlFor="word_count" className="block text-sm font-heading font-medium text-grey/80 mb-1">Word Count Target</label>
          <input
            type="number"
            id="word_count"
            className="w-1/2 p-2 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal"
            value={structure.word_count_target || ''}
            onChange={(e) => handleWordCountChange(e.target.value)}
          />
        </div>
        
        <div className="mt-6">
          <h3 className="text-md font-heading font-medium text-grey/80 mb-2">Content Outline</h3>
          <div className="space-y-4">
            {structure.outline?.map((item, index) => (
              <OutlineNode
                key={index}
                item={item}
                path={[index]}
                onUpdate={handleOutlineChange}
                onRemove={handleRemoveOutlineNode}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stage5Structure;