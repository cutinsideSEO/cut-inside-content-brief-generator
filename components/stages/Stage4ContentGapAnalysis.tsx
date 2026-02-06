import React from 'react';
import type { ContentBrief, ReasoningItem } from '../../types';
import { XIcon } from '../Icon';
import { AIReasoningIcon, EditableText } from '../ui';
import Button from '../Button';

interface StageProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
}

const Stage4ContentGapAnalysis: React.FC<StageProps> = ({ briefData, setBriefData }) => {
  const gapData = briefData.content_gap_analysis || {
    table_stakes: [],
    strategic_opportunities: [],
    reasoning: '',
  };

  const handleItemChange = (index: number, type: 'table_stakes' | 'strategic_opportunities', value: string) => {
    setBriefData(prev => {
      const newGapData = { ...(prev.content_gap_analysis || gapData) };
      const newItems = [...newGapData[type]];
      newItems[index] = { ...newItems[index], value };
      return { ...prev, content_gap_analysis: { ...newGapData, [type]: newItems } };
    });
  };

  const handleAddItem = (type: 'table_stakes' | 'strategic_opportunities') => {
    setBriefData(prev => {
      const currentGapData = prev.content_gap_analysis || gapData;
      const newItems = [...currentGapData[type], { value: '', reasoning: '' }];
      return {
        ...prev,
        content_gap_analysis: {
          ...currentGapData,
          [type]: newItems,
        },
      };
    });
  };

  const handleRemoveItem = (type: 'table_stakes' | 'strategic_opportunities', indexToRemove: number) => {
    setBriefData(prev => {
        const currentGapData = prev.content_gap_analysis;
        if (!currentGapData) return prev;

        const newItems = [...currentGapData[type]].filter((_, index) => index !== indexToRemove);

        return {
            ...prev,
            content_gap_analysis: {
                ...currentGapData,
                [type]: newItems
            }
        };
    });
  };

  return (
    <div className="space-y-8">
      {gapData.reasoning && (
        <div className="flex items-center gap-2">
          <AIReasoningIcon reasoning={gapData.reasoning} />
          <span className="text-xs text-muted-foreground">AI analysis of content gaps based on competitor coverage</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Table Stakes */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-teal"></div>
            <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider">Table Stakes (Must-Have Topics)</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Topics that all top competitors cover — essential for credibility</p>
          <div className="space-y-3">
            {gapData.table_stakes.map((item, index) => (
              <div key={index} className="group flex items-start gap-2">
                <span className="text-teal mt-1 flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /></svg>
                </span>
                <div className="flex-1 min-w-0">
                  <EditableText
                    value={item.value}
                    onChange={(val) => handleItemChange(index, 'table_stakes', val)}
                    placeholder="Essential topic to cover..."
                  />
                </div>
                {item.reasoning && <AIReasoningIcon reasoning={item.reasoning} />}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem('table_stakes', index)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity flex-shrink-0"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {gapData.table_stakes.length === 0 && (
              <p className="text-sm text-muted-foreground italic py-4 text-center">No table stakes identified yet</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAddItem('table_stakes')}
            className="mt-3 text-teal hover:text-teal"
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Add Item
          </Button>
        </div>

        {/* Strategic Opportunities */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <h3 className="text-sm font-heading font-semibold text-muted-foreground uppercase tracking-wider">Strategic Opportunities (Content Gaps)</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Topics competitors miss — your chance to differentiate</p>
          <div className="space-y-3">
            {gapData.strategic_opportunities.map((item, index) => (
              <div key={index} className="group flex items-start gap-2">
                <span className="text-amber-500 mt-1 flex-shrink-0">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" /></svg>
                </span>
                <div className="flex-1 min-w-0">
                  <EditableText
                    value={item.value}
                    onChange={(val) => handleItemChange(index, 'strategic_opportunities', val)}
                    placeholder="Strategic opportunity to explore..."
                  />
                </div>
                {item.reasoning && <AIReasoningIcon reasoning={item.reasoning} />}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveItem('strategic_opportunities', index)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity flex-shrink-0"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {gapData.strategic_opportunities.length === 0 && (
              <p className="text-sm text-muted-foreground italic py-4 text-center">No opportunities identified yet</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAddItem('strategic_opportunities')}
            className="mt-3 text-amber-500 hover:text-amber-600"
            icon={
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            }
          >
            Add Item
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Stage4ContentGapAnalysis;
