// Brief List Card - Card component for displaying briefs in a list
import React, { useState } from 'react';
import type { BriefWithClient, GenerationJobProgress } from '../../types/database';
import type { GenerationStatus } from '../../types/generationActivity';
import { isWorkflowStatus } from '../../types/database';
import { getGenerationProgressModel, getGenerationStatusBadgeLabel } from '../../utils/generationActivity';
import BriefStatusBadge from './BriefStatusBadge';
import WorkflowStatusSelect from './WorkflowStatusSelect';
import PublishedUrlModal from './PublishedUrlModal';
import Button from '../Button';
import {
  Badge,
  Progress,
  Checkbox,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  WorkItemCard,
} from '../ui';

interface BriefListCardProps {
  brief: BriefWithClient;
  onContinue: (briefId: string) => void;
  onEdit: (briefId: string) => void;
  onGenerateArticle?: (briefId: string) => void;
  onUseAsTemplate: (briefId: string) => void;
  onArchive: (briefId: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (briefId: string) => void;
  // Background generation
  isGenerating?: boolean;
  generationStatus?: GenerationStatus;
  generationStep?: number | null;
  generationProgress?: GenerationJobProgress;
  generationUpdatedAt?: string;
  // Article indicator
  articleCount?: number;
  // Workflow status
  onWorkflowStatusChange?: (briefId: string, newStatus: string, metadata?: { published_url?: string; published_at?: string }) => void;
  isGeneratingArticle?: boolean;
}

const MoreHorizontalIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
  </svg>
);

const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const ArchiveIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" />
  </svg>
);

const LinkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </svg>
);

const BriefListCard: React.FC<BriefListCardProps> = ({
  brief,
  onContinue,
  onEdit,
  onGenerateArticle,
  onUseAsTemplate,
  onArchive,
  isSelected = false,
  onToggleSelect,
  isGenerating = false,
  generationStatus = 'idle',
  generationStep = null,
  generationProgress,
  articleCount,
  onWorkflowStatusChange,
  isGeneratingArticle = false,
}) => {
  const [showPublishModal, setShowPublishModal] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getProgressText = () => {
    const viewLabels: Record<string, string> = {
      initial_input: 'Initial Input',
      context_input: 'Adding Context',
      visualization: 'Reviewing Competitors',
      briefing: `Brief Step ${brief.current_step}/7`,
      dashboard: 'Dashboard',
      content_generation: 'Generating Content',
    };
    return viewLabels[brief.current_view] || brief.current_view;
  };

  const getPrimaryKeywords = () => {
    const keywords = brief.brief_data?.keyword_strategy?.primary_keywords;
    if (!keywords || keywords.length === 0) {
      return brief.keywords?.slice(0, 3).map((k) => k.kw) || [];
    }
    return keywords.slice(0, 3).map((k) => k.keyword);
  };

  const generationModel = getGenerationProgressModel({
    status: generationStatus,
    generationStep,
    jobProgress: generationProgress,
  });

  const primaryKeywords = getPrimaryKeywords();
  const showWorkflowSelect = !isGenerating && onWorkflowStatusChange && (brief.status === 'complete' || isWorkflowStatus(brief.status));
  const isWorkflow = isWorkflowStatus(brief.status);
  const canGenerateArticle = !isGenerating && !!onGenerateArticle && (brief.status === 'complete' || isWorkflow);

  const getStatusBorderColor = () => {
    if (isGenerating) return 'border-l-amber-400';
    switch (brief.status) {
      case 'complete': return 'border-l-emerald-400';
      case 'in_progress': return 'border-l-amber-400';
      case 'sent_to_client': return 'border-l-teal-400';
      case 'changes_requested': return 'border-l-teal-400';
      case 'in_writing': return 'border-l-blue-400';
      case 'approved': return 'border-l-emerald-400';
      case 'published': return 'border-l-emerald-500';
      default: return 'border-l-gray-300';
    }
  };

  return (
    <>
      <WorkItemCard
        hover
        accentClassName={getStatusBorderColor()}
        selected={isSelected}
        highlighted={isGenerating}
        header={(
          <div className="flex items-start gap-3">
            {onToggleSelect && (
              <div className="pt-0.5 flex-shrink-0">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelect(brief.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="data-[state=checked]:bg-teal data-[state=checked]:border-teal"
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-heading font-semibold text-foreground leading-snug truncate">
                {brief.name}
              </h3>
              {brief.client && (
                <p className="text-xs text-muted-foreground mt-0.5">{brief.client.name}</p>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {isGenerating ? (
                <Badge variant="warning" size="sm" pulse>
                  {getGenerationStatusBadgeLabel(generationStatus)}
                </Badge>
              ) : showWorkflowSelect ? (
                <WorkflowStatusSelect
                  entityType="brief"
                  entityId={brief.id}
                  currentStatus={brief.status}
                  publishedUrl={brief.published_url}
                  onStatusChange={(newStatus, metadata) => onWorkflowStatusChange!(brief.id, newStatus, metadata)}
                  onPublishClick={() => setShowPublishModal(true)}
                />
              ) : (
                <BriefStatusBadge status={brief.status} />
              )}
              {!isGenerating && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground opacity-100">
                      <MoreHorizontalIcon className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onUseAsTemplate(brief.id)}>
                      <CopyIcon className="h-4 w-4 mr-2" />
                      Use as Template
                    </DropdownMenuItem>
                    {brief.status !== 'archived' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onArchive(brief.id)} className="text-red-500 focus:text-red-500">
                          <ArchiveIcon className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        )}
        footer={
          isGenerating ? (
            <div className="flex items-center gap-2">
              <Button variant="primary" size="sm" onClick={() => onContinue(brief.id)}>
                View Progress
              </Button>
              <span className="flex items-center text-xs text-amber-500">
                <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Runs in background
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {brief.status !== 'complete' && brief.status !== 'archived' && !isWorkflow && (
                  <Button variant="primary" size="sm" onClick={() => onContinue(brief.id)}>
                    Continue
                  </Button>
                )}
                {(brief.status === 'complete' || isWorkflow) && (
                  <Button variant="primary" size="sm" onClick={() => onEdit(brief.id)}>
                    View / Edit
                  </Button>
                )}
                {canGenerateArticle && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onGenerateArticle(brief.id)}
                    loading={isGeneratingArticle}
                    disabled={isGeneratingArticle}
                  >
                    Generate Article
                  </Button>
                )}
              </div>
              {brief.status === 'archived' && <span />}
            </div>
          )
        }
      >
        {primaryKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {primaryKeywords.map((keyword, index) => (
              <Badge key={index} variant="teal" size="sm">
                {keyword}
              </Badge>
            ))}
            {(brief.keywords?.length || 0) > 3 && (
              <span className="text-xs text-muted-foreground self-center">
                +{(brief.keywords?.length || 0) - 3}
              </span>
            )}
          </div>
        )}

        {isGenerating && (
          <div className="mt-3">
            <Progress
              value={generationModel.percentage}
              size="sm"
              color="yellow"
              label={generationModel.label}
              showLabel
            />
          </div>
        )}

        {!isGenerating && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
            <span>{getProgressText()}</span>
            <span className="text-border">|</span>
            <span>{formatDate(brief.updated_at)}, {formatTime(brief.updated_at)}</span>
            {articleCount !== undefined && articleCount > 0 && (
              <>
                <span className="text-border">|</span>
                <span className="text-teal font-medium">{articleCount} article{articleCount > 1 ? 's' : ''}</span>
              </>
            )}
            {brief.published_url && (
              <>
                <span className="text-border">|</span>
                <a
                  href={brief.published_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-teal hover:underline truncate max-w-[200px]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <LinkIcon className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{brief.published_url.replace(/^https?:\/\//, '')}</span>
                </a>
              </>
            )}
          </div>
        )}
      </WorkItemCard>

      <PublishedUrlModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onConfirm={(url, publishedAt) => {
          onWorkflowStatusChange?.(brief.id, 'published', { published_url: url, published_at: publishedAt });
          setShowPublishModal(false);
        }}
        existingUrl={brief.published_url}
      />
    </>
  );
};

export default BriefListCard;
