import React, { useState } from 'react';
import type { ContentBrief, CompetitorPage } from '../../types';
import { ExternalLinkIcon, ChevronDownIcon } from '../Icon';
import { Badge, AIReasoningIcon, EditableText, Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui';

interface StageProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
  competitorData: CompetitorPage[];
}

const Stage3CompetitorAnalysis: React.FC<StageProps> = ({ briefData, setBriefData, competitorData }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);

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

  const toggleExpand = (index: number) => {
    setExpandedIndex(prev => prev === index ? null : index);
  };

  return (
    <div className="space-y-8">
      {/* Differentiation Summary */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-base font-heading font-semibold text-foreground">
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
      <div>
        <h3 className="text-base font-heading font-semibold text-foreground mb-4">
          Competitor Breakdowns
        </h3>

        {insights.competitor_breakdown.length > 0 ? (
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/50">
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Competitor</TableHead>
                  <TableHead>Best Ranking</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insights.competitor_breakdown.map((item, index) => {
                  const fullCompetitor = competitorData.find(c => c.URL === item.url);
                  const bestRank = fullCompetitor?.rankings?.sort((a, b) => a.rank - b.rank)[0];
                  const isExpanded = expandedIndex === index;

                  return (
                    <React.Fragment key={index}>
                      {/* Summary row */}
                      <TableRow
                        className="cursor-pointer hover:bg-secondary/30 transition-colors"
                        onClick={() => toggleExpand(index)}
                      >
                        <TableCell className="w-10">
                          <ChevronDownIcon className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </TableCell>
                        <TableCell>
                          <span className="text-teal font-medium text-sm truncate block max-w-xs" title={item.url}>
                            {item.url}
                          </span>
                        </TableCell>
                        <TableCell>
                          {bestRank ? (
                            <span className="text-sm text-muted-foreground">
                              #{bestRank.rank} for "{bestRank.keyword}"
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {fullCompetitor && (
                            <Badge variant="teal" size="sm">
                              {fullCompetitor.Weighted_Score.toLocaleString()}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={4} className="p-0">
                            <div className="border-t border-border bg-card p-5 space-y-4">
                              {/* URL link */}
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-teal text-sm hover:underline inline-flex items-center gap-1"
                              >
                                Open in new tab
                                <ExternalLinkIcon className="h-3 w-3" />
                              </a>

                              {/* Description */}
                              <div className="border-t border-border pt-4">
                                <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</label>
                                <EditableText
                                  value={item.description}
                                  onChange={(val) => handleBreakdownChange(index, 'description', val)}
                                  placeholder="Brief description of this competitor..."
                                />
                              </div>

                              {/* Strengths & Weaknesses in 2-col grid */}
                              <div className="border-t border-border pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {/* Strengths */}
                                  <div>
                                    <label className="block text-xs font-heading font-semibold text-emerald-500 uppercase tracking-wider mb-2">
                                      Strengths
                                    </label>
                                    {item.good_points.length > 0 ? (
                                      <ul className="space-y-1.5 mb-2">
                                        {item.good_points.map((point, i) => (
                                          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5"></span>
                                            {point}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : null}
                                    <EditableText
                                      value={item.good_points.join('\n')}
                                      onChange={(val) => handleBreakdownChange(index, 'good_points', val.split('\n').filter(Boolean))}
                                      placeholder="One point per line..."
                                      textClassName="text-foreground text-sm leading-relaxed opacity-0 h-0 overflow-hidden group-hover:opacity-100 group-hover:h-auto"
                                    />
                                  </div>

                                  {/* Weaknesses */}
                                  <div className="md:border-l md:border-border md:pl-6">
                                    <label className="block text-xs font-heading font-semibold text-amber-500 uppercase tracking-wider mb-2">
                                      Weaknesses
                                    </label>
                                    {item.bad_points.length > 0 ? (
                                      <ul className="space-y-1.5 mb-2">
                                        {item.bad_points.map((point, i) => (
                                          <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5"></span>
                                            {point}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : null}
                                    <EditableText
                                      value={item.bad_points.join('\n')}
                                      onChange={(val) => handleBreakdownChange(index, 'bad_points', val.split('\n').filter(Boolean))}
                                      placeholder="One point per line..."
                                      textClassName="text-foreground text-sm leading-relaxed opacity-0 h-0 overflow-hidden group-hover:opacity-100 group-hover:h-auto"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>No competitor insights available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Stage3CompetitorAnalysis;
