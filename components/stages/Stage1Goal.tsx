import React from 'react';
import type { ContentBrief, SearchIntent, SearchIntentType } from '../../types';
import { AIReasoningIcon, Badge, EditableText } from '../ui';

interface StageProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
}

const INTENT_LABELS: Record<SearchIntentType, { label: string; variant: 'default' | 'success' | 'warning' | 'teal'; description: string }> = {
  informational: { label: 'Informational', variant: 'teal', description: 'User wants to learn or understand something' },
  transactional: { label: 'Transactional', variant: 'success', description: 'User wants to complete an action or purchase' },
  navigational: { label: 'Navigational', variant: 'default', description: 'User wants to find a specific page or site' },
  commercial_investigation: { label: 'Commercial Investigation', variant: 'warning', description: 'User is researching before a purchase decision' }
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

  const searchIntent = briefData.search_intent;
  const intentInfo = searchIntent ? INTENT_LABELS[searchIntent.type] : null;

  return (
    <div className="space-y-8">
      {/* Search Intent */}
      {searchIntent && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-heading font-semibold text-text-secondary uppercase tracking-wider">
              Search Intent Classification
            </h3>
            {searchIntent.reasoning && (
              <AIReasoningIcon reasoning={searchIntent.reasoning} />
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {intentInfo && <Badge variant={intentInfo.variant} size="md">{intentInfo.label}</Badge>}
            <span className="text-text-muted">|</span>
            <span className="text-text-secondary text-sm">{searchIntent.preferred_format}</span>
          </div>
          {searchIntent.serp_features && searchIntent.serp_features.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {searchIntent.serp_features.map((f, i) => <Badge key={i} variant="teal" size="sm">{f}</Badge>)}
            </div>
          )}
        </div>
      )}

      {/* Page Goal */}
      <div className="border-t border-border-subtle pt-8">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-heading font-semibold text-text-secondary uppercase tracking-wider">Page Goal</h3>
          {briefData.page_goal?.reasoning && <AIReasoningIcon reasoning={briefData.page_goal.reasoning} />}
        </div>
        <EditableText
          value={briefData.page_goal?.value || ''}
          onChange={(val) => handleChange('page_goal', val)}
          placeholder="What should the reader do or know after reading?"
        />
      </div>

      {/* Target Audience */}
      <div className="border-t border-border-subtle pt-8">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-heading font-semibold text-text-secondary uppercase tracking-wider">Target Audience</h3>
          {briefData.target_audience?.reasoning && <AIReasoningIcon reasoning={briefData.target_audience.reasoning} />}
        </div>
        <EditableText
          value={briefData.target_audience?.value || ''}
          onChange={(val) => handleChange('target_audience', val)}
          placeholder="What are their roles, goals, and pain points?"
        />
      </div>
    </div>
  );
};

export default Stage1Goal;
