// Brief List Screen - View and manage briefs for a client
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { getBriefsForClient, archiveBrief, deleteBrief, updateBriefWorkflowStatus } from '../../services/briefService';
import { getArticlesForClient, deleteArticle, getArticleCountForClient, updateArticleStatus } from '../../services/articleService';
import { cancelBatch } from '../../services/batchService';
import { toast } from 'sonner';
import type { BriefWithClient, ArticleWithBrief, BriefStatus, ArticleStatus } from '../../types/database';
import type { GeneratingBrief } from '../../types/generationActivity';
import { getGenerationProgressModel, getGenerationStatusBadgeLabel } from '../../utils/generationActivity';
import { getActiveArticleGenerationItems } from '../../utils/articleGenerationActivity';
import { getEffectiveBriefStatusForList, isBriefActivelyGenerating } from '../../utils/generationStatus';
import { useBatchSubscription } from '../../hooks/useBatchSubscription';
import { useAuth } from '../../contexts/AuthContext';
import BriefListCard from '../briefs/BriefListCard';
import ArticleListCard from '../articles/ArticleListCard';
import BulkGenerationModal from '../briefs/BulkGenerationModal';
import GenerationActivityPanel from '../briefs/GenerationActivityPanel';
import Button from '../Button';
import { Card, Input, Select, Alert, Tabs, Skeleton, Modal, Badge, Progress } from '../ui';

interface BriefListScreenProps {
  clientId: string;
  clientName: string;
  clientLogoUrl?: string | null;
  clientBrandColor?: string | null;
  onBack: () => void;
  onCreateBrief: () => void;
  onContinueBrief: (briefId: string) => void;
  onEditBrief: (briefId: string) => void;
  onUseAsTemplate: (briefId: string) => void;
  // Background generation props - now supports multiple parallel generations
  generatingBriefs?: Record<string, GeneratingBrief>;
  // Article navigation
  onViewArticle: (articleId: string) => void;
  // Callback to sync counts with parent (sidebar)
  onCountsChange?: (counts: { draft: number; in_progress: number; complete: number; workflow: number; published: number; articles: number }) => void;
}

type FilterStatus = 'all' | 'draft' | 'in_progress' | 'complete' | 'workflow' | 'published';
type BriefViewMode = 'smart' | 'grouped';

