import React from 'react';
import type { ContentBrief, CompetitorPage } from '../../types';
import { ExternalLinkIcon } from '../Icon';
import { Badge, AIReasoningIcon, EditableText, Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui';

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
    <div className="space-y-8">
      {/* Differentiation Summary */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-sm font-heading font-semibold text-gray-600 uppercase tracking-wider">
            Differentiation Summary
          </h3>
          {insights.differentiation_summary.reasoning && (
            <AIReasoningIcon reasoning={insights.differentiation_summary.reasoning} />
          )}
        </div>
        <EditableText
          value={insights.differentiation_summary.value}
          onChange={handleSummaryChange}
          placeholder="Summary of key differentiators..."
        />
      </div>

      {/* Competitor Breakdowns */}
      <div className="border-t border-gray-100 pt-8">
        <h3 className="text-sm font-heading font-semibold text-gray-600 uppercase tracking-wider mb-4">
          Competitor Breakdowns
        </h3>

        {insights.competitor_breakdown.length > 0 ? (
          <Accordion type="single" collapsible defaultValue="item-0" className="space-y-1">
            {insights.competitor_breakdown.map((item, index) => {
              const fullCompetitor = competitorData.find(c => c.URL === item.url);
              const bestRank = fullCompetitor?.rankings?.sort((a, b) => a.rank - b.rank)[0];

              return (
                <AccordionItem key={index} value={`item-${index}`} className="border-b border-gray-100 last:border-b-0">
                  <AccordionTrigger className="w-full flex items-center gap-3 py-3 hover:bg-gray-100 transition-colors text-left rounded-sm hover:no-underline">
                    <span className="text-sm font-heading font-medium text-teal truncate flex-1" title={item.url}>
                      {item.url}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {bestRank && (
                        <span className="text-xs text-gray-400">
                          #{bestRank.rank} for "{bestRank.keyword}"
                        </span>
                      )}
                      {fullCompetitor && (
                        <Badge variant="teal" size="sm">
                          {fullCompetitor.Weighted_Score.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-7 pb-4 pt-1">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal text-sm hover:underline flex items-center gap-1 mb-4"
                      >
                        Open in new tab
                        <ExternalLinkIcon className="h-3 w-3" />
                      </a>

                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-heading font-medium text-gray-400 uppercase tracking-wider mb-2">Description</label>
                          <EditableText
                            value={item.description}
                            onChange={(val) => handleBreakdownChange(index, 'description', val)}
                            placeholder="Brief description of this competitor..."
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-heading font-medium text-emerald-500 uppercase tracking-wider mb-2">
                              Strengths
                            </label>
                            <EditableText
                              value={item.good_points.join('\n')}
                              onChange={(val) => handleBreakdownChange(index, 'good_points', val.split('\n'))}
                              placeholder="One point per line..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-heading font-medium text-amber-500 uppercase tracking-wider mb-2">
                              Weaknesses
                            </label>
                            <EditableText
                              value={item.bad_points.join('\n')}
                              onChange={(val) => handleBreakdownChange(index, 'bad_points', val.split('\n'))}
                              placeholder="One point per line..."
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p>No competitor insights available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Stage3CompetitorAnalysis;
