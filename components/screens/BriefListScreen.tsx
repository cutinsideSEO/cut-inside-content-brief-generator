// Brief List Screen - View and manage briefs for a client
import React, { useState, useEffect } from 'react';
import { getBriefsForClient, archiveBrief, createBrief } from '../../services/briefService';
import type { BriefWithClient } from '../../types/database';
import BriefListCard from '../briefs/BriefListCard';
import Button from '../Button';
import Spinner from '../Spinner';

// Generation status type (matches AppWrapper)
type GenerationStatus = 'idle' | 'generating_brief' | 'generating_content';

interface BriefListScreenProps {
  clientId: string;
  clientName: string;
  onBack: () => void;
  onCreateBrief: () => void;
  onContinueBrief: (briefId: string) => void;
  onEditBrief: (briefId: string) => void;
  onUseAsTemplate: (briefId: string) => void;
  // Background generation props
  generatingBriefId?: string | null;
  generationStatus?: GenerationStatus;
  generationStep?: number | null;
}

const BriefListScreen: React.FC<BriefListScreenProps> = ({
  clientId,
  clientName,
  onBack,
  onCreateBrief,
  onContinueBrief,
  onEditBrief,
  onUseAsTemplate,
  generatingBriefId,
  generationStatus,
  generationStep,
}) => {
  const [briefs, setBriefs] = useState<BriefWithClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'in_progress' | 'complete'>('all');

  // Fetch briefs on mount and when clientId changes
  useEffect(() => {
    loadBriefs();
  }, [clientId]);

  const loadBriefs = async () => {
    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await getBriefsForClient(clientId);

    if (fetchError) {
      setError(fetchError);
    } else {
      setBriefs(data || []);
    }

    setIsLoading(false);
  };

  const handleArchive = async (briefId: string) => {
    const confirmed = window.confirm('Are you sure you want to archive this brief?');
    if (!confirmed) return;

    const { error: archiveError } = await archiveBrief(briefId);

    if (archiveError) {
      setError(`Failed to archive: ${archiveError}`);
      return;
    }

    // Remove from local list
    setBriefs((prev) => prev.filter((b) => b.id !== briefId));
  };

  // Filter and search briefs
  const filteredBriefs = briefs.filter((brief) => {
    // Filter by status
    if (filterStatus !== 'all' && brief.status !== filterStatus) {
      return false;
    }

    // Search by name
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = brief.name.toLowerCase().includes(query);
      const matchesKeywords = brief.keywords?.some((k) =>
        k.kw.toLowerCase().includes(query)
      );
      return matchesName || matchesKeywords;
    }

    return true;
  });

  // Group briefs by status for better organization
  const draftBriefs = filteredBriefs.filter((b) => b.status === 'draft');
  const inProgressBriefs = filteredBriefs.filter((b) => b.status === 'in_progress');
  const completeBriefs = filteredBriefs.filter((b) => b.status === 'complete');

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            onClick={onBack}
            className="mr-4 p-2 rounded-lg text-grey hover:text-brand-white hover:bg-white/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-heading font-bold text-brand-white">
              {clientName}
            </h1>
            <p className="text-grey mt-0.5">
              {briefs.length} {briefs.length === 1 ? 'brief' : 'briefs'}
            </p>
          </div>
        </div>
        <Button variant="primary" onClick={onCreateBrief}>
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Brief
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-grey"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search briefs by name or keywords..."
            className="w-full pl-10 pr-4 py-2 bg-black/50 border border-white/20 rounded-lg text-brand-white placeholder-grey/50 focus:outline-none focus:border-teal focus:ring-1 focus:ring-teal"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'draft', 'in_progress', 'complete'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${filterStatus === status
                  ? 'bg-teal/20 text-teal border border-teal/30'
                  : 'bg-black/30 text-grey border border-white/10 hover:border-white/20'
                }
              `}
            >
              {status === 'all' ? 'All' : status === 'in_progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-red-400 text-sm">{error}</p>
          <Button variant="secondary" size="sm" onClick={loadBriefs} className="mt-2">
            Try Again
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <Spinner size="lg" />
          <p className="text-grey mt-4">Loading briefs...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && briefs.length === 0 && (
        <div className="text-center py-16 bg-black/20 rounded-lg border border-white/5">
          <svg
            className="mx-auto h-12 w-12 text-grey/50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-heading font-semibold text-brand-white">
            No briefs yet
          </h3>
          <p className="mt-2 text-grey">
            Create your first content brief for {clientName}.
          </p>
          <Button
            variant="primary"
            onClick={onCreateBrief}
            className="mt-6"
          >
            Create First Brief
          </Button>
        </div>
      )}

      {/* No results from filter */}
      {!isLoading && !error && briefs.length > 0 && filteredBriefs.length === 0 && (
        <div className="text-center py-12 bg-black/20 rounded-lg border border-white/5">
          <p className="text-grey">No briefs match your search or filter.</p>
          <Button
            variant="secondary"
            onClick={() => {
              setSearchQuery('');
              setFilterStatus('all');
            }}
            className="mt-4"
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Brief list */}
      {!isLoading && !error && filteredBriefs.length > 0 && (
        <div className="space-y-8">
          {/* In Progress Section */}
          {inProgressBriefs.length > 0 && (filterStatus === 'all' || filterStatus === 'in_progress') && (
            <section>
              <h2 className="text-lg font-heading font-semibold text-brand-white mb-4 flex items-center">
                <span className="w-2 h-2 bg-yellow rounded-full mr-2" />
                In Progress ({inProgressBriefs.length})
              </h2>
              <div className="space-y-3">
                {inProgressBriefs.map((brief) => (
                  <BriefListCard
                    key={brief.id}
                    brief={brief}
                    onContinue={onContinueBrief}
                    onEdit={onEditBrief}
                    onUseAsTemplate={onUseAsTemplate}
                    onArchive={handleArchive}
                    isGenerating={brief.id === generatingBriefId}
                    generationStatus={generationStatus}
                    generationStep={generationStep}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Draft Section */}
          {draftBriefs.length > 0 && (filterStatus === 'all' || filterStatus === 'draft') && (
            <section>
              <h2 className="text-lg font-heading font-semibold text-brand-white mb-4 flex items-center">
                <span className="w-2 h-2 bg-grey rounded-full mr-2" />
                Drafts ({draftBriefs.length})
              </h2>
              <div className="space-y-3">
                {draftBriefs.map((brief) => (
                  <BriefListCard
                    key={brief.id}
                    brief={brief}
                    onContinue={onContinueBrief}
                    onEdit={onEditBrief}
                    onUseAsTemplate={onUseAsTemplate}
                    onArchive={handleArchive}
                    isGenerating={brief.id === generatingBriefId}
                    generationStatus={generationStatus}
                    generationStep={generationStep}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Complete Section */}
          {completeBriefs.length > 0 && (filterStatus === 'all' || filterStatus === 'complete') && (
            <section>
              <h2 className="text-lg font-heading font-semibold text-brand-white mb-4 flex items-center">
                <span className="w-2 h-2 bg-teal rounded-full mr-2" />
                Complete ({completeBriefs.length})
              </h2>
              <div className="space-y-3">
                {completeBriefs.map((brief) => (
                  <BriefListCard
                    key={brief.id}
                    brief={brief}
                    onContinue={onContinueBrief}
                    onEdit={onEditBrief}
                    onUseAsTemplate={onUseAsTemplate}
                    onArchive={handleArchive}
                    isGenerating={brief.id === generatingBriefId}
                    generationStatus={generationStatus}
                    generationStep={generationStep}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default BriefListScreen;
