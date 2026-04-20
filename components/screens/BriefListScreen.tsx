// Brief List Screen - View and manage briefs for a client
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { getBriefsForClient, archiveBrief, deleteBrief, updateBriefWorkflowStatus } from '../../services/briefService';
import { getArticlesForClient, deleteArticle, updateArticleStatus } from '../../services/articleService';
import { cancelBatch } from '../../services/batchService';
import { createGenerationJob } from '../../services/generationJobService';
import { getProjectsForClient, createProject, assignBriefToProject, assignArticleToProject } from '../../services/projectService';
import { toast } from 'sonner';
import type { BriefWithClient, ArticleWithBrief, BriefStatus, ArticleStatus, ClientProject } from '../../types/database';
import type { GeneratingBrief } from '../../types/generationActivity';
import { getGenerationProgressModel, getGenerationStatusBadgeLabel } from '../../utils/generationActivity';
import { getActiveArticleGenerationItems } from '../../utils/articleGenerationActivity';
import { getEffectiveBriefStatusForList, isBriefActivelyGenerating } from '../../utils/generationStatus';
import { useBatchSubscription } from '../../hooks/useBatchSubscription';
import { useAuth } from '../../contexts/AuthContext';
import BriefListCard from '../briefs/BriefListCard';
import BriefListToolbar from '../briefs/BriefListToolbar';
import ArticleListCard from '../articles/ArticleListCard';
import BulkGenerationModal from '../briefs/BulkGenerationModal';
import GenerationActivityPanel from '../briefs/GenerationActivityPanel';
import type {
  BriefListActiveTab,
  BriefListFilterStatus,
  BriefListSortBy,
} from '../../types/briefListUi';
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
  activeTab: BriefListActiveTab;
  filterStatus: BriefListFilterStatus;
  sortBy: BriefListSortBy;
  projectFilter: string;
  onActiveTabChange: (activeTab: BriefListActiveTab) => void;
  onFilterStatusChange: (filterStatus: BriefListFilterStatus) => void;
  onSortByChange: (sortBy: BriefListSortBy) => void;
  onProjectFilterChange: (projectFilter: string) => void;
  onProjectFilterOptionsChange?: (options: Array<{ value: string; label: string }>) => void;
}

