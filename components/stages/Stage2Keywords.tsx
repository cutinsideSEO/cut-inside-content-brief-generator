import React from 'react';
import type { ContentBrief, KeywordSelection } from '../../types';
import { KeyIcon, LightbulbIcon, XIcon } from '../Icon';

interface StageProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
  keywordVolumeMap: Map<string, number>;
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

const Stage2Keywords: React.FC<StageProps> = ({ briefData, setBriefData, keywordVolumeMap }) => {
  const strategy = briefData.keyword_strategy || { 
    primary_keywords: [], 
    secondary_keywords: [], 
    reasoning: '' 
  };

  const handlePrimaryNotesChange = (index: number, value: string) => {
    const newPrimary = [...strategy.primary_keywords];
    newPrimary[index] = { ...newPrimary[index], notes: value };
    setBriefData(prev => ({
      ...prev,
      keyword_strategy: { ...strategy, primary_keywords: newPrimary },
    }));
  };

  const handleSecondaryNotesChange = (index: number, value: string) => {
    const newSecondary = [...strategy.secondary_keywords];
    newSecondary[index] = { ...newSecondary[index], notes: value };
    setBriefData(prev => ({
      ...prev,
      keyword_strategy: { ...strategy, secondary_keywords: newSecondary },
    }));
  };

  const handleRemoveKeyword = (type: 'primary' | 'secondary', indexToRemove: number) => {
    setBriefData(prev => {
        const currentStrategy = prev.keyword_strategy;
        if (!currentStrategy) return prev;

        let newPrimary = [...currentStrategy.primary_keywords];
        let newSecondary = [...currentStrategy.secondary_keywords];

        if (type === 'primary') {
            newPrimary = newPrimary.filter((_, index) => index !== indexToRemove);
        } else {
            newSecondary = newSecondary.filter((_, index) => index !== indexToRemove);
        }

        return {
            ...prev,
            keyword_strategy: {
                ...currentStrategy,
                primary_keywords: newPrimary,
                secondary_keywords: newSecondary
            }
        };
    });
  };

  const getVolume = (kw: string) => {
    const volume = keywordVolumeMap.get(kw.toLowerCase());
    return volume ? volume.toLocaleString() : 'N/A';
  }

  const renderKeywordRow = (kwSelection: KeywordSelection, type: 'Primary' | 'Secondary', index: number) => {
    return (
      <tr key={`${type}-${index}`} className="border-b border-white/10 align-top">
        <td className={`p-2 font-heading font-semibold ${type === 'Primary' ? 'text-teal' : 'text-grey/60'}`}>{type}</td>
        <td className="p-2 text-grey">{kwSelection.keyword}</td>
        <td className="p-2 font-mono text-grey/80">{getVolume(kwSelection.keyword)}</td>
        <td className="p-2">
          <textarea
            className="w-full p-1 bg-black/80 border border-white/20 rounded-md text-grey text-sm focus:ring-1 focus:ring-teal resize-y"
            rows={2}
            value={kwSelection.notes}
            onChange={(e) => {
              if (type === 'Primary') {
                handlePrimaryNotesChange(index, e.target.value);
              } else {
                handleSecondaryNotesChange(index, e.target.value);
              }
            }}
            placeholder="AI notes on keyword usage..."
          />
        </td>
        <td className="p-2 text-center">
          <button
              onClick={() => handleRemoveKeyword(type.toLowerCase() as 'primary' | 'secondary', index)}
              className="p-1 text-grey/50 hover:text-red-500 rounded-full hover:bg-white/10"
              title="Remove keyword"
          >
              <XIcon className="h-4 w-4" />
          </button>
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
       <div className="p-4 bg-black/20 rounded-lg border border-white/10">
        <div className="flex items-center mb-2">
            <KeyIcon className="h-6 w-6 mr-2 text-teal" />
            <h2 className="text-lg font-heading font-semibold text-grey">Keyword Strategy</h2>
        </div>
        <p className="text-sm text-grey/60 mb-4">The AI has categorized your keyword list and provided strategic notes.</p>

        <ReasoningDisplay reasoning={strategy.reasoning} />

        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead className="bg-black/50">
                    <tr>
                        <th className="p-2 text-sm font-heading font-semibold text-grey/80 w-[15%]">Type</th>
                        <th className="p-2 text-sm font-heading font-semibold text-grey/80 w-[25%]">Keyword</th>
                        <th className="p-2 text-sm font-heading font-semibold text-grey/80 w-[15%]">Volume</th>
                        <th className="p-2 text-sm font-heading font-semibold text-grey/80 w-[40%]">AI Notes (Editable)</th>
                        <th className="p-2 text-sm font-heading font-semibold text-grey/80 w-[5%]"></th>
                    </tr>
                </thead>
                <tbody>
                    {strategy.primary_keywords?.map((kw, index) => (
                         renderKeywordRow(kw, 'Primary', index)
                    ))}
                    {strategy.secondary_keywords?.map((kw, index) => (
                         renderKeywordRow(kw, 'Secondary', index)
                    ))}
                </tbody>
            </table>
        </div>
       </div>
    </div>
  );
};

export default Stage2Keywords;