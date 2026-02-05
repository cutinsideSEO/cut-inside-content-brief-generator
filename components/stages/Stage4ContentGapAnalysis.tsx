import React from 'react';
import type { ContentBrief, ReasoningItem } from '../../types';
import { PuzzleIcon, XIcon } from '../Icon';
import { Card, Callout, Textarea } from '../ui';
import Button from '../Button';

interface StageProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
}

const GapItem: React.FC<{
  item: ReasoningItem<string>;
  index: number;
  type: 'table_stakes' | 'strategic_opportunities';
  onUpdate: (index: number, type: 'table_stakes' | 'strategic_opportunities', value: string) => void;
  onRemove: () => void;
}> = ({ item, index, type, onUpdate, onRemove }) => {
  const isTableStakes = type === 'table_stakes';

  return (
    <Card variant="outline" padding="sm" className="relative">
      <div className="absolute top-2 right-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-text-muted hover:text-status-error"
        >
          <XIcon className="h-4 w-4" />
        </Button>
      </div>

      <label
        htmlFor={`${type}-${index}`}
        className={`block text-xs font-heading font-medium uppercase tracking-wider mb-2 ${
          isTableStakes ? 'text-teal' : 'text-status-generating'
        }`}
      >
        {isTableStakes ? 'Topic' : 'Opportunity'} {index + 1}
      </label>
      <Textarea
        id={`${type}-${index}`}
        rows={2}
        value={item.value}
        onChange={(e) => onUpdate(index, type, e.target.value)}
        placeholder={isTableStakes ? "Essential topic to cover..." : "Strategic opportunity to explore..."}
      />
      {item.reasoning && (
        <Callout variant="ai" title="AI Reasoning" className="mt-3" collapsible defaultCollapsed>
          {item.reasoning}
        </Callout>
      )}
    </Card>
  );
};

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
    <div className="space-y-6">
      <Card variant="default" padding="md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-radius-md bg-teal/10 flex items-center justify-center">
            <PuzzleIcon className="h-5 w-5 text-teal" />
          </div>
          <div>
            <h3 className="text-base font-heading font-semibold text-text-primary">Content Gap Analysis</h3>
            <p className="text-sm text-text-muted">Identifying essential topics and strategic opportunities based on competitor analysis</p>
          </div>
        </div>

        {gapData.reasoning && (
          <Callout variant="ai" title="AI Reasoning" className="mb-6" collapsible defaultCollapsed>
            {gapData.reasoning}
          </Callout>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Table Stakes */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-teal"></div>
              <h4 className="text-sm font-heading font-semibold text-text-primary">Table Stakes (Must-Have Topics)</h4>
            </div>
            <p className="text-xs text-text-muted mb-4">Topics that all top competitors cover - essential for credibility</p>
            <div className="space-y-3">
              {gapData.table_stakes.map((item, index) => (
                <GapItem
                  key={index}
                  item={item}
                  index={index}
                  type="table_stakes"
                  onUpdate={handleItemChange}
                  onRemove={() => handleRemoveItem('table_stakes', index)}
                />
              ))}
              {gapData.table_stakes.length === 0 && (
                <p className="text-sm text-text-muted italic py-4 text-center">No table stakes identified yet</p>
              )}
            </div>
          </div>

          {/* Strategic Opportunities */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-status-generating"></div>
              <h4 className="text-sm font-heading font-semibold text-text-primary">Strategic Opportunities (Content Gaps)</h4>
            </div>
            <p className="text-xs text-text-muted mb-4">Topics competitors miss - your chance to differentiate</p>
            <div className="space-y-3">
              {gapData.strategic_opportunities.map((item, index) => (
                <GapItem
                  key={index}
                  item={item}
                  index={index}
                  type="strategic_opportunities"
                  onUpdate={handleItemChange}
                  onRemove={() => handleRemoveItem('strategic_opportunities', index)}
                />
              ))}
              {gapData.strategic_opportunities.length === 0 && (
                <p className="text-sm text-text-muted italic py-4 text-center">No opportunities identified yet</p>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Stage4ContentGapAnalysis;
