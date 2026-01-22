// Brief List Card - Card component for displaying briefs in a list
import React from 'react';
import type { BriefWithClient } from '../../types/database';
import BriefStatusBadge from './BriefStatusBadge';
import Button from '../Button';

interface BriefListCardProps {
  brief: BriefWithClient;
  onContinue: (briefId: string) => void;
  onEdit: (briefId: string) => void;
  onUseAsTemplate: (briefId: string) => void;
  onArchive: (briefId: string) => void;
  isSelected?: boolean;
}

const BriefListCard: React.FC<BriefListCardProps> = ({
  brief,
  onContinue,
  onEdit,
  onUseAsTemplate,
  onArchive,
  isSelected = false,
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

  const primaryKeywords = getPrimaryKeywords();

  return (
    <div
      className={`
        relative bg-black/30 border rounded-lg p-4 transition-all duration-200
        hover:bg-black/40 hover:border-teal/50
        ${isSelected ? 'border-teal ring-1 ring-teal' : 'border-white/10'}
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-heading font-semibold text-brand-white truncate">
            {brief.name}
          </h3>
          {brief.client && (
            <p className="text-sm text-grey mt-0.5">{brief.client.name}</p>
          )}
        </div>
        <BriefStatusBadge status={brief.status} className="ml-3 flex-shrink-0" />
      </div>

      {/* Keywords */}
      {primaryKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {primaryKeywords.map((keyword, index) => (
            <span
              key={index}
              className="inline-block px-2 py-0.5 bg-teal/10 border border-teal/20 rounded text-xs text-teal"
            >
              {keyword}
            </span>
          ))}
          {(brief.keywords?.length || 0) > 3 && (
            <span className="inline-block px-2 py-0.5 text-xs text-grey">
              +{(brief.keywords?.length || 0) - 3} more
            </span>
          )}
        </div>
      )}

      {/* Progress and metadata */}
      <div className="flex items-center text-xs text-grey mb-4">
        <span className="mr-3">
          <span className="text-grey/60">Progress:</span>{' '}
          <span className="text-brand-white">{getProgressText()}</span>
        </span>
        <span className="text-grey/40">|</span>
        <span className="ml-3">
          <span className="text-grey/60">Updated:</span>{' '}
          {formatDate(brief.updated_at)} at {formatTime(brief.updated_at)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
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
            variant="ghost"
            size="sm"
            onClick={() => onArchive(brief.id)}
            className="text-grey hover:text-red-400"
          >
            Archive
          </Button>
        )}
      </div>
    </div>
  );
};

export default BriefListCard;
