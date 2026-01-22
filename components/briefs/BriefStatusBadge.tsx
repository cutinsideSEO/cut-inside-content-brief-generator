// Brief Status Badge - Visual indicator for brief status
import React from 'react';
import type { BriefStatus } from '../../types/database';
import { Badge } from '../ui';
import type { BadgeProps } from '../ui/Badge';

interface BriefStatusBadgeProps {
  status: BriefStatus;
  className?: string;
}

const statusConfig: Record<BriefStatus, { label: string; variant: BadgeProps['variant'] }> = {
  draft: {
    label: 'Draft',
    variant: 'default',
  },
  in_progress: {
    label: 'In Progress',
    variant: 'warning',
  },
  complete: {
    label: 'Complete',
    variant: 'success',
  },
  archived: {
    label: 'Archived',
    variant: 'error',
  },
};

const BriefStatusBadge: React.FC<BriefStatusBadgeProps> = ({ status, className = '' }) => {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge variant={config.variant} size="sm" className={className}>
      {config.label}
    </Badge>
  );
};

export default BriefStatusBadge;
