// Brief List Card - Card component for displaying briefs in a list
import React from 'react';
import type { BriefWithClient } from '../../types/database';
import BriefStatusBadge from './BriefStatusBadge';
import Button from '../Button';
import { Card, Badge, Progress } from '../ui';

// Generation status type
type GenerationStatus = 'idle' | 'analyzing_competitors' | 'generating_brief' | 'generating_content';

interface BriefListCardProps {
  brief: BriefWithClient;
  onContinue: (briefId: string) => void;
  onEdit: (briefId: string) => void;
  onUseAsTemplate: (briefId: string) => void;
  onArchive: (briefId: string) => void;
  isSelected?: boolean;
  // Background generation
  isGenerating?: boolean;
  generationStatus?: GenerationStatus;
  generationStep?: number | null;
}

const BriefListCard: React.FC<BriefListCardProps> = ({
  brief,
  onContinue,
  onEdit,
  onUseAsTemplate,
  onArchive,
  isSelected = false,
  isGenerating = false,
  generationStatus = 'idle',
  generationStep = null,
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
      glow="teal"
      statusBorder={getStatusBorder()}
      className={`
        relative
        ${isSelected ? 'border-teal ring-1 ring-teal' : ''}
        ${isGenerating ? 'border-status-generating/50 ring-1 ring-status-generating/30' : ''}
      `}
    >
      {/* Generation indicator */}
      {isGenerating && (
        <div className="absolute top-3 right-3 flex items-center gap-2">
          <Badge variant="warning" size="sm" pulse>
            {generationStatus === 'analyzing_competitors' ? 'Analyzing' :
             generationStatus === 'generating_brief' ? 'Generating Brief' : 'Generating Content'}
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-heading font-semibold text-text-primary truncate">
            {brief.name}
          </h3>
          {brief.client && (
            <p className="text-sm text-text-tertiary mt-0.5">{brief.client.name}</p>
          )}
        </div>
        {!isGenerating && <BriefStatusBadge status={brief.status} className="ml-3 flex-shrink-0" />}
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
            <span className="inline-block px-2 py-0.5 text-xs text-text-muted">
              +{(brief.keywords?.length || 0) - 3} more
            </span>
          )}
        </div>
      )}

      {/* Progress bar for generation */}
      {isGenerating && (
        <div className="mb-4">
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
        <div className="flex items-center text-sm text-text-secondary mb-4">
          <span className="mr-3">
            <span className="text-text-muted">Progress:</span>{' '}
            <span className="text-text-primary">{getProgressText()}</span>
          </span>
          <span className="text-text-muted">|</span>
          <span className="ml-3">
            <span className="text-text-muted">Updated:</span>{' '}
            {formatDate(brief.updated_at)} at {formatTime(brief.updated_at)}
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-3 border-t border-border-subtle">
        {isGenerating ? (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onContinue(brief.id)}
            >
              View Progress
            </Button>
            <span className="flex items-center text-xs text-status-generating ml-2">
              <svg className="animate-spin h-3 w-3 mr-1" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Keep this tab open
            </span>
          </>
        ) : (
          <>
            {brief.status !== 'complete' && brief.status !== 'archived' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onContinue(brief.id)}
              >
                Continue
              </Button>
            )}
            {brief.status === 'complete' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onEdit(brief.id)}
              >
                View / Edit
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onUseAsTemplate(brief.id)}
            >
              Use as Template
            </Button>
            {brief.status !== 'archived' && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => onArchive(brief.id)}
              >
                Archive
              </Button>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

export default BriefListCard;