const BriefListScreen: React.FC<BriefListScreenProps> = ({
  clientId,
  clientName,
  clientLogoUrl,
  clientBrandColor,
  onBack,
  onCreateBrief,
  onContinueBrief,
  onEditBrief,
  onUseAsTemplate,
  generatingBriefs = {},
  onViewArticle,
  onCountsChange,
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
  const [articleCount, setArticleCount] = useState(0);

  // Sort state
  const [sortBy, setSortBy] = useState<'smart' | 'newest' | 'oldest' | 'modified' | 'name'>('smart');
  const [briefViewMode, setBriefViewMode] = useState<BriefViewMode>('smart');

  // Bulk selection state
  const [selectedBriefs, setSelectedBriefs] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Auth
  const { userId } = useAuth();

  // Bulk generation state
  const [showBulkModal, setShowBulkModal] = useState<'keywords' | 'existing' | null>(null);
  const { activeBatches, liveProgressByBatch } = useBatchSubscription(clientId);

  // Load-more pagination
  const [visibleCount, setVisibleCount] = useState(20);
  const BRIEF_PAGE_SIZE = 20;

  // Fetch briefs and article count on mount and when clientId changes
  useEffect(() => {
    loadBriefs();
    getArticleCountForClient(clientId).then(setArticleCount);
  }, [clientId]);

  // Reload briefs when a background generation finishes (brief removed from generatingBriefs)
  const prevGeneratingIdsRef = useRef<Set<string>>(new Set(Object.keys(generatingBriefs)));
  useEffect(() => {
    const currentIds = new Set(Object.keys(generatingBriefs));
    const prevIds = prevGeneratingIdsRef.current;
    // Check if any brief was removed (generation completed + cleanup)
    const anyRemoved = [...prevIds].some(id => !currentIds.has(id));
    if (anyRemoved) {
      loadBriefs();
      getArticleCountForClient(clientId).then(setArticleCount);
    }
    prevGeneratingIdsRef.current = currentIds;
  }, [generatingBriefs, clientId]);

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

  // Handle batch cancellation
  const handleCancelBatch = useCallback(async (batchId: string) => {
    try {
      await cancelBatch(batchId);
      toast.success('Batch cancelled');
    } catch {
      toast.error('Failed to cancel batch');
    }
  }, []);

  // Refresh brief list when batches complete
  const prevBatchIdsRef = useRef<Set<string>>(new Set(activeBatches.map(b => b.id)));
  useEffect(() => {
    const currentIds = new Set(activeBatches.map(b => b.id));
    const prevIds = prevBatchIdsRef.current;
    // If a batch was removed (completed + auto-dismissed), refresh the brief list
    const anyRemoved = [...prevIds].some(id => !currentIds.has(id));
    if (anyRemoved) {
      loadBriefs();
      getArticleCountForClient(clientId).then(setArticleCount);
    }
    prevBatchIdsRef.current = currentIds;
  }, [activeBatches, clientId]);

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
      setArticleCount(prev => Math.max(0, prev - 1));
    }
  };

  // Workflow status change handler
  const handleWorkflowStatusChange = async (briefId: string, newStatus: string, metadata?: { published_url?: string; published_at?: string }) => {
    // Optimistic update
    setBriefs(prev => prev.map(b => b.id === briefId ? { ...b, status: newStatus as BriefStatus, published_url: metadata?.published_url ?? b.published_url, published_at: metadata?.published_at ?? b.published_at } : b));

    const { error: updateError } = await updateBriefWorkflowStatus(briefId, newStatus as BriefStatus, metadata);
    if (updateError) {
      toast.error('Failed to update status');
      loadBriefs(); // Revert by reloading
    } else {
      toast.success(`Status updated to ${newStatus.replace(/_/g, ' ')}`);
    }
  };

  // Article status change handler
  const handleArticleStatusChange = async (articleId: string, newStatus: string, metadata?: { published_url?: string }) => {
    // Optimistic update
    setArticles(prev => prev.map(a => a.id === articleId ? { ...a, status: newStatus as ArticleStatus, published_url: metadata?.published_url ?? a.published_url } : a));

    const { error: updateError } = await updateArticleStatus(articleId, newStatus as ArticleStatus, metadata?.published_url);
    if (updateError) {
      toast.error('Failed to update article status');
      loadArticles(); // Revert by reloading
    } else {
      toast.success(`Article status updated to ${newStatus.replace(/_/g, ' ')}`);
    }
  };

  // Normalize list status so stale/inconsistent DB rows are shown in a useful state.
  const briefsWithEffectiveStatus = useMemo(() => {
    return briefs.map((brief) => {
      const effectiveStatus = getEffectiveBriefStatusForList({
        status: brief.status,
        current_step: brief.current_step,
        active_job_id: brief.active_job_id,
        brief_data: brief.brief_data,
      });

      if (effectiveStatus === brief.status) {
        return brief;
      }

      return {
        ...brief,
        status: effectiveStatus,
      };
    });
  }, [briefs]);

  // Filter, search, and sort briefs
  const filteredBriefs = useMemo(() => {
    let result = briefsWithEffectiveStatus.filter((brief) => {
      if (filterStatus === 'workflow') {
        return ['sent_to_client', 'approved', 'changes_requested', 'in_writing'].includes(brief.status);
      }
      if (filterStatus === 'published') {
        return brief.status === 'published';
      }
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

    const getSmartRank = (brief: BriefWithClient) => {
      const generation = generatingBriefs[brief.id];
      if (isBriefActivelyGenerating(generation?.status)) return 0;
      if (brief.status === 'changes_requested' || brief.status === 'in_writing' || brief.status === 'sent_to_client') return 1;
      if (brief.status === 'in_progress') return 2;
      if (brief.status === 'draft') return 3;
      if (brief.status === 'complete') return 4;
      if (brief.status === 'approved') return 5;
      if (brief.status === 'published') return 6;
      return 7;
    };

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'smart': {
          const rankDiff = getSmartRank(a) - getSmartRank(b);
          if (rankDiff !== 0) return rankDiff;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }
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
  }, [briefsWithEffectiveStatus, filterStatus, generatingBriefs, searchQuery, sortBy]);

  // Count briefs by status
  const workflowStatuses = ['sent_to_client', 'approved', 'changes_requested', 'in_writing'];
  const counts = {
    all: briefsWithEffectiveStatus.length,
    draft: briefsWithEffectiveStatus.filter((b) => b.status === 'draft').length,
    in_progress: briefsWithEffectiveStatus.filter((b) => b.status === 'in_progress').length,
    complete: briefsWithEffectiveStatus.filter((b) => b.status === 'complete').length,
    workflow: briefsWithEffectiveStatus.filter((b) => workflowStatuses.includes(b.status)).length,
    published: briefsWithEffectiveStatus.filter((b) => b.status === 'published').length,
  };

  // Sync counts with parent (sidebar) whenever briefs or articleCount change
  useEffect(() => {
    onCountsChange?.({
      draft: counts.draft,
      in_progress: counts.in_progress,
      complete: counts.complete,
      workflow: counts.workflow,
      published: counts.published,
      articles: articleCount,
    });
  }, [counts.draft, counts.in_progress, counts.complete, counts.workflow, counts.published, articleCount]);

  // Paginated briefs
  const paginatedBriefs = filteredBriefs.slice(0, visibleCount);
  const hasMoreBriefs = filteredBriefs.length > visibleCount;

  // Group paginated briefs by status for better organization
  const draftBriefs = paginatedBriefs.filter((b) => b.status === 'draft');
  const inProgressBriefs = paginatedBriefs.filter((b) => b.status === 'in_progress');
  const completeBriefs = paginatedBriefs.filter((b) => b.status === 'complete');
  const workflowBriefs = paginatedBriefs.filter((b) => workflowStatuses.includes(b.status));
  const publishedBriefs = paginatedBriefs.filter((b) => b.status === 'published');

  // Tab items with counts
  const tabItems = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'draft', label: 'Draft', count: counts.draft },
    { id: 'in_progress', label: 'In Progress', count: counts.in_progress },
    { id: 'complete', label: 'Complete', count: counts.complete },
    ...(counts.workflow > 0 ? [{ id: 'workflow', label: 'In Workflow', count: counts.workflow }] : []),
    ...(counts.published > 0 ? [{ id: 'published', label: 'Published', count: counts.published }] : []),
  ];

  const briefNamesById = useMemo(() => {
    return Object.fromEntries(briefs.map((brief) => [brief.id, brief.name]));
  }, [briefs]);

  const articleGenerationItems = useMemo(() => {
    return getActiveArticleGenerationItems(generatingBriefs).map((item) => {
      return {
        ...item,
        briefName: briefNamesById[item.briefId] || `Brief ${item.briefId.slice(0, 8)}`,
        model: getGenerationProgressModel({
          status: item.generation.status,
          generationStep: item.generation.step,
          jobProgress: item.generation.jobProgress,
        }),
      };
    });
  }, [briefNamesById, generatingBriefs]);

  const renderBriefCard = (brief: BriefWithClient) => {
    const generating = generatingBriefs[brief.id];
    const isGenerating = isBriefActivelyGenerating(generating?.status);

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
        isGenerating={isGenerating}
        generationStatus={generating?.status}
        generationStep={generating?.step}
        generationProgress={generating?.jobProgress}
        generationUpdatedAt={generating?.updatedAt}
        onWorkflowStatusChange={handleWorkflowStatusChange}
      />
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div
          className={clientBrandColor ? 'pl-3 border-l-[3px]' : ''}
          style={clientBrandColor ? { borderLeftColor: clientBrandColor } : undefined}
        >
          <div className="flex items-center gap-3">
            {clientLogoUrl && (
              <img
                src={clientLogoUrl}
                alt=""
                className="h-8 w-8 rounded-lg object-contain border border-gray-100"
              />
            )}
            <h1 className="text-2xl font-heading font-bold text-gray-900">{clientName}</h1>
          </div>
          <p className="text-gray-600 mt-0.5">{briefs.length} {briefs.length === 1 ? 'brief' : 'briefs'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowBulkModal('keywords')}
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          >
            Bulk Generate Briefs
          </Button>
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
      </div>

      <GenerationActivityPanel
        generatingBriefs={generatingBriefs}
        briefNamesById={briefNamesById}
        batches={activeBatches}
        liveProgressByBatch={liveProgressByBatch}
        onViewBrief={onContinueBrief}
        onCancelBatch={handleCancelBatch}
      />


      {/* Top-level Briefs / Articles toggle */}
      <div className="flex items-center gap-4 mb-6 rounded-lg border border-border bg-card px-3 py-2">
        <Tabs
          items={[
            { id: 'briefs', label: 'Briefs', count: briefs.length },
            { id: 'articles', label: 'Articles', count: activeTab === 'articles' ? articles.length : articleCount },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as 'briefs' | 'articles')}
          variant="pills"
        />
      </div>

      {/* Articles tab */}
      {activeTab === 'articles' && (
        <div>
          {articleGenerationItems.length > 0 && (
            <Card variant="default" padding="md" className="mb-4 border-border bg-secondary/20">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-sm font-heading font-semibold text-foreground">Active Article Jobs</h3>
                <Badge variant="warning" size="sm">{articleGenerationItems.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Live status mirrors Generation Activity so wording stays consistent.
              </p>
              <div className="space-y-3">
                {articleGenerationItems.map((item) => (
                  <div key={item.briefId} className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.briefName}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.model.label}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="warning" size="sm">
                          {getGenerationStatusBadgeLabel(item.generation.status)}
                        </Badge>
                        <Button variant="secondary" size="sm" onClick={() => onContinueBrief(item.briefId)}>
                          View
                        </Button>
                      </div>
                    </div>
                    <Progress value={item.model.percentage} size="sm" color="yellow" />
                  </div>
                ))}
              </div>
            </Card>
          )}

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
                  onStatusChange={handleArticleStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Briefs tab content */}
      {activeTab === 'briefs' && (<>
      {/* Search, Sort, and Filter */}
      <div className="mb-6 space-y-3 rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex flex-col sm:flex-row gap-4">
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
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            options={[
              { value: 'smart', label: 'Smart Queue (Recommended)' },
              { value: 'newest', label: 'Newest First' },
              { value: 'oldest', label: 'Oldest First' },
              { value: 'modified', label: 'Last Modified' },
              { value: 'name', label: 'Name A-Z' },
            ]}
            size="sm"
            className="sm:w-56"
            aria-label="Sort briefs"
          />
          <Tabs
            items={[
              { id: 'smart', label: 'Smart Queue' },
              { id: 'grouped', label: 'Grouped by Status' },
            ]}
            activeId={briefViewMode}
            onChange={(id) => setBriefViewMode(id as BriefViewMode)}
            variant="pills"
            size="sm"
          />
        </div>
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
          <Button variant="outline" size="sm" onClick={() => setShowBulkModal('existing')}>
            Generate ({selectedBriefs.size})
          </Button>
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
          {briefViewMode === 'smart' && (
            <section>
              <h2 className="text-lg font-heading font-semibold text-gray-900 mb-1">
                Smart Queue ({paginatedBriefs.length})
              </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Ordered by urgency: generating, workflow-blocked, in progress, then remaining.
            </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedBriefs.map(renderBriefCard)}
              </div>
            </section>
          )}

          {briefViewMode === 'grouped' && (
            <div className="space-y-8">
              <p className="text-sm text-muted-foreground -mt-1">
                Grouped view keeps workflow buckets visible for manual review.
              </p>
              {inProgressBriefs.length > 0 && (filterStatus === 'all' || filterStatus === 'in_progress') && (
                <section>
                  <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-3 h-3 bg-amber-500 rounded-full mr-3" />
                    In Progress ({inProgressBriefs.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {inProgressBriefs.map(renderBriefCard)}
                  </div>
                </section>
              )}

              {draftBriefs.length > 0 && (filterStatus === 'all' || filterStatus === 'draft') && (
                <section>
                  <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-3 h-3 bg-gray-400 rounded-full mr-3" />
                    Drafts ({draftBriefs.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {draftBriefs.map(renderBriefCard)}
                  </div>
                </section>
              )}

              {completeBriefs.length > 0 && (filterStatus === 'all' || filterStatus === 'complete') && (
                <section>
                  <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full mr-3" />
                    Complete ({completeBriefs.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {completeBriefs.map(renderBriefCard)}
                  </div>
                </section>
              )}

              {workflowBriefs.length > 0 && (filterStatus === 'all' || filterStatus === 'workflow') && (
                <section>
                  <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-3 h-3 bg-teal-500 rounded-full mr-3" />
                    In Workflow ({workflowBriefs.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {workflowBriefs.map(renderBriefCard)}
                  </div>
                </section>
              )}

              {publishedBriefs.length > 0 && (filterStatus === 'all' || filterStatus === 'published') && (
                <section>
                  <h2 className="text-lg font-heading font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full mr-3" />
                    Published ({publishedBriefs.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {publishedBriefs.map(renderBriefCard)}
                  </div>
                </section>
              )}
            </div>
          )}

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

      {/* Bulk Generation Modal */}
      <BulkGenerationModal
        isOpen={showBulkModal !== null}
        onClose={() => setShowBulkModal(null)}
        initialTab={showBulkModal || 'keywords'}
        selectedBriefIds={[...selectedBriefs]}
        clientId={clientId}
        userId={userId || ''}
        onBatchCreated={() => { loadBriefs(); setSelectedBriefs(new Set()); }}
      />
    </div>
  );
};

export default BriefListScreen;
