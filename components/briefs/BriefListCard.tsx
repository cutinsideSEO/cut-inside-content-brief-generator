// Brief List Card - Card component for displaying briefs in a list
import React, { useEffect, useRef, useState } from 'react';
import type { BriefWithClient, GenerationJobProgress } from '../../types/database';
import type { GenerationStatus } from '../../types/generationActivity';
import { isWorkflowStatus } from '../../types/database';
import { getGenerationProgressModel, getGenerationStatusBadgeLabel } from '../../utils/generationActivity';
import { formatRelativeTime } from '../../utils/relativeTime';
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
  onAssignProject?: (briefId: string, currentProjectId: string | null) => void;
  onUseAsTemplate: (briefId: string) => void;
  onArchive: (briefId: string) => void;
  projectName?: string | null;
  isSelected?: boolean;
  /** True when ANY card on the page is selected — keeps checkboxes visible while in selection mode. */
  hasActiveSelection?: boolean;
  onToggleSelect?: (briefId: string) => void;
  // Background generation
  isGenerating?: boolean;
  generationStatus?: GenerationStatus;
  generationStep?: number | null;
  generationProgress?: GenerationJobProgress;
  generationUpdatedAt?: string;
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

const FolderIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
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
  onAssignProject,
  onUseAsTemplate,
  onArchive,
  projectName,
  isSelected = false,
  hasActiveSelection = false,
  onToggleSelect,
  isGenerating = false,
  generationStatus = 'idle',
  generationStep = null,
  generationProgress,
  onWorkflowStatusChange,
  isGeneratingArticle = false,
}) => {
  const [showPublishModal, setShowPublishModal] = useState(false);

  const primaryKeywords = (() => {
    const strategyKeywords = brief.brief_data?.keyword_strategy?.primary_keywords;
    const candidates = strategyKeywords && strategyKeywords.length > 0
      ? strategyKeywords.map((k) => k.keyword)
      : (brief.keywords || []).map((k) => k.kw);

    const title = brief.name.trim().toLowerCase();
    return candidates
      .filter((kw): kw is string => Boolean(kw && kw.trim()))
      .filter((kw) => kw.trim().toLowerCase() !== title);
  })();

  const MAX_VISIBLE_KEYWORDS = 2;
  const visibleKeywords = primaryKeywords.slice(0, MAX_VISIBLE_KEYWORDS);
  const totalKeywords = brief.keywords?.length || 0;
  const hiddenKeywordCount = Math.max(0, totalKeywords - visibleKeywords.length);

  const rawGenerationModel = getGenerationProgressModel({
    status: generationStatus,
    generationStep,
    jobProgress: generationProgress,
  });

  // Clamp the card's progress bar monotonically across Realtime events so the
  // bar never regresses during step or phase transitions.
  const maxPercentageRef = useRef<number>(0);
  const prevStatusRef = useRef<typeof generationStatus>(generationStatus);
  useEffect(() => {
    // Reset the clamp whenever this card returns to idle or changes generation phase.
    if (!isGenerating || prevStatusRef.current !== generationStatus) {
      maxPercentageRef.current = 0;
    }
    prevStatusRef.current = generationStatus;
  }, [isGenerating, generationStatus]);
  const clampedPercentage = isGenerating
    ? Math.max(maxPercentageRef.current, rawGenerationModel.percentage)
    : rawGenerationModel.percentage;
  if (isGenerating && clampedPercentage > maxPercentageRef.current) {
    maxPercentageRef.current = clampedPercentage;
  }
  const generationModel = { ...rawGenerationModel, percentage: clampedPercentage };

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

  // Primary action — clicking the card body goes here.
  const handleCardClick = () => {
    if (isGenerating) {
      onContinue(brief.id);
      return;
    }
    if (brief.status === 'complete' || isWorkflow) {
      onEdit(brief.id);
      return;
    }
    if (brief.status !== 'archived') {
      onContinue(brief.id);
    }
  };

  const stopClick = (event: React.MouseEvent) => event.stopPropagation();

  return (
    <>
      <WorkItemCard
        hover
        accentClassName={getStatusBorderColor()}
        selected={isSelected}
        highlighted={isGenerating}
        onClick={brief.status === 'archived' ? undefined : handleCardClick}
        header={(
          <div className="flex items-start gap-3">
            {onToggleSelect && (
              <div
                className={`pt-0.5 flex-shrink-0 transition-opacity ${
                  isSelected || hasActiveSelection
                    ? 'opacity-100'
                    : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                }`}
                onClick={stopClick}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelect(brief.id)}
                  onClick={stopClick}
                  className="data-[state=checked]:bg-teal data-[state=checked]:border-teal"
                />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-heading font-semibold text-foreground leading-snug line-clamp-2">
                {brief.name}
              </h3>
              {projectName && (
                <div className="mt-1">
                  <Badge variant="default" size="sm">{projectName}</Badge>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0" onClick={stopClick}>
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
                    <button
                      onClick={stopClick}
                      className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <MoreHorizontalIcon className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onUseAsTemplate(brief.id)}>
                      <CopyIcon className="h-4 w-4 mr-2" />
                      Use as Template
                    </DropdownMenuItem>
                    {onAssignProject && (
                      <DropdownMenuItem onClick={() => onAssignProject(brief.id, brief.project_id)}>
                        <FolderIcon className="h-4 w-4 mr-2" />
                        Assign Project
                      </DropdownMenuItem>
                    )}
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
        footer={(
          <div
            className="flex items-center justify-between gap-2 w-full"
            onClick={stopClick}
          >
            <div className="flex items-center gap-2 flex-wrap">
              {isGenerating ? (
                <Button variant="primary" size="sm" onClick={() => onContinue(brief.id)}>
                  View Progress
                </Button>
              ) : null}
              {!isGenerating && (
                <>
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
                </>
              )}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatRelativeTime(brief.updated_at)}
            </span>
          </div>
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 min-h-[1.5rem]">
          {visibleKeywords.map((keyword, index) => (
            <Badge key={index} variant="outline" size="sm" className="max-w-[12rem] truncate">
              {keyword}
            </Badge>
          ))}
          {hiddenKeywordCount > 0 && (
            <span className="text-xs text-muted-foreground">
              +{hiddenKeywordCount}
            </span>
          )}
        </div>

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

        {brief.published_url && !isGenerating && (
          <a
            href={brief.published_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={stopClick}
            className="inline-flex items-center gap-1 mt-3 text-xs text-teal hover:underline truncate max-w-full"
          >
            <LinkIcon className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{brief.published_url.replace(/^https?:\/\//, '')}</span>
          </a>
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
