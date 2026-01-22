import React from 'react';
import type { ContentBrief, CompetitorPage } from '../../types';
import { LightbulbIcon, FileSearchIcon } from '../Icon';

interface StageProps {
  briefData: Partial<ContentBrief>;
  setBriefData: React.Dispatch<React.SetStateAction<Partial<ContentBrief>>>;
  competitorData: CompetitorPage[];
}

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
      <div className="p-4 bg-black/20 rounded-lg border border-white/10">
        <div className="flex items-center mb-2">
          <FileSearchIcon className="h-6 w-6 mr-2 text-teal" />
          <h2 className="text-lg font-heading font-semibold text-grey">Competitive Analysis</h2>
        </div>
        <p className="text-sm text-grey/60 mb-4">AI-generated insights on the competitive landscape.</p>
        
        <div className="p-4 bg-black/30 rounded-lg border border-white/10">
          <h3 className="text-md font-heading font-medium text-grey/90 mb-1">Differentiation Summary</h3>
          <p className="text-sm text-grey/60 mb-2">What separates the top performers from the rest?</p>
          <textarea
            rows={4}
            className="w-full p-2 bg-black border border-white/20 rounded-md text-grey focus:ring-2 focus:ring-teal"
            value={insights.differentiation_summary.value}
            onChange={(e) => handleSummaryChange(e.target.value)}
          />
          <ReasoningDisplay reasoning={insights.differentiation_summary.reasoning} />
        </div>

        <div className="mt-6">
          <h3 className="text-md font-heading font-medium text-grey/90 mb-2">Competitor Breakdowns</h3>
          <div className="space-y-4">
            {insights.competitor_breakdown.map((item, index) => {
              const fullCompetitor = competitorData.find(c => c.URL === item.url);
              const bestRank = fullCompetitor?.rankings?.sort((a, b) => a.rank - b.rank)[0];

              return (
                <div key={index} className="p-4 bg-black/30 rounded-lg border border-white/10">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-teal truncate block font-heading font-semibold hover:underline" title={item.url}>{item.url}</a>
                  
                  {fullCompetitor && (
                    <div className="mt-2 flex items-center space-x-4 text-xs text-grey/60 border-t border-white/10 pt-2">
                      <span className="font-semibold">Score: <span className="font-bold text-grey">{fullCompetitor.Weighted_Score.toLocaleString()}</span></span>
                      {bestRank && (
                        <span className="truncate">Best Rank: <span className="font-bold text-grey">#{bestRank.rank}</span> for "{bestRank.keyword}"</span>
                      )}
                    </div>
                  )}

                  <label className="block text-xs font-heading font-medium text-grey/60 mt-3 mb-1">Description</label>
                  <textarea
                      rows={2}
                      className="w-full p-2 bg-black border border-white/20 rounded-md text-grey text-sm focus:ring-2 focus:ring-teal"
                      value={item.description}
                      onChange={(e) => handleBreakdownChange(index, 'description', e.target.value)}
                  />
                  <label className="block text-xs font-heading font-medium text-teal mt-3 mb-1">The Good (What we should replicate)</label>
                  <textarea
                      rows={3}
                      className="w-full p-2 bg-black border border-white/20 rounded-md text-grey text-sm focus:ring-2 focus:ring-teal"
                      value={item.good_points.join('\n')}
                      onChange={(e) => handleBreakdownChange(index, 'good_points', e.target.value.split('\n'))}
                      placeholder="One point per line..."
                  />
                  <label className="block text-xs font-heading font-medium text-yellow mt-3 mb-1">The Bad (Where we can improve)</label>
                  <textarea
                      rows={3}
                      className="w-full p-2 bg-black border border-white/20 rounded-md text-grey text-sm focus:ring-2 focus:ring-teal"
                      value={item.bad_points.join('\n')}
                      onChange={(e) => handleBreakdownChange(index, 'bad_points', e.target.value.split('\n'))}
                      placeholder="One point per line..."
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stage3CompetitorAnalysis;