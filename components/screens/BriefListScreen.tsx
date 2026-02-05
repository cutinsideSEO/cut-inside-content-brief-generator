// Brief List Screen - View and manage briefs for a client
import React, { useState, useEffect } from 'react';
import { getBriefsForClient, archiveBrief, createBrief } from '../../services/briefService';
import { getArticlesForClient, deleteArticle } from '../../services/articleService';
import type { BriefWithClient, ArticleWithBrief } from '../../types/database';
import BriefListCard from '../briefs/BriefListCard';
import ArticleListCard from '../articles/ArticleListCard';
import Button from '../Button';
import { Card, Input, Alert, Tabs, Skeleton } from '../ui';

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

  // Count briefs by status
  const counts = {
    all: briefs.length,
    draft: briefs.filter((b) => b.status === 'draft').length,
    in_progress: briefs.filter((b) => b.status === 'in_progress').length,
    complete: briefs.filter((b) => b.status === 'complete').length,
  };

  // Group briefs by status for better organization
  const draftBriefs = filteredBriefs.filter((b) => b.status === 'draft');
  const inProgressBriefs = filteredBriefs.filter((b) => b.status === 'in_progress');
  const completeBriefs = filteredBriefs.filter((b) => b.status === 'complete');

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
          <h1 className="text-2xl font-heading font-bold text-text-primary">{clientName}</h1>
          <p className="text-text-secondary mt-0.5">{briefs.length} {briefs.length === 1 ? 'brief' : 'briefs'}</p>
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
              <p className="text-text-secondary py-8">No articles generated yet for this client.</p>
            </Card>
          ) : (
            <div className="space-y-3">
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
      {/* Search and Filter */}
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
        <Tabs
          items={tabItems}
          activeId={filterStatus}
          onChange={(id) => setFilterStatus(id as FilterStatus)}
          variant="pills"
          size="sm"
        />
      </div>

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
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} padding="md">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <Skeleton variant="text" width="60%" height={24} className="mb-2" />
                  <Skeleton variant="text" width="30%" height={16} />
                </div>
                <Skeleton variant="rectangular" width={80} height={24} className="rounded-radius-sm" />
              </div>
              <div className="flex gap-2 mb-4">
                <Skeleton variant="rectangular" width={70} height={22} className="rounded-radius-sm" />
                <Skeleton variant="rectangular" width={90} height={22} className="rounded-radius-sm" />
                <Skeleton variant="rectangular" width={60} height={22} className="rounded-radius-sm" />
              </div>
              <Skeleton variant="text" width="50%" height={16} className="mb-4" />
              <div className="flex gap-2 pt-3 border-t border-border-subtle">
                <Skeleton variant="rectangular" width={80} height={32} className="rounded-radius-md" />
                <Skeleton variant="rectangular" width={100} height={32} className="rounded-radius-md" />
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
            <h3 className="text-lg font-heading font-semibold text-text-primary mb-2">
              No briefs yet
            </h3>
            <p className="text-text-secondary mb-6 max-w-sm mx-auto">
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
          <p className="text-text-secondary">No briefs match your search or filter.</p>
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
        <div className="space-y-8">
          {/* In Progress Section */}
          {inProgressBriefs.length > 0 && (filterStatus === 'all' || filterStatus === 'in_progress') && (
            <section>
              <h2 className="text-lg font-heading font-semibold text-text-primary mb-4 flex items-center">
                <span className="w-3 h-3 bg-status-generating rounded-full mr-3" />
                In Progress ({inProgressBriefs.length})
              </h2>
              <div className="space-y-3">
                {inProgressBriefs.map((brief) => {
                  const generating = generatingBriefs[brief.id];
                  return (
                    <BriefListCard
                      key={brief.id}
                      brief={brief}
                      onContinue={onContinueBrief}
                      onEdit={onEditBrief}
                      onUseAsTemplate={onUseAsTemplate}
                      onArchive={handleArchive}
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
              <h2 className="text-lg font-heading font-semibold text-text-primary mb-4 flex items-center">
                <span className="w-3 h-3 bg-status-draft rounded-full mr-3" />
                Drafts ({draftBriefs.length})
              </h2>
              <div className="space-y-3">
                {draftBriefs.map((brief) => {
                  const generating = generatingBriefs[brief.id];
                  return (
                    <BriefListCard
                      key={brief.id}
                      brief={brief}
                      onContinue={onContinueBrief}
                      onEdit={onEditBrief}
                      onUseAsTemplate={onUseAsTemplate}
                      onArchive={handleArchive}
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
              <h2 className="text-lg font-heading font-semibold text-text-primary mb-4 flex items-center">
                <span className="w-3 h-3 bg-status-complete rounded-full mr-3" />
                Complete ({completeBriefs.length})
              </h2>
              <div className="space-y-3">
                {completeBriefs.map((brief) => {
                  const generating = generatingBriefs[brief.id];
                  return (
                    <BriefListCard
                      key={brief.id}
                      brief={brief}
                      onContinue={onContinueBrief}
                      onEdit={onEditBrief}
                      onUseAsTemplate={onUseAsTemplate}
                      onArchive={handleArchive}
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
      )}
      </>)}
    </div>
  );
};

export default BriefListScreen;
