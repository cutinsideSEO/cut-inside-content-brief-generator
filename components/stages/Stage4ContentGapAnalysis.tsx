import React from 'react';
import type { ContentBrief, ReasoningItem } from '../../types';
import { LightbulbIcon, PuzzleIcon, XIcon } from '../Icon';

interface StageProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
}

const ReasoningDisplay: React.FC<{ reasoning?: string }> = ({ reasoning }) => {
  if (!reasoning) return null;
  return (
    <div className="mb-4 p-3 bg-black/50 border-l-4 border-teal rounded-r-md">
      <div className="flex items-center">
        <LightbulbIcon className="h-4 w-4 mr-2 text-teal flex-shrink-0" />
        <p className="text-xs font-heading font-semibold text-teal">AI Reasoning</p>
      </div>
      <p className="text-sm text-grey/70 italic pt-1 pl-6">{reasoning}</p>
    </div>
  );
};

const GapItem: React.FC<{
  item: ReasoningItem<string>;
  index: number;
  type: 'table_stakes' | 'strategic_opportunities';
  onUpdate: (index: number, type: 'table_stakes' | 'strategic_opportunities', value: string) => void;
  onRemove: () => void;
}> = ({ item, index, type, onUpdate, onRemove }) => {
  return (
    <div className="p-3 bg-black/30 rounded-md border border-white/10 relative">
      <button 
        onClick={onRemove} 
        className="absolute top-2 right-2 p-1 text-grey/50 hover:text-red-500 rounded-full hover:bg-white/10"
        title="Remove item"
      >
        <XIcon className="h-4 w-4" />
      </button>

      <label htmlFor={`${type}-${index}`} className="block text-sm font-heading font-medium text-grey/80 mb-1">
        {type === 'table_stakes' ? 'Topic' : 'Opportunity'} {index + 1}
      </label>
      <textarea
        id={`${type}-${index}`}
        rows={2}
        className="w-full p-2 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal"
        value={item.value}
        onChange={(e) => onUpdate(index, type, e.target.value)}
      />
      <div className="mt-2 p-2 bg-black/50 border-l-2 border-white/10 rounded-r-md">
        <p className="text-xs font-heading font-semibold text-grey/60">AI Reasoning:</p>
        <p className="text-sm text-grey/50 italic pt-1">{item.reasoning}</p>
      </div>
    </div>
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
      <div className="p-4 bg-black/20 rounded-lg border border-white/10">
        <div className="flex items-center mb-2">
          <PuzzleIcon className="h-6 w-6 mr-2 text-teal" />
          <h2 className="text-lg font-heading font-semibold text-grey">Content Gap Analysis</h2>
        </div>
        <p className="text-sm text-grey/60 mb-4">
          Identifying essential topics and strategic opportunities based on competitor analysis.
        </p>

        <ReasoningDisplay reasoning={gapData.reasoning} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-md font-heading font-semibold text-teal mb-2">Table Stakes (Must-Have Topics)</h3>
            <div className="space-y-4">
              {gapData.table_stakes.map((item, index) => (
                <GapItem key={index} item={item} index={index} type="table_stakes" onUpdate={handleItemChange} onRemove={() => handleRemoveItem('table_stakes', index)} />
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-md font-heading font-semibold text-yellow mb-2">Strategic Opportunities (Content Gaps)</h3>
            <div className="space-y-4">
              {gapData.strategic_opportunities.map((item, index) => (
                <GapItem key={index} item={item} index={index} type="strategic_opportunities" onUpdate={handleItemChange} onRemove={() => handleRemoveItem('strategic_opportunities', index)} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stage4ContentGapAnalysis;