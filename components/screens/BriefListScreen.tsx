// Brief List Screen - View and manage briefs for a client
import React, { useState, useEffect, useMemo } from 'react';
import { getBriefsForClient, archiveBrief, deleteBrief } from '../../services/briefService';
import { getArticlesForClient, deleteArticle } from '../../services/articleService';
import { toast } from 'sonner';
import type { BriefWithClient, ArticleWithBrief } from '../../types/database';
import BriefListCard from '../briefs/BriefListCard';
import ArticleListCard from '../articles/ArticleListCard';
import Button from '../Button';
import { Card, Input, Alert, Tabs, Skeleton, Modal } from '../ui';

// Generation status type (matches AppWrapper)
type GenerationStatus = 'idle' | 'analyzing_competitors' | 'generating_brief' | 'generating_content';

// Type for tracking individual generation (matches AppWrapper)
interface GeneratingBrief {
  clientId: string;
  clientName: string;
  status: GenerationStatus;
  step: number | null;
}

interface BriefListScreenProps {
  clientId: string;
  clientName: string;
  onBack: () => void;
  onCreateBrief: () => void;
  onContinueBrief: (briefId: string) => void;
  onEditBrief: (briefId: string) => void;
  onUseAsTemplate: (briefId: string) => void;
  // Background generation props - now supports multiple parallel generations
  generatingBriefs?: Record<string, GeneratingBrief>;
  // Article navigation
  onViewArticle: (articleId: string) => void;
}

type FilterStatus = 'all' | 'draft' | 'in_progress' | 'complete';

