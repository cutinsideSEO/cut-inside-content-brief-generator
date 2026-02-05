import React, { useState, useMemo } from 'react';
import type { CompetitorPage } from '../../types';
import Button from '../Button';
import { BarChartIcon, StarIcon } from '../Icon';
import { Card, Badge } from '../ui';

interface CompetitionVizScreenProps {
  competitorData: CompetitorPage[];
  topKeywords: { kw: string, volume: number }[];
  onProceed: () => void;
  onToggleStar: (url: string) => void;
  onFeelingLucky: () => void;
}

type SortKey = 'Weighted_Score' | 'Word_Count' | string; // string for dynamic keyword keys

const StatCard: React.FC<{ title: string; value: string | number; highlight?: boolean }> = ({ title, value, highlight }) => (
    <Card variant="default" padding="md" className={highlight ? 'border-teal/30' : ''}>
        <p className="text-sm text-gray-400 font-heading">{title}</p>
        <p className={`text-2xl font-bold font-heading ${highlight ? 'text-teal' : 'text-gray-900'}`}>{value}</p>
    </Card>
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
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-lg bg-teal/10 flex items-center justify-center">
                <BarChartIcon className="h-6 w-6 text-teal" />
            </div>
            <div>
                <h1 className="text-2xl font-heading font-bold text-gray-900">Competitive Landscape</h1>
                <p className="text-md text-gray-600">Analysis complete. Star competitors you want the AI to prioritize.</p>
            </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard title="Competitors Analyzed" value={competitorData.length} highlight />
            <StatCard title="Average Score" value={avgScore.toLocaleString()} />
            <StatCard title="Average Word Count" value={avgWordCount.toLocaleString()} />
            <StatCard title="Top Keywords" value={topKeywords.length} />
        </div>

        {/* Competitor Table */}
        <Card variant="default" padding="none" className="overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full min-w-max text-left text-sm">
                    <thead className="bg-gray-100 border-b border-gray-200">
                        <tr>
                            <th className="p-4 font-heading font-semibold text-gray-600 w-12"></th>
                            <th className="p-4 font-heading font-semibold text-gray-600 w-2/5">Competitor URL</th>
                            <th
                                className="p-4 font-heading font-semibold text-gray-600 cursor-pointer hover:text-teal transition-colors"
                                onClick={() => requestSort('Weighted_Score')}
                            >
                                Score{getSortIndicator('Weighted_Score')}
                            </th>
                            <th
                                className="p-4 font-heading font-semibold text-gray-600 cursor-pointer hover:text-teal transition-colors"
                                onClick={() => requestSort('Word_Count')}
                            >
                                Words{getSortIndicator('Word_Count')}
                            </th>
                            {topKeywords.map(({ kw }) => (
                                <th
                                    key={kw}
                                    className="p-4 font-heading font-semibold text-gray-600 cursor-pointer hover:text-teal transition-colors truncate max-w-xs"
                                    onClick={() => requestSort(kw)}
                                    title={kw}
                                >
                                    Rank: "{kw}"{getSortIndicator(kw)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                        {sortedCompetitors.map((competitor) => (
                            <tr key={competitor.URL} className="hover:bg-gray-100 transition-colors">
                                <td className="p-4 text-center">
                                    <button
                                        onClick={() => onToggleStar(competitor.URL)}
                                        className="p-1 group rounded-sm hover:bg-gray-200 transition-colors"
                                        title="Star this competitor"
                                    >
                                        <StarIcon className={`h-5 w-5 transition-all duration-200 ${
                                            competitor.is_starred
                                                ? 'text-amber-500 fill-yellow drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]'
                                                : 'text-gray-400 group-hover:text-amber-500'
                                        }`} />
                                    </button>
                                </td>
                                <td className="p-4 truncate max-w-xs" title={competitor.URL}>
                                    <a
                                        href={competitor.URL}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-teal hover:text-teal/80 hover:underline transition-colors"
                                    >
                                        {competitor.URL}
                                    </a>
                                </td>
                                <td className="p-4 font-bold text-lg text-gray-900">
                                    <div className="relative flex items-center">
                                        <div
                                            className="absolute inset-y-0 left-0 bg-teal/20 rounded-sm"
                                            style={{ width: `${(competitor.Weighted_Score / maxScore) * 100}%`}}
                                        />
                                        <span className="relative px-2">{competitor.Weighted_Score.toLocaleString()}</span>
                                    </div>
                                </td>
                                <td className="p-4 text-gray-600">
                                    <div className="relative flex items-center">
                                        <div
                                            className="absolute inset-y-0 left-0 bg-gray-200 rounded-sm"
                                            style={{ width: `${(competitor.Word_Count / maxWordCount) * 100}%`}}
                                        />
                                        <span className="relative px-2">{competitor.Word_Count.toLocaleString()}</span>
                                    </div>
                                </td>
                                {topKeywords.map(({ kw }) => {
                                    const ranking = competitor.rankings.find(r => r.keyword === kw);
                                    return (
                                        <td key={`${competitor.URL}-${kw}`} className="p-4 text-center">
                                            {ranking ? (
                                                <Badge
                                                    variant={ranking.rank <= 3 ? 'success' : ranking.rank <= 10 ? 'warning' : 'default'}
                                                    size="sm"
                                                >
                                                    #{ranking.rank}
                                                </Badge>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </Card>

        {/* Action Buttons */}
        <div className="mt-8 flex justify-end items-center gap-4">
            <Button onClick={onFeelingLucky} variant="secondary" size="lg">
                I'm Feeling Lucky
            </Button>
            <Button onClick={onProceed} size="lg" glow>
                Continue to Brief Creation
            </Button>
        </div>
    </div>
  );
};

export default CompetitionVizScreen;
