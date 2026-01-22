import React from 'react';
import type { ContentBrief, SearchIntent, SearchIntentType } from '../../types';
import { FlagIcon, TargetIcon, LightbulbIcon, BrainCircuitIcon, ZapIcon } from '../Icon';

interface StageProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
}

const INTENT_LABELS: Record<SearchIntentType, { label: string; color: string; description: string }> = {
  informational: { label: 'Informational', color: 'bg-blue-500', description: 'User wants to learn or understand something' },
  transactional: { label: 'Transactional', color: 'bg-green-500', description: 'User wants to complete an action or purchase' },
  navigational: { label: 'Navigational', color: 'bg-purple-500', description: 'User wants to find a specific page or site' },
  commercial_investigation: { label: 'Commercial Investigation', color: 'bg-yellow-500', description: 'User is researching before a purchase decision' }
};

const ReasoningDisplay: React.FC<{ reasoning?: string }> = ({ reasoning }) => {
  if (!reasoning) return null;
  return (
    <div className="mt-2 p-3 bg-black/50 border-l-4 border-teal rounded-r-md">
      <div className="flex items-center">
        <LightbulbIcon className="h-4 w-4 mr-2 text-teal flex-shrink-0" />
        <p className="text-xs font-heading font-semibold text-teal">AI Reasoning</p>
      </div>
      <p className="text-sm text-grey/70 italic pt-1 pl-6">{reasoning}</p>
    </div>
  );
};

const SearchIntentDisplay: React.FC<{ searchIntent?: SearchIntent }> = ({ searchIntent }) => {
  if (!searchIntent) return null;

  const intentInfo = INTENT_LABELS[searchIntent.type];

  return (
    <div className="p-4 bg-black/20 rounded-lg border border-white/10">
      <div className="flex items-center mb-2">
        <BrainCircuitIcon className="h-6 w-6 mr-2 text-teal" />
        <label className="block text-lg font-heading font-semibold text-grey">Search Intent Classification</label>
      </div>
      <p className="text-sm text-grey/60 mb-4">Understanding the user's intent helps shape the content format and structure.</p>

      {/* Intent Type Badge */}
      <div className="mb-4">
        <span className="text-xs font-heading font-medium text-grey/70 uppercase tracking-wider">Primary Intent</span>
        <div className="mt-2 flex items-center gap-3">
          <span className={`px-3 py-1.5 rounded-full text-sm font-semibold text-white ${intentInfo.color}`}>
            {intentInfo.label}
          </span>
          <span className="text-sm text-grey/70">{intentInfo.description}</span>
        </div>
      </div>

      {/* Preferred Format */}
      <div className="mb-4">
        <span className="text-xs font-heading font-medium text-grey/70 uppercase tracking-wider">Preferred Content Format</span>
        <div className="mt-2 p-3 bg-black/50 rounded-md border border-white/10">
          <p className="text-grey">{searchIntent.preferred_format}</p>
        </div>
      </div>

      {/* SERP Features */}
      {searchIntent.serp_features && searchIntent.serp_features.length > 0 && (
        <div className="mb-4">
          <span className="text-xs font-heading font-medium text-grey/70 uppercase tracking-wider">Expected SERP Features</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {searchIntent.serp_features.map((feature, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-teal/20 text-teal text-xs rounded-md border border-teal/30 flex items-center gap-1"
              >
                <ZapIcon className="h-3 w-3" />
                {feature}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reasoning */}
      {searchIntent.reasoning && (
        <div className="mt-3 p-3 bg-black/50 border-l-4 border-teal rounded-r-md">
          <div className="flex items-center">
            <LightbulbIcon className="h-4 w-4 mr-2 text-teal flex-shrink-0" />
            <p className="text-xs font-heading font-semibold text-teal">AI Reasoning</p>
          </div>
          <p className="text-sm text-grey/70 italic pt-1 pl-6">{searchIntent.reasoning}</p>
        </div>
      )}
    </div>
  );
};

const Stage1Goal: React.FC<StageProps> = ({ briefData, setBriefData }) => {
  const handleChange = (field: 'page_goal' | 'target_audience', value: string) => {
    setBriefData(prev => ({
        ...prev,
        [field]: {
            ...(prev[field] || { value: '', reasoning: '' }),
            value: value
        }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Search Intent Classification - NEW */}
      <SearchIntentDisplay searchIntent={briefData.search_intent} />

      <div className="p-4 bg-black/20 rounded-lg border border-white/10">
        <div className="flex items-center mb-2">
          <FlagIcon className="h-6 w-6 mr-2 text-teal" />
          <label htmlFor="page_goal" className="block text-lg font-heading font-semibold text-grey">Page Goal</label>
        </div>
        <p className="text-sm text-grey/60 mb-3">Define the primary purpose of this content. What should the reader do or know after reading?</p>
        <textarea
          id="page_goal"
          rows={3}
          className="w-full p-2 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal"
          value={briefData.page_goal?.value || ''}
          onChange={(e) => handleChange('page_goal', e.target.value)}
        />
        <ReasoningDisplay reasoning={briefData.page_goal?.reasoning} />
      </div>
      <div className="p-4 bg-black/20 rounded-lg border border-white/10">
         <div className="flex items-center mb-2">
          <TargetIcon className="h-6 w-6 mr-2 text-teal" />
          <label htmlFor="target_audience" className="block text-lg font-heading font-semibold text-grey">Target Audience</label>
        </div>
        <p className="text-sm text-grey/60 mb-3">Describe the ideal reader. What are their roles, goals, and pain points?</p>
        <textarea
          id="target_audience"
          rows={3}
          className="w-full p-2 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal"
          value={briefData.target_audience?.value || ''}
          onChange={(e) => handleChange('target_audience', e.target.value)}
        />
        <ReasoningDisplay reasoning={briefData.target_audience?.reasoning} />
      </div>
    </div>
  );
};

export default Stage1Goal;