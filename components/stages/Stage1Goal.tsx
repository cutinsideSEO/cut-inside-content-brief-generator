import React from 'react';
import type { ContentBrief, SearchIntent, SearchIntentType } from '../../types';
import { FlagIcon, TargetIcon, BrainCircuitIcon, ZapIcon } from '../Icon';
import { Card, Textarea, Badge, Callout } from '../ui';

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

const SearchIntentDisplay: React.FC<{ searchIntent?: SearchIntent }> = ({ searchIntent }) => {
  if (!searchIntent) return null;

  const intentInfo = INTENT_LABELS[searchIntent.type];

  return (
    <Card variant="default" padding="md">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-radius-md bg-teal/10 flex items-center justify-center">
          <BrainCircuitIcon className="h-5 w-5 text-teal" />
        </div>
        <div>
          <h3 className="text-base font-heading font-semibold text-text-primary">Search Intent Classification</h3>
          <p className="text-sm text-text-muted">Understanding the user's intent helps shape the content format and structure.</p>
        </div>
      </div>

      {/* Intent Type Badge */}
      <div className="mb-4">
        <span className="text-xs font-heading font-medium text-text-muted uppercase tracking-wider">Primary Intent</span>
        <div className="mt-2 flex items-center gap-3">
          <Badge variant={intentInfo.variant} size="md">
            {intentInfo.label}
          </Badge>
          <span className="text-sm text-text-secondary">{intentInfo.description}</span>
        </div>
      </div>

      {/* Preferred Format */}
      <div className="mb-4">
        <span className="text-xs font-heading font-medium text-text-muted uppercase tracking-wider">Preferred Content Format</span>
        <div className="mt-2 p-3 bg-surface-hover rounded-radius-md border border-border-subtle">
          <p className="text-text-secondary">{searchIntent.preferred_format}</p>
        </div>
      </div>

      {/* SERP Features */}
      {searchIntent.serp_features && searchIntent.serp_features.length > 0 && (
        <div className="mb-4">
          <span className="text-xs font-heading font-medium text-text-muted uppercase tracking-wider">Expected SERP Features</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {searchIntent.serp_features.map((feature, index) => (
              <Badge key={index} variant="teal" size="sm" icon={<ZapIcon className="h-3 w-3" />}>
                {feature}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Reasoning */}
      {searchIntent.reasoning && (
        <Callout variant="ai" title="AI Reasoning" className="mt-4">
          {searchIntent.reasoning}
        </Callout>
      )}
    </Card>
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
      {/* Search Intent Classification */}
      <SearchIntentDisplay searchIntent={briefData.search_intent} />

      {/* Page Goal */}
      <Card variant="default" padding="md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-radius-md bg-teal/10 flex items-center justify-center">
            <FlagIcon className="h-5 w-5 text-teal" />
          </div>
          <div>
            <h3 className="text-base font-heading font-semibold text-text-primary">Page Goal</h3>
            <p className="text-sm text-text-muted">Define the primary purpose of this content</p>
          </div>
        </div>
        <Textarea
          id="page_goal"
          rows={3}
          value={briefData.page_goal?.value || ''}
          onChange={(e) => handleChange('page_goal', e.target.value)}
          placeholder="What should the reader do or know after reading?"
          hint="Be specific about the action or knowledge the reader should gain"
        />
        {briefData.page_goal?.reasoning && (
          <Callout variant="ai" title="AI Reasoning" className="mt-4">
            {briefData.page_goal.reasoning}
          </Callout>
        )}
      </Card>

      {/* Target Audience */}
      <Card variant="default" padding="md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-radius-md bg-teal/10 flex items-center justify-center">
            <TargetIcon className="h-5 w-5 text-teal" />
          </div>
          <div>
            <h3 className="text-base font-heading font-semibold text-text-primary">Target Audience</h3>
            <p className="text-sm text-text-muted">Describe the ideal reader</p>
          </div>
        </div>
        <Textarea
          id="target_audience"
          rows={3}
          value={briefData.target_audience?.value || ''}
          onChange={(e) => handleChange('target_audience', e.target.value)}
          placeholder="What are their roles, goals, and pain points?"
          hint="Consider demographics, experience level, and what they're trying to achieve"
        />
        {briefData.target_audience?.reasoning && (
          <Callout variant="ai" title="AI Reasoning" className="mt-4">
            {briefData.target_audience.reasoning}
          </Callout>
        )}
      </Card>
    </div>
  );
};

export default Stage1Goal;