// Brief Status Badge - Compact dot + label indicator (no pill fill)
import React from 'react';
import type { BriefStatus } from '../../types/database';
import { cn } from '../../lib/utils';
import { BRIEF_STATUS_COLOR } from '../../utils/briefStatusColors';

interface BriefStatusBadgeProps {
  status: BriefStatus;
  className?: string;
}

const BriefStatusBadge: React.FC<BriefStatusBadgeProps> = ({ status, className = '' }) => {
  const config = BRIEF_STATUS_COLOR[status] || BRIEF_STATUS_COLOR.draft;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 whitespace-nowrap',
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)} />
      {config.label}
    </span>
  );
};

export default BriefStatusBadge;
