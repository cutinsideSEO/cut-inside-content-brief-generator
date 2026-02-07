// Brief List Card - Card component for displaying briefs in a list
import React from 'react';
import type { BriefWithClient } from '../../types/database';
import BriefStatusBadge from './BriefStatusBadge';
import Button from '../Button';
import { Badge, Progress, Checkbox, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../ui';

// Generation status type
type GenerationStatus = 'idle' | 'analyzing_competitors' | 'generating_brief' | 'generating_content';

interface BriefListCardProps {
  brief: BriefWithClient;
  onContinue: (briefId: string) => void;
  onEdit: (briefId: string) => void;
  onUseAsTemplate: (briefId: string) => void;
  onArchive: (briefId: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (briefId: string) => void;
  // Background generation
  isGenerating?: boolean;
  generationStatus?: GenerationStatus;
  generationStep?: number | null;
  // Article indicator
  articleCount?: number;
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

const BriefListCard: React.FC<BriefListCardProps> = ({
  brief,
  onContinue,
  onEdit,
  onUseAsTemplate,
  onArchive,
  isSelected = false,
  onToggleSelect,
  isGenerating = false,
  generationStatus = 'idle',
  generationStep = null,
  articleCount,
}) => {
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
    if (isGenerating) {
      if (generationStatus === 'analyzing_competitors') return 'Analyzing Competitors...';
      if (generationStatus === 'generating_brief') return `Generating Brief... Step ${generationStep || 1}/7`;
      if (generationStatus === 'generating_content') return 'Generating Content...';
    }
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
      return brief.keywords?.slice(0, 3).map(k => k.kw) || [];
    }
    return keywords.slice(0, 3).map(k => k.keyword);
  };

  const getGenerationProgress = () => {
    if (generationStatus === 'analyzing_competitors') return 15;
    if (generationStatus === 'generating_brief' && generationStep) return 20 + (generationStep / 7) * 60;
    if (generationStatus === 'generating_content') return 85;
    return 0;
  };

  const primaryKeywords = getPrimaryKeywords();

  // Status color for left border
  const statusBorderColor = isGenerating
    ? 'border-l-amber-400'
    : brief.status === 'complete'
      ? 'border-l-emerald-400'
      : brief.status === 'in_progress'
        ? 'border-l-amber-400'
        : 'border-l-gray-300';

  return (
    <div
      className={`
        group relative bg-card border border-border rounded-lg shadow-card
        transition-all duration-200 hover:shadow-card-hover hover:border-gray-300
        border-l-4 ${statusBorderColor}
        ${isSelected ? 'ring-2 ring-teal/40 border-teal/50' : ''}
        ${isGenerating ? 'ring-1 ring-status-generating/30' : ''}
      `}
    >
      {/* Card body */}
      <div className="p-4">
        {/* Top row: checkbox + name + status badge + menu */}
        <div className="flex items-start gap-3">
          {/* Checkbox — inline, not overlapping */}
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

          {/* Title + client */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-heading font-semibold text-foreground leading-snug truncate">
              {brief.name}
            </h3>
            {brief.client && (
              <p className="text-xs text-muted-foreground mt-0.5">{brief.client.name}</p>
            )}
          </div>

          {/* Status + menu */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isGenerating ? (
              <Badge variant="warning" size="sm" pulse>
                {generationStatus === 'analyzing_competitors' ? 'Analyzing' :
                 generationStatus === 'generating_brief' ? 'Generating' : 'Writing'}
              </Badge>
            ) : (
              <BriefStatusBadge status={brief.status} />
            )}
            {!isGenerating && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100">
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

        {/* Keywords */}
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

        {/* Progress bar for generation */}
        {isGenerating && (
          <div className="mt-3">
            <Progress
              value={getGenerationProgress()}
              size="sm"
              color="yellow"
              label={getProgressText()}
              showLabel
            />
          </div>
        )}

        {/* Meta row: progress + updated date */}
        {!isGenerating && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
            <span>{getProgressText()}</span>
            <span className="text-border">·</span>
            <span>{formatDate(brief.updated_at)}, {formatTime(brief.updated_at)}</span>
            {articleCount !== undefined && articleCount > 0 && (
              <>
                <span className="text-border">·</span>
                <span className="text-teal font-medium">{articleCount} article{articleCount > 1 ? 's' : ''}</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer: action button */}
      <div className="px-4 py-2.5 border-t border-border bg-secondary/30 rounded-b-lg flex items-center justify-between">
        {isGenerating ? (
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => onContinue(brief.id)}>
              View Progress
            </Button>
            <span className="flex items-center text-xs text-amber-500">
              <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Keep this tab open
            </span>
          </div>
        ) : (
          <>
            {brief.status !== 'complete' && brief.status !== 'archived' && (
              <Button variant="primary" size="sm" onClick={() => onContinue(brief.id)}>
                Continue
              </Button>
            )}
            {brief.status === 'complete' && (
              <Button variant="primary" size="sm" onClick={() => onEdit(brief.id)}>
                View / Edit
              </Button>
            )}
            {brief.status === 'archived' && <div />}
          </>
        )}
      </div>
    </div>
  );
};

export default BriefListCard;