const BriefListScreen: React.FC<BriefListScreenProps> = ({
  clientId,
  clientName,
  onBack,
  onCreateBrief,
  onContinueBrief,
  onEditBrief,
  onUseAsTemplate,
  generatingBriefs = {},
  onViewArticle,
}) => {
  const [briefs, setBriefs] = useState<BriefWithClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [activeTab, setActiveTab] = useState<'briefs' | 'articles'>('briefs');
  const [articles, setArticles] = useState<ArticleWithBrief[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState<string | null>(null);

  // Sort state
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'modified' | 'name'>('newest');

  // Bulk selection state
  const [selectedBriefs, setSelectedBriefs] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Load-more pagination
  const [visibleCount, setVisibleCount] = useState(20);
  const BRIEF_PAGE_SIZE = 20;

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

  const handleArchiveClick = (briefId: string) => {
    setArchiveConfirm(briefId);
  };

  const handleArchiveConfirmed = async () => {
    if (!archiveConfirm) return;
    const briefId = archiveConfirm;
    setArchiveConfirm(null);

    const { error: archiveError } = await archiveBrief(briefId);

    if (archiveError) {
      setError(`Failed to archive: ${archiveError}`);
      return;
    }

    // Remove from local list
    setBriefs((prev) => prev.filter((b) => b.id !== briefId));
  };

  // Bulk selection helpers
  const toggleBriefSelection = (briefId: string) => {
    setSelectedBriefs(prev => {
      const next = new Set(prev);
      if (next.has(briefId)) {
        next.delete(briefId);
      } else {
        next.add(briefId);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedBriefs(new Set());

  const handleBulkArchive = async () => {
    const ids: string[] = [...selectedBriefs];
    let failed = 0;
    for (const id of ids) {
      const { error: archiveError } = await archiveBrief(id);
      if (archiveError) failed++;
    }
    setBriefs(prev => prev.filter(b => !selectedBriefs.has(b.id) || failed > 0));
    toast.success(`Archived ${ids.length - failed} brief${ids.length - failed !== 1 ? 's' : ''}`);
    if (failed > 0) toast.error(`Failed to archive ${failed} brief${failed !== 1 ? 's' : ''}`);
    clearSelection();
  };

  const handleBulkDelete = async () => {
    const ids: string[] = [...selectedBriefs];
    let failed = 0;
    for (const id of ids) {
      const { error: deleteError } = await deleteBrief(id);
      if (deleteError) failed++;
    }
    setBriefs(prev => prev.filter(b => !selectedBriefs.has(b.id)));
    toast.success(`Deleted ${ids.length - failed} brief${ids.length - failed !== 1 ? 's' : ''}`);
    if (failed > 0) toast.error(`Failed to delete ${failed} brief${failed !== 1 ? 's' : ''}`);
    clearSelection();
    setShowBulkDeleteConfirm(false);
  };

  // Load articles when articles tab is active
  useEffect(() => {
    if (activeTab === 'articles') {
      loadArticles();
    }
  }, [activeTab, clientId]);

  const loadArticles = async () => {
    setArticlesLoading(true);
    const { data, error: fetchError } = await getArticlesForClient(clientId);
    if (!fetchError && data) {
      setArticles(data);
    }
    setArticlesLoading(false);
  };

  const handleDeleteArticle = async (articleId: string) => {
    const { error: deleteError } = await deleteArticle(articleId);
    if (!deleteError) {
      setArticles(prev => prev.filter(a => a.id !== articleId));
    }
  };

  // Filter, search, and sort briefs
  const filteredBriefs = useMemo(() => {
    let result = briefs.filter((brief) => {
      if (filterStatus !== 'all' && brief.status !== filterStatus) {
        return false;
      }
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

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'modified':
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
    });

    return result;
  }, [briefs, filterStatus, searchQuery, sortBy]);

  // Count briefs by status
  const counts = {
    all: briefs.length,
    draft: briefs.filter((b) => b.status === 'draft').length,
    in_progress: briefs.filter((b) => b.status === 'in_progress').length,
    complete: briefs.filter((b) => b.status === 'complete').length,
  };

  // Paginated briefs
  const paginatedBriefs = filteredBriefs.slice(0, visibleCount);
  const hasMoreBriefs = filteredBriefs.length > visibleCount;

  // Group paginated briefs by status for better organization
  const draftBriefs = paginatedBriefs.filter((b) => b.status === 'draft');
  const inProgressBriefs = paginatedBriefs.filter((b) => b.status === 'in_progress');
  const completeBriefs = paginatedBriefs.filter((b) => b.status === 'complete');

  // Tab items with counts
  const tabItems = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'draft', label: 'Draft', count: counts.draft },
    { id: 'in_progress', label: 'In Progress', count: counts.in_progress },
    { id: 'complete', label: 'Complete', count: counts.complete },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900">{clientName}</h1>
          <p className="text-gray-600 mt-0.5">{briefs.length} {briefs.length === 1 ? 'brief' : 'briefs'}</p>
        </div>
        <Button
          variant="primary"
          onClick={onCreateBrief}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          New Brief
        </Button>
      </div>

      {/* Top-level Briefs / Articles toggle */}
      <div className="flex items-center gap-4 mb-6">
        <Tabs
          items={[
            { id: 'briefs', label: 'Briefs', count: briefs.length },
            { id: 'articles', label: 'Articles', count: articles.length },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as 'briefs' | 'articles')}
          variant="pills"
        />
      </div>

      {/* Articles tab */}
      {activeTab === 'articles' && (
        <div>
          {articlesLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} padding="md">
                  <Skeleton variant="text" width="60%" height={24} className="mb-2" />
                  <Skeleton variant="text" width="30%" height={16} />
                </Card>
              ))}
            </div>
          ) : articles.length === 0 ? (
            <Card variant="default" padding="lg" className="text-center">
              <p className="text-gray-600 py-8">No articles generated yet for this client.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {articles.map(article => (
                <ArticleListCard
                  key={article.id}
                  article={article}
                  onView={onViewArticle}
                  onDelete={handleDeleteArticle}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Briefs tab content */}
      {activeTab === 'briefs' && (<>
      {/* Search, Sort, and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            placeholder="Search briefs by name or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            }
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-md text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-teal focus:border-teal"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="modified">Last Modified</option>
          <option value="name">Name A-Z</option>
        </select>
        <Tabs
          items={tabItems}
          activeId={filterStatus}
          onChange={(id) => setFilterStatus(id as FilterStatus)}
          variant="pills"
          size="sm"
        />
      </div>

      {/* Bulk Action Bar */}
      {selectedBriefs.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-teal/5 border border-teal/20 rounded-lg">
          <span className="text-sm font-semibold text-foreground">
            {selectedBriefs.size} selected
          </span>
          <div className="flex-1" />
          <Button variant="secondary" size="sm" onClick={handleBulkArchive}>
            Archive
          </Button>
          <Button variant="danger" size="sm" onClick={() => setShowBulkDeleteConfirm(true)}>
            Delete
          </Button>
          <button
            onClick={clearSelection}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          >
            Clear
          </button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <Alert variant="error" title="Error" dismissible onDismiss={() => setError(null)} className="mb-6">
          {error}
          <Button variant="secondary" size="sm" onClick={loadBriefs} className="mt-3">
            Try Again
          </Button>
        </Alert>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} padding="md">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <Skeleton variant="text" width="60%" height={24} className="mb-2" />
                  <Skeleton variant="text" width="30%" height={16} />
                </div>
                <Skeleton variant="rectangular" width={80} height={24} className="rounded-sm" />
              </div>
              <div className="flex gap-2 mb-4">
                <Skeleton variant="rectangular" width={70} height={22} className="rounded-sm" />
                <Skeleton variant="rectangular" width={90} height={22} className="rounded-sm" />
                <Skeleton variant="rectangular" width={60} height={22} className="rounded-sm" />
              </div>
              <Skeleton variant="text" width="50%" height={16} className="mb-4" />
              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <Skeleton variant="rectangular" width={80} height={32} className="rounded-md" />
                <Skeleton variant="rectangular" width={100} height={32} className="rounded-md" />
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && briefs.length === 0 && (
        <Card variant="default" padding="lg" className="text-center">
          <div className="py-8">
            <div className="mx-auto w-16 h-16 bg-teal/10 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-teal"
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
            </div>
            <h3 className="text-lg font-heading font-semibold text-gray-900 mb-2">
              No briefs yet
            </h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">
              Create your first content brief for {clientName}.
            </p>
            <Button variant="primary" onClick={onCreateBrief} glow>
              Create First Brief
            </Button>
          </div>
        </Card>
      )}

      {/* No results from filter */}
      {!isLoading && !error && briefs.length > 0 && filteredBriefs.length === 0 && (
        <Card variant="default" padding="lg" className="text-center">
          <p className="text-gray-600">No briefs match your search or filter.</p>
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
        </Card>
      )}

      {/* Brief list */}
      {!isLoading && !error && filteredBriefs.length > 0 && (
        <>
        <div className="space-y-8">
          {/* In Progress Section */}
          {inProgressBriefs.length > 0 && (filterStatus === 'all' || filterStatus === 'in_progress') && (
            <section>
              <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-3 h-3 bg-amber-500 rounded-full mr-3" />
                In Progress ({inProgressBriefs.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inProgressBriefs.map((brief) => {
                  const generating = generatingBriefs[brief.id];
                  return (
                    <BriefListCard
                      key={brief.id}
                      brief={brief}
                      onContinue={onContinueBrief}
                      onEdit={onEditBrief}
                      onUseAsTemplate={onUseAsTemplate}
                      onArchive={handleArchiveClick}
                      isSelected={selectedBriefs.has(brief.id)}
                      onToggleSelect={toggleBriefSelection}
                      isGenerating={!!generating}
                      generationStatus={generating?.status}
                      generationStep={generating?.step}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Draft Section */}
          {draftBriefs.length > 0 && (filterStatus === 'all' || filterStatus === 'draft') && (
            <section>
              <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-3 h-3 bg-gray-400 rounded-full mr-3" />
                Drafts ({draftBriefs.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {draftBriefs.map((brief) => {
                  const generating = generatingBriefs[brief.id];
                  return (
                    <BriefListCard
                      key={brief.id}
                      brief={brief}
                      onContinue={onContinueBrief}
                      onEdit={onEditBrief}
                      onUseAsTemplate={onUseAsTemplate}
                      onArchive={handleArchiveClick}
                      isSelected={selectedBriefs.has(brief.id)}
                      onToggleSelect={toggleBriefSelection}
                      isGenerating={!!generating}
                      generationStatus={generating?.status}
                      generationStep={generating?.step}
                    />
                  );
                })}
              </div>
            </section>
          )}

          {/* Complete Section */}
          {completeBriefs.length > 0 && (filterStatus === 'all' || filterStatus === 'complete') && (
            <section>
              <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-3 h-3 bg-emerald-500 rounded-full mr-3" />
                Complete ({completeBriefs.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completeBriefs.map((brief) => {
                  const generating = generatingBriefs[brief.id];
                  return (
                    <BriefListCard
                      key={brief.id}
                      brief={brief}
                      onContinue={onContinueBrief}
                      onEdit={onEditBrief}
                      onUseAsTemplate={onUseAsTemplate}
                      onArchive={handleArchiveClick}
                      isSelected={selectedBriefs.has(brief.id)}
                      onToggleSelect={toggleBriefSelection}
                      isGenerating={!!generating}
                      generationStatus={generating?.status}
                      generationStep={generating?.step}
                    />
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Load More */}
        {hasMoreBriefs && (
          <div className="text-center mt-6">
            <Button
              variant="secondary"
              onClick={() => setVisibleCount(prev => prev + BRIEF_PAGE_SIZE)}
            >
              Load More ({filteredBriefs.length - visibleCount} remaining)
            </Button>
          </div>
        )}
        </>
      )}
      </>)}

      {/* Archive confirmation modal */}
      <Modal
        isOpen={!!archiveConfirm}
        onClose={() => setArchiveConfirm(null)}
        title="Archive Brief"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setArchiveConfirm(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleArchiveConfirmed}>
              Archive
            </Button>
          </>
        }
      >
        <p className="text-gray-600">Are you sure you want to archive this brief? You can restore it later.</p>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={showBulkDeleteConfirm}
        onClose={() => setShowBulkDeleteConfirm(false)}
        title="Delete Selected Briefs"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowBulkDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleBulkDelete}>
              Delete {selectedBriefs.size} Brief{selectedBriefs.size !== 1 ? 's' : ''}
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          Are you sure you want to permanently delete {selectedBriefs.size} selected brief{selectedBriefs.size !== 1 ? 's' : ''}? This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default BriefListScreen;
