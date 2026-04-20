// Brief Status Badge - Compact dot + label indicator (no pill fill)
import React from 'react';
import type { BriefStatus } from '../../types/database';
import { cn } from '../../lib/utils';

interface BriefStatusBadgeProps {
  status: BriefStatus;
  className?: string;
}

const statusConfig: Record<BriefStatus, { label: string; dotClassName: string }> = {
  draft: { label: 'Draft', dotClassName: 'bg-gray-300' },
  in_progress: { label: 'In Progress', dotClassName: 'bg-amber-400' },
  complete: { label: 'Complete', dotClassName: 'bg-emerald-500' },
  sent_to_client: { label: 'Sent to Client', dotClassName: 'bg-teal-500' },
  approved: { label: 'Approved', dotClassName: 'bg-emerald-500' },
  changes_requested: { label: 'Changes Requested', dotClassName: 'bg-amber-500' },
  in_writing: { label: 'In Writing', dotClassName: 'bg-blue-500' },
  published: { label: 'Published', dotClassName: 'bg-emerald-600' },
  archived: { label: 'Archived', dotClassName: 'bg-gray-400' },
};

const BriefStatusBadge: React.FC<BriefStatusBadgeProps> = ({ status, className = '' }) => {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 whitespace-nowrap',
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dotClassName)} />
      {config.label}
    </span>
  );
};

export default BriefStatusBadge;
