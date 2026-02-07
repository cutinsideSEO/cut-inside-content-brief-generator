// Brief List Card - Card component for displaying briefs in a list
import React from 'react';
import type { BriefWithClient } from '../../types/database';
import BriefStatusBadge from './BriefStatusBadge';
import Button from '../Button';
import { Card, Badge, Progress, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '../ui';

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
    // Show generation status if actively generating
    if (isGenerating) {
      if (generationStatus === 'analyzing_competitors') {
        return 'Analyzing Competitors...';
      } else if (generationStatus === 'generating_brief') {
        return `Generating Brief... Step ${generationStep || 1}/7`;
      } else if (generationStatus === 'generating_content') {
        return 'Generating Content...';
      }
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
      // Fall back to input keywords
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

  const getStatusBorder = () => {
    if (isGenerating) return 'generating';
    if (brief.status === 'complete') return 'complete';
    if (brief.status === 'in_progress') return 'generating';
    if (brief.status === 'draft') return 'draft';
    return 'none';
  };

  const primaryKeywords = getPrimaryKeywords();

  return (
    <Card
      variant="default"
      padding="md"
      hover
      statusBorder={getStatusBorder()}
      className={`
        flex flex-col h-full
        ${isSelected ? 'border-teal ring-1 ring-teal' : ''}
        ${isGenerating ? 'border-amber-400/50 ring-1 ring-status-generating/30' : ''}
      `}
    >
      {/* Selection checkbox */}
      {onToggleSelect && (
        <div className="absolute top-3 left-3 z-10">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleSelect(brief.id); }}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              isSelected
                ? 'bg-teal border-teal text-white'
                : 'border-gray-300 hover:border-teal bg-white'
            }`}
          >
            {isSelected && (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-heading font-semibold text-gray-900 truncate">
            {brief.name}
          </h3>
          {brief.client && (
            <p className="text-sm text-gray-500 mt-0.5">{brief.client.name}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          {isGenerating ? (
            <Badge variant="warning" size="sm" pulse>
              {generationStatus === 'analyzing_competitors' ? 'Analyzing' :
               generationStatus === 'generating_brief' ? 'Generating Brief' : 'Generating Content'}
            </Badge>
          ) : (
            <BriefStatusBadge status={brief.status} />
          )}
        </div>
      </div>

      {/* Keywords */}
      {primaryKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {primaryKeywords.map((keyword, index) => (
            <Badge key={index} variant="teal" size="sm">
              {keyword}
            </Badge>
          ))}
          {(brief.keywords?.length || 0) > 3 && (
            <span className="inline-block px-2 py-0.5 text-xs text-gray-400">
              +{(brief.keywords?.length || 0) - 3} more
            </span>
          )}
        </div>
      )}

      {/* Progress bar for generation */}
      {isGenerating && (
        <div className="mb-3">
          <Progress
            value={getGenerationProgress()}
            size="sm"
            color="yellow"
            label={getProgressText()}
            showLabel
          />
        </div>
      )}

      {/* Progress and metadata */}
      {!isGenerating && (
        <div className="flex items-center flex-wrap text-sm text-gray-600 mb-3">
          <span className="mr-3">
            <span className="text-gray-400">Progress:</span>{' '}
            <span className="text-gray-900">{getProgressText()}</span>
          </span>
          <span className="text-gray-400">|</span>
          <span className="ml-3">
            <span className="text-gray-400">Updated:</span>{' '}
            {formatDate(brief.updated_at)} at {formatTime(brief.updated_at)}
          </span>
          {articleCount !== undefined && articleCount > 0 && (
            <>
              <span className="text-gray-400 ml-3">|</span>
              <span className="ml-3">
                <span className="text-teal">{articleCount} article{articleCount > 1 ? 's' : ''}</span>
              </span>
            </>
          )}
        </div>
      )}

      {/* Actions — primary CTA left, dropdown menu right */}
      <div className="flex items-center justify-between mt-auto pt-3">
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

        {!isGenerating && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                <MoreHorizontalIcon className="h-5 w-5" />
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
    </Card>
  );
};

export default BriefListCard;
