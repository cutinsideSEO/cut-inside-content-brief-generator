import React from 'react';
import type { ContentBrief, CompetitorPage } from '../../types';
import { FileSearchIcon, ExternalLinkIcon } from '../Icon';
import { Card, Badge, Callout, Textarea } from '../ui';

interface StageProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
  competitorData: CompetitorPage[];
}

const Stage3CompetitorAnalysis: React.FC<StageProps> = ({ briefData, setBriefData, competitorData }) => {
  const insights = briefData.competitor_insights || {
    competitor_breakdown: [],
    differentiation_summary: { value: '', reasoning: '' }
  };

  const handleSummaryChange = (value: string) => {
    setBriefData(prev => ({
      ...prev,
      competitor_insights: {
        ...insights,
        differentiation_summary: {
          ...insights.differentiation_summary,
          value: value
        }
      }
    }));
  };

  const handleBreakdownChange = (index: number, field: 'description' | 'good_points' | 'bad_points', value: string | string[]) => {
    setBriefData(prev => {
      const newBreakdown = [...insights.competitor_breakdown];
      // @ts-ignore
      newBreakdown[index][field] = value;
      return {
        ...prev,
        competitor_insights: {
          ...insights,
          competitor_breakdown: newBreakdown
        }
      };
    });
  };

  return (
    <div className="space-y-6">
      <Card variant="default" padding="md">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-radius-md bg-teal/10 flex items-center justify-center">
            <FileSearchIcon className="h-5 w-5 text-teal" />
          </div>
          <div>
            <h3 className="text-base font-heading font-semibold text-text-primary">Competitive Analysis</h3>
            <p className="text-sm text-text-muted">AI-generated insights on the competitive landscape</p>
          </div>
        </div>

        {/* Differentiation Summary */}
        <Card variant="outline" padding="md" className="mb-6">
          <h4 className="text-sm font-heading font-semibold text-text-primary mb-2">Differentiation Summary</h4>
          <p className="text-sm text-text-muted mb-3">What separates the top performers from the rest?</p>
          <Textarea
            rows={4}
            value={insights.differentiation_summary.value}
            onChange={(e) => handleSummaryChange(e.target.value)}
            placeholder="Summary of key differentiators..."
          />
          {insights.differentiation_summary.reasoning && (
            <Callout variant="ai" title="AI Reasoning" className="mt-4">
              {insights.differentiation_summary.reasoning}
            </Callout>
          )}
        </Card>

        {/* Competitor Breakdowns */}
        <div>
          <h4 className="text-sm font-heading font-semibold text-text-primary mb-4">Competitor Breakdowns</h4>
          <div className="space-y-4">
            {insights.competitor_breakdown.map((item, index) => {
              const fullCompetitor = competitorData.find(c => c.URL === item.url);
              const bestRank = fullCompetitor?.rankings?.sort((a, b) => a.rank - b.rank)[0];

              return (
                <Card key={index} variant="outline" padding="md">
                  <div className="flex items-center justify-between mb-3">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal font-heading font-semibold hover:underline flex items-center gap-2 truncate max-w-[80%]"
                      title={item.url}
                    >
                      <span className="truncate">{item.url}</span>
                      <ExternalLinkIcon className="h-4 w-4 flex-shrink-0" />
                    </a>
                    {fullCompetitor && (
                      <Badge variant="teal" size="sm">
                        Score: {fullCompetitor.Weighted_Score.toLocaleString()}
                      </Badge>
                    )}
                  </div>

                  {fullCompetitor && bestRank && (
                    <div className="mb-4 text-xs text-text-muted border-b border-border-subtle pb-3">
                      Best Rank: <span className="font-semibold text-text-secondary">#{bestRank.rank}</span> for "{bestRank.keyword}"
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-heading font-medium text-text-muted uppercase tracking-wider mb-2">Description</label>
                      <Textarea
                        rows={2}
                        value={item.description}
                        onChange={(e) => handleBreakdownChange(index, 'description', e.target.value)}
                        placeholder="Brief description of this competitor..."
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-heading font-medium text-status-complete uppercase tracking-wider mb-2">
                          The Good (What we should replicate)
                        </label>
                        <Textarea
                          rows={3}
                          value={item.good_points.join('\n')}
                          onChange={(e) => handleBreakdownChange(index, 'good_points', e.target.value.split('\n'))}
                          placeholder="One point per line..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-heading font-medium text-status-generating uppercase tracking-wider mb-2">
                          The Bad (Where we can improve)
                        </label>
                        <Textarea
                          rows={3}
                          value={item.bad_points.join('\n')}
                          onChange={(e) => handleBreakdownChange(index, 'bad_points', e.target.value.split('\n'))}
                          placeholder="One point per line..."
                        />
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>

        {insights.competitor_breakdown.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            <p>No competitor insights available yet.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Stage3CompetitorAnalysis;
