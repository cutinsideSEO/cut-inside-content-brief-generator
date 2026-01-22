// Brief Status Badge - Visual indicator for brief status
import React from 'react';
import type { BriefStatus } from '../../types/database';

interface BriefStatusBadgeProps {
  status: BriefStatus;
  className?: string;
}

const statusConfig: Record<BriefStatus, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-grey/20 text-grey border-grey/30',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-yellow/20 text-yellow border-yellow/30',
  },
  complete: {
    label: 'Complete',
    className: 'bg-teal/20 text-teal border-teal/30',
  },
  archived: {
    label: 'Archived',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
};

const BriefStatusBadge: React.FC<BriefStatusBadgeProps> = ({ status, className = '' }) => {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border
        ${config.className}
        ${className}
      `}
    >
      {config.label}
    </span>
  );
};

export default BriefStatusBadge;
