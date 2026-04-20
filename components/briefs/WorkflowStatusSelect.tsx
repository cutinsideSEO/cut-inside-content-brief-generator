// Workflow Status Select - Dropdown for transitioning brief/article workflow statuses
import React from 'react';
import type { BriefStatus, ArticleStatus } from '../../types/database';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../ui';
import BriefStatusBadge from './BriefStatusBadge';
import ArticleStatusBadge from '../articles/ArticleStatusBadge';
import { ChevronDownIcon } from '../Icon';

interface WorkflowStatusSelectProps {
  entityType: 'brief' | 'article';
  entityId: string;
  currentStatus: BriefStatus | ArticleStatus;
  publishedUrl?: string | null;
  onStatusChange: (newStatus: string, metadata?: { published_url?: string; published_at?: string }) => void;
  onPublishClick?: () => void;
  disabled?: boolean;
}

export interface TransitionOption {
  status: string;
  label: string;
  isRevert: boolean;
}

// Brief workflow transitions: from -> available next statuses
export const BRIEF_TRANSITIONS: Record<string, TransitionOption[]> = {
  complete: [
    { status: 'sent_to_client', label: 'Sent to Client', isRevert: false },
  ],
  sent_to_client: [
    { status: 'approved', label: 'Approved', isRevert: false },
    { status: 'changes_requested', label: 'Changes Requested', isRevert: false },
    { status: 'complete', label: 'Complete (Revert)', isRevert: true },
  ],
  approved: [
    { status: 'in_writing', label: 'In Writing', isRevert: false },
    { status: 'complete', label: 'Complete (Revert)', isRevert: true },
  ],
  changes_requested: [
    { status: 'sent_to_client', label: 'Sent to Client', isRevert: false },
    { status: 'complete', label: 'Complete (Revert)', isRevert: true },
  ],
  in_writing: [
    { status: 'published', label: 'Published', isRevert: false },
    { status: 'approved', label: 'Approved (Revert)', isRevert: true },
  ],
  published: [
    { status: 'in_writing', label: 'In Writing (Revert)', isRevert: true },
  ],
};

// Article workflow transitions: from -> available next statuses
export const ARTICLE_TRANSITIONS: Record<string, TransitionOption[]> = {
  draft: [
    { status: 'sent_to_client', label: 'Sent to Client', isRevert: false },
  ],
  sent_to_client: [
    { status: 'approved', label: 'Approved', isRevert: false },
    { status: 'draft', label: 'Draft (Revert)', isRevert: true },
  ],
  approved: [
    { status: 'published', label: 'Published', isRevert: false },
    { status: 'sent_to_client', label: 'Sent to Client (Revert)', isRevert: true },
  ],
  published: [
    { status: 'approved', label: 'Approved (Revert)', isRevert: true },
  ],
};

const WorkflowStatusSelect: React.FC<WorkflowStatusSelectProps> = ({
  entityType,
  entityId: _entityId,
  currentStatus,
  publishedUrl: _publishedUrl,
  onStatusChange,
  onPublishClick,
  disabled = false,
}) => {
  const transitions = entityType === 'brief' ? BRIEF_TRANSITIONS : ARTICLE_TRANSITIONS;
  const availableTransitions = transitions[currentStatus] || [];

  // Split into forward and revert transitions
  const forwardTransitions = availableTransitions.filter((t) => !t.isRevert);
  const revertTransitions = availableTransitions.filter((t) => t.isRevert);

  // No transitions available — just show the badge without dropdown
  if (availableTransitions.length === 0) {
    return entityType === 'brief' ? (
      <BriefStatusBadge status={currentStatus as BriefStatus} />
    ) : (
      <ArticleStatusBadge status={currentStatus as ArticleStatus} />
    );
  }

  const handleSelect = (option: TransitionOption) => {
    if (option.status === 'published' && onPublishClick) {
      onPublishClick();
    } else {
      onStatusChange(option.status);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <button
          type="button"
          className="inline-flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          disabled={disabled}
        >
          {entityType === 'brief' ? (
            <BriefStatusBadge status={currentStatus as BriefStatus} />
          ) : (
            <ArticleStatusBadge status={currentStatus as ArticleStatus} />
          )}
          <ChevronDownIcon className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[180px]">
        {forwardTransitions.map((option) => (
          <DropdownMenuItem
            key={option.status}
            onSelect={() => handleSelect(option)}
            className="cursor-pointer"
          >
            {option.label}
          </DropdownMenuItem>
        ))}
        {forwardTransitions.length > 0 && revertTransitions.length > 0 && (
          <DropdownMenuSeparator />
        )}
        {revertTransitions.map((option) => (
          <DropdownMenuItem
            key={option.status}
            onSelect={() => handleSelect(option)}
            className="cursor-pointer text-muted-foreground"
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default WorkflowStatusSelect;