type AssignmentTarget = {
  entityType: 'brief' | 'article';
  entityId: string;
  entityName: string;
} | null;

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
  activeTab,
  filterStatus,
  sortBy,
  projectFilter,
  onActiveTabChange,
  onFilterStatusChange,
  onSortByChange,
  onProjectFilterChange,
  onProjectFilterOptionsChange,
}) => {
  const [briefs, setBriefs] = useState<BriefWithClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<ArticleWithBrief[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(false);
  const [archiveConfirm, setArchiveConfirm] = useState<string | null>(null);
  const [articleCount, setArticleCount] = useState(0);
  const [projects, setProjects] = useState<ClientProject[]>([]);
  const [assignmentTarget, setAssignmentTarget] = useState<AssignmentTarget>(null);
  const [assignmentProjectId, setAssignmentProjectId] = useState('');
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [articleGenerateConfirmBriefId, setArticleGenerateConfirmBriefId] = useState<string | null>(null);
  const [startingArticleBriefIds, setStartingArticleBriefIds] = useState<Set<string>>(new Set());
  const startingArticleBriefIdsRef = useRef<Set<string>>(new Set());

  // Bulk selection state
  const [selectedBriefs, setSelectedBriefs] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Auth
  const { userId } = useAuth();

  // Bulk generation state
  const [showBulkModal, setShowBulkModal] = useState<'keywords' | 'existing' | null>(null);
  const [bulkProjectId, setBulkProjectId] = useState('');
  const { activeBatches, liveProgressByBatch } = useBatchSubscription(clientId);

  // Load-more pagination
  const [visibleCount, setVisibleCount] = useState(20);
  const BRIEF_PAGE_SIZE = 20;

  useEffect(() => {
    setBulkProjectId('');
  }, [clientId]);

  const loadProjects = useCallback(async () => {
    const { data, error: fetchError } = await getProjectsForClient(clientId);

    if (fetchError) {
      toast.error(`Failed to load projects: ${fetchError}`);
      return;
    }

    setProjects((data || []).filter((project) => project.status === 'active'));
  }, [clientId]);

  const loadBriefs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const projectOptions = projectFilter === 'all' ? undefined : { projectId: projectFilter as string | 'unassigned' };
    const { data, error: fetchError } = await getBriefsForClient(clientId, projectOptions);

    if (fetchError) {
      setError(fetchError);
    } else {
      setBriefs(data || []);
    }

    setIsLoading(false);
  }, [clientId, projectFilter]);

  const loadArticleCount = useCallback(async () => {
    const projectOptions = projectFilter === 'all' ? undefined : { projectId: projectFilter as string | 'unassigned' };
    const { data, error: fetchError } = await getArticlesForClient(clientId, projectOptions);

    if (!fetchError && data) {
      setArticleCount(data.length);
    }
  }, [clientId, projectFilter]);

  const loadArticles = useCallback(async () => {
    setArticlesLoading(true);
    const projectOptions = projectFilter === 'all' ? undefined : { projectId: projectFilter as string | 'unassigned' };
    const { data, error: fetchError } = await getArticlesForClient(clientId, projectOptions);
    if (!fetchError && data) {
      setArticles(data);
    }
    setArticlesLoading(false);
  }, [clientId, projectFilter]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Fetch briefs and article count when client or project filter changes
  useEffect(() => {
    loadBriefs();
    loadArticleCount();
  }, [loadBriefs, loadArticleCount]);

  // Reload briefs when a background generation finishes (brief removed from generatingBriefs)
  const prevGeneratingIdsRef = useRef<Set<string>>(new Set(Object.keys(generatingBriefs)));
  useEffect(() => {
    const currentIds = new Set(Object.keys(generatingBriefs));
    const prevIds = prevGeneratingIdsRef.current;
    // Check if any brief was removed (generation completed + cleanup)
    const anyRemoved = [...prevIds].some(id => !currentIds.has(id));
    if (anyRemoved) {
      loadBriefs();
      loadArticleCount();
    }
    prevGeneratingIdsRef.current = currentIds;
  }, [generatingBriefs, loadArticleCount, loadBriefs]);

  // If realtime generation state arrives, stop showing "starting" on those cards.
  useEffect(() => {
    setStartingArticleBriefIds((prev) => {
      let changed = false;
      const next = new Set<string>();

      prev.forEach((briefId) => {
        if (isBriefActivelyGenerating(generatingBriefs[briefId]?.status)) {
          changed = true;
          return;
        }
        next.add(briefId);
      });

      if (!changed) return prev;
      startingArticleBriefIdsRef.current = next;
      return next;
    });
  }, [generatingBriefs]);

  const markArticleGenerationStarting = useCallback((briefId: string): boolean => {
    if (startingArticleBriefIdsRef.current.has(briefId)) return false;
    startingArticleBriefIdsRef.current.add(briefId);
    setStartingArticleBriefIds((prev) => {
      if (prev.has(briefId)) return prev;
      const next = new Set(prev);
      next.add(briefId);
      return next;
    });
    return true;
  }, []);

  const clearArticleGenerationStarting = useCallback((briefId: string) => {
    if (!startingArticleBriefIdsRef.current.has(briefId)) return;
    startingArticleBriefIdsRef.current.delete(briefId);
    setStartingArticleBriefIds((prev) => {
      if (!prev.has(briefId)) return prev;
      const next = new Set(prev);
      next.delete(briefId);
      return next;
    });
  }, []);

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
      loadArticleCount();
    }
    prevBatchIdsRef.current = currentIds;
  }, [activeBatches, loadArticleCount, loadBriefs]);

  // Load articles when articles tab is active
  useEffect(() => {
    if (activeTab === 'articles') {
      loadArticles();
    }
  }, [activeTab, loadArticles]);

  const handleDeleteArticle = async (articleId: string) => {
    const { error: deleteError } = await deleteArticle(articleId);
    if (!deleteError) {
      setArticles(prev => prev.filter(a => a.id !== articleId));
      setArticleCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleOpenBulkModal = useCallback((tab: 'keywords' | 'existing') => {
    setBulkProjectId(projectFilter !== 'all' && projectFilter !== 'unassigned' ? projectFilter : '');
    setShowBulkModal(tab);
  }, [projectFilter]);

  const handleOpenBriefAssignProject = useCallback((briefId: string, currentProjectId: string | null) => {
    const brief = briefs.find((item) => item.id === briefId);
    setAssignmentTarget({
      entityType: 'brief',
      entityId: briefId,
      entityName: brief?.name || 'this brief',
    });
    setAssignmentProjectId(currentProjectId || '');
  }, [briefs]);

  const handleOpenArticleAssignProject = useCallback((articleId: string, currentProjectId: string | null) => {
    const article = articles.find((item) => item.id === articleId);
    setAssignmentTarget({
      entityType: 'article',
      entityId: articleId,
      entityName: article?.title || 'this article',
    });
    setAssignmentProjectId(currentProjectId || '');
  }, [articles]);

  const handleConfirmProjectAssignment = useCallback(async () => {
    if (!assignmentTarget) return;

    const selectedProjectId = assignmentProjectId || null;
    const { error: assignError } = assignmentTarget.entityType === 'brief'
      ? await assignBriefToProject(assignmentTarget.entityId, selectedProjectId)
      : await assignArticleToProject(assignmentTarget.entityId, selectedProjectId);

    if (assignError) {
      toast.error(`Failed to assign project: ${assignError}`);
      return;
    }

    setAssignmentTarget(null);
    toast.success(selectedProjectId ? 'Project assigned' : 'Project unassigned');
    await loadBriefs();
    await loadArticleCount();
    if (activeTab === 'articles') {
      await loadArticles();
    }
  }, [activeTab, assignmentProjectId, assignmentTarget, loadArticleCount, loadArticles, loadBriefs]);

  const handleCreateProject = useCallback(async () => {
    if (!newProjectName.trim()) {
      toast.error('Project name is required');
      return;
    }

    setIsCreatingProject(true);
    const { data, error: createError } = await createProject(
      clientId,
      newProjectName.trim(),
      newProjectDescription.trim() || undefined
    );

    setIsCreatingProject(false);

    if (createError || !data) {
      toast.error(createError || 'Failed to create project');
      return;
    }

    toast.success('Project created');
    setShowCreateProjectModal(false);
    setNewProjectName('');
    setNewProjectDescription('');
    await loadProjects();
    onProjectFilterChange(data.id);
    setBulkProjectId(data.id);
  }, [clientId, loadProjects, newProjectDescription, newProjectName, onProjectFilterChange]);

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

  const handleGenerateArticle = useCallback(async (briefId: string) => {
    if (isBriefActivelyGenerating(generatingBriefs[briefId]?.status)) {
      toast.info('A generation job is already running for this brief');
      return;
    }

    if (!markArticleGenerationStarting(briefId)) {
      return;
    }

    try {
      await createGenerationJob(briefId, 'article');
      toast.success('Article generation started');

      // Keep local loading briefly in case realtime update is delayed.
      setTimeout(() => {
        clearArticleGenerationStarting(briefId);
      }, 5000);
    } catch (err) {
      clearArticleGenerationStarting(briefId);
      const message = err instanceof Error ? err.message : 'Failed to start article generation';
      toast.error(message);
    }
  }, [generatingBriefs, markArticleGenerationStarting, clearArticleGenerationStarting]);

  const handleOpenGenerateArticleConfirm = useCallback((briefId: string) => {
    setArticleGenerateConfirmBriefId(briefId);
  }, []);

  const handleConfirmGenerateArticle = useCallback(async () => {
    if (!articleGenerateConfirmBriefId) return;
    const briefId = articleGenerateConfirmBriefId;
    setArticleGenerateConfirmBriefId(null);
    await handleGenerateArticle(briefId);
  }, [articleGenerateConfirmBriefId, handleGenerateArticle]);

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
  }, [briefsWithEffectiveStatus, filterStatus, searchQuery, sortBy]);

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

  const projectFilterOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Projects' },
      { value: 'unassigned', label: 'Unassigned' },
      ...projects.map((project) => ({
        value: project.id,
        label: project.name,
      })),
    ];
  }, [projects]);

  useEffect(() => {
    onProjectFilterOptionsChange?.(projectFilterOptions);
  }, [onProjectFilterOptionsChange, projectFilterOptions]);

  const projectAssignmentOptions = useMemo(() => {
    return [
      { value: '', label: 'Unassigned' },
      ...projects.map((project) => ({
        value: project.id,
        label: project.name,
      })),
    ];
  }, [projects]);

  const mobileStatusFilterItems = useMemo(() => {
    return [
      { id: 'all', label: 'All', count: counts.all },
      { id: 'draft', label: 'Draft', count: counts.draft },
      { id: 'in_progress', label: 'In Progress', count: counts.in_progress },
      { id: 'complete', label: 'Complete', count: counts.complete },
      ...(counts.workflow > 0 ? [{ id: 'workflow', label: 'Workflow', count: counts.workflow }] : []),
      ...(counts.published > 0 ? [{ id: 'published', label: 'Published', count: counts.published }] : []),
    ];
  }, [counts.all, counts.complete, counts.draft, counts.in_progress, counts.published, counts.workflow]);

  const projectNamesById = useMemo(() => {
    return Object.fromEntries(projects.map((project) => [project.id, project.name]));
  }, [projects]);

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
        onGenerateArticle={handleOpenGenerateArticleConfirm}
        onAssignProject={handleOpenBriefAssignProject}
        onUseAsTemplate={onUseAsTemplate}
        onArchive={handleArchiveClick}
        projectName={brief.project_id ? projectNamesById[brief.project_id] || null : null}
        isSelected={selectedBriefs.has(brief.id)}
        onToggleSelect={toggleBriefSelection}
        isGenerating={isGenerating}
        isGeneratingArticle={startingArticleBriefIds.has(brief.id)}
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
      <BriefListToolbar
        clientName={clientName}
        clientLogoUrl={clientLogoUrl}
        clientBrandColor={clientBrandColor}
        briefCount={briefs.length}
        articleCount={activeTab === 'articles' ? articles.length : articleCount}
        activeTab={activeTab}
        onActiveTabChange={onActiveTabChange}
        showSearchControls={activeTab === 'briefs'}
        searchQuery={searchQuery}
        sortBy={sortBy}
        onSearchQueryChange={setSearchQuery}
        onSortByChange={onSortByChange}
        onCreateBrief={onCreateBrief}
        onOpenBulkGenerate={() => handleOpenBulkModal('keywords')}
        onOpenCreateProject={() => setShowCreateProjectModal(true)}
        onOpenMobileFilters={() => setShowMobileFilters(true)}
      />

      <GenerationActivityPanel
        generatingBriefs={generatingBriefs}
        briefNamesById={briefNamesById}
        batches={activeBatches}
        liveProgressByBatch={liveProgressByBatch}
        onViewBrief={onContinueBrief}
        onCancelBatch={handleCancelBatch}
      />

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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {articles.map(article => (
                <ArticleListCard
                  key={article.id}
                  article={article}
                  onView={onViewArticle}
                  onDelete={handleDeleteArticle}
                  onStatusChange={handleArticleStatusChange}
                  onAssignProject={handleOpenArticleAssignProject}
                  projectName={article.project_id ? projectNamesById[article.project_id] || null : null}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Briefs tab content */}
      {activeTab === 'briefs' && (<>
      {/* Bulk Action Bar */}
      {selectedBriefs.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-2.5 bg-teal/5 border border-teal/20 rounded-lg">
          <span className="text-sm font-semibold text-foreground">
            {selectedBriefs.size} selected
          </span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => handleOpenBulkModal('existing')}>
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
              onFilterStatusChange('all');
              onProjectFilterChange('all');
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedBriefs.map(renderBriefCard)}
          </div>

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
        isOpen={!!articleGenerateConfirmBriefId}
        onClose={() => setArticleGenerateConfirmBriefId(null)}
        title="Generate Full Article"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setArticleGenerateConfirmBriefId(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmGenerateArticle}>
              Generate Article
            </Button>
          </>
        }
      >
        <p className="text-gray-600">
          This will generate a full article based on your brief. The process may take several minutes. Continue?
        </p>
      </Modal>

      <Modal
        isOpen={!!assignmentTarget}
        onClose={() => setAssignmentTarget(null)}
        title="Assign Project"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" size="sm" onClick={() => setAssignmentTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmProjectAssignment}>
              Save
            </Button>
          </>
        )}
      >
        <p className="text-sm text-muted-foreground mb-4">
          Assign {assignmentTarget?.entityType === 'brief' ? 'brief' : 'article'}{' '}
          <span className="font-medium text-foreground">{assignmentTarget?.entityName}</span> to a project.
        </p>
        {assignmentTarget?.entityType === 'article' && (
          <p className="text-xs text-muted-foreground mb-3">
            Article assignment moves the parent brief to the selected project to keep article and brief projects aligned.
          </p>
        )}
        <Select
          label="Project"
          size="sm"
          value={assignmentProjectId}
          onChange={(e) => setAssignmentProjectId(e.target.value)}
          options={projectAssignmentOptions}
        />
      </Modal>

      <Modal
        isOpen={showCreateProjectModal}
        onClose={() => {
          setShowCreateProjectModal(false);
          setNewProjectName('');
          setNewProjectDescription('');
        }}
        title="Create Project"
        size="sm"
        footer={(
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCreateProjectModal(false)} disabled={isCreatingProject}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateProject} loading={isCreatingProject}>
              Create
            </Button>
          </>
        )}
      >
        <Input
          label="Project Name"
          placeholder="Q2 Content Campaign"
          value={newProjectName}
          onChange={(e) => setNewProjectName(e.target.value)}
          className="mb-3"
        />
        <Input
          label="Description (optional)"
          placeholder="Internal notes for this project"
          value={newProjectDescription}
          onChange={(e) => setNewProjectDescription(e.target.value)}
        />
      </Modal>

      <Modal
        isOpen={showMobileFilters}
        onClose={() => setShowMobileFilters(false)}
        title="Filters"
        size="sm"
        footer={(
          <Button variant="primary" size="sm" onClick={() => setShowMobileFilters(false)}>
            Done
          </Button>
        )}
      >
        <div data-testid="brief-list-sidebar-controls" className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Status</p>
            <Tabs
              items={mobileStatusFilterItems}
              activeId={filterStatus}
              onChange={(id) => onFilterStatusChange(id as BriefListFilterStatus)}
              variant="pills"
              size="sm"
            />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Project</p>
            <Select
              size="sm"
              value={projectFilter}
              onChange={(event) => onProjectFilterChange(event.target.value)}
              options={projectFilterOptions}
              aria-label="Mobile project filter"
            />
          </div>
        </div>
      </Modal>

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
        availableProjects={projects}
        selectedProjectId={bulkProjectId}
        onSelectedProjectChange={setBulkProjectId}
        onBatchCreated={() => {
          loadBriefs();
          loadArticleCount();
          if (activeTab === 'articles') {
            loadArticles();
          }
          setSelectedBriefs(new Set());
        }}
      />
    </div>
  );
};

export default BriefListScreen;
