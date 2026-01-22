import React, { useState, useMemo } from 'react';
import type { CompetitorPage } from '../../types';
import Button from '../Button';
import { BarChartIcon, StarIcon } from '../Icon';

interface CompetitionVizScreenProps {
  competitorData: CompetitorPage[];
  topKeywords: { kw: string, volume: number }[];
  onProceed: () => void;
  onToggleStar: (url: string) => void;
  onFeelingLucky: () => void;
}

type SortKey = 'Weighted_Score' | 'Word_Count' | string; // string for dynamic keyword keys

const StatCard: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
    <div className="bg-black/50 p-4 rounded-lg border border-white/10">
        <p className="text-sm text-grey/60 font-heading">{title}</p>
        <p className="text-2xl font-bold font-heading text-grey">{value}</p>
    </div>
);

const CompetitionVizScreen: React.FC<CompetitionVizScreenProps> = ({ competitorData, topKeywords, onProceed, onToggleStar, onFeelingLucky }) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'Weighted_Score', direction: 'descending' });
  
  const { sortedCompetitors, maxScore, maxWordCount, avgScore, avgWordCount } = useMemo(() => {
    if (competitorData.length === 0) {
        return { sortedCompetitors: [], maxScore: 0, maxWordCount: 0, avgScore: 0, avgWordCount: 0 };
    }

    let sortableItems = [...competitorData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: number | string;
        let bValue: number | string;
        
        if (sortConfig.key === 'Weighted_Score' || sortConfig.key === 'Word_Count') {
          aValue = a[sortConfig.key];
          bValue = b[sortConfig.key];
        } else {
          // Handle keyword ranking sort
          const aRank = a.rankings.find(r => r.keyword === sortConfig.key)?.rank || 999;
          const bRank = b.rankings.find(r => r.keyword === sortConfig.key)?.rank || 999;
          aValue = aRank;
          bValue = bRank;
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    const scores = competitorData.map(c => c.Weighted_Score);
    const wordCounts = competitorData.map(c => c.Word_Count);

    return {
        sortedCompetitors: sortableItems,
        maxScore: Math.max(...scores),
        maxWordCount: Math.max(...wordCounts),
        avgScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        avgWordCount: Math.round(wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length),
    };
  }, [competitorData, sortConfig]);

  const requestSort = (key: SortKey) => {
    let direction: 'ascending' | 'descending' = 'descending';
     if (!['Weighted_Score', 'Word_Count'].includes(key)) { // Keyword ranks should sort ascending by default
        direction = 'ascending';
     }
    if (sortConfig.key === key && sortConfig.direction === direction) {
      direction = direction === 'ascending' ? 'descending' : 'ascending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return ' ↕';
    return sortConfig.direction === 'descending' ? ' ▼' : ' ▲';
  };

  return (
    <div className="animate-fade-in">
        <div className="flex items-center mb-4">
            <BarChartIcon className="h-8 w-8 mr-3 text-teal" />
            <div>
                <h1 className="text-2xl font-heading font-bold text-grey">Competitive Landscape</h1>
                <p className="text-md text-grey/70">Analysis complete. Star competitors you want the AI to prioritize.</p>
            </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard title="Competitors Analyzed" value={competitorData.length} />
            <StatCard title="Average Score" value={avgScore.toLocaleString()} />
            <StatCard title="Average Word Count" value={avgWordCount.toLocaleString()} />
        </div>

        <div className="overflow-x-auto bg-black/30 p-4 rounded-lg border border-white/10">
            <table className="w-full min-w-max text-left text-sm">
                <thead className="bg-black/70">
                    <tr>
                        <th className="p-3 font-heading font-semibold text-grey/80 w-12"></th>
                        <th className="p-3 font-heading font-semibold text-grey/80 w-2/5">Competitor URL</th>
                        <th className="p-3 font-heading font-semibold text-grey/80 cursor-pointer" onClick={() => requestSort('Weighted_Score')}>
                            Score{getSortIndicator('Weighted_Score')}
                        </th>
                        <th className="p-3 font-heading font-semibold text-grey/80 cursor-pointer" onClick={() => requestSort('Word_Count')}>
                            Words{getSortIndicator('Word_Count')}
                        </th>
                        {topKeywords.map(({ kw }) => (
                            <th key={kw} className="p-3 font-heading font-semibold text-grey/80 cursor-pointer truncate max-w-xs" onClick={() => requestSort(kw)} title={kw}>
                                Rank: "{kw}"{getSortIndicator(kw)}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                    {sortedCompetitors.map((competitor) => (
                        <tr key={competitor.URL} className="hover:bg-white/5 transition-colors">
                            <td className="p-3 text-center">
                                <button onClick={() => onToggleStar(competitor.URL)} className="p-1 group" title="Star this competitor">
                                    <StarIcon className={`h-5 w-5 transition-all duration-200 ${competitor.is_starred ? 'text-yellow fill-yellow shadow-glow-yellow' : 'text-grey/40 group-hover:text-yellow'}`} />
                                </button>
                            </td>
                            <td className="p-3 text-teal truncate max-w-xs" title={competitor.URL}>
                                <a href={competitor.URL} target="_blank" rel="noopener noreferrer">{competitor.URL}</a>
                            </td>
                            <td className="p-3 font-bold text-lg text-grey">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-teal/20 rounded-md" style={{ width: `${(competitor.Weighted_Score / maxScore) * 100}%`}}></div>
                                    <span className="relative px-2">{competitor.Weighted_Score.toLocaleString()}</span>
                                </div>
                            </td>
                             <td className="p-3 text-grey/80">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-white/10 rounded-md" style={{ width: `${(competitor.Word_Count / maxWordCount) * 100}%`}}></div>
                                    <span className="relative px-2">{competitor.Word_Count.toLocaleString()}</span>
                                </div>
                            </td>
                            {topKeywords.map(({ kw }) => {
                                const ranking = competitor.rankings.find(r => r.keyword === kw);
                                return (
                                    <td key={`${competitor.URL}-${kw}`} className="p-3 text-center font-medium">
                                        {ranking ? (
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ranking.rank <= 3 ? 'bg-teal/20 text-teal' : ranking.rank <= 10 ? 'bg-yellow/20 text-yellow' : 'bg-grey/10 text-grey/60'}`}>
                                                #{ranking.rank}
                                            </span>
                                        ) : (
                                            <span className="text-grey/40">-</span>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        <div className="mt-8 flex justify-end items-center space-x-4">
            <Button onClick={onFeelingLucky} variant="secondary">
                I'm Feeling Lucky ✨
            </Button>
            <Button onClick={onProceed}>
                Continue to Brief Creation
            </Button>
        </div>
    </div>
  );
};

export default CompetitionVizScreen;