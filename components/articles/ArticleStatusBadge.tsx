// Article Status Badge - Visual indicator for article status
import React from 'react';
import type { ArticleStatus } from '../../types/database';
import { Badge } from '../ui';
import type { BadgeProps } from '../ui/Badge';

interface ArticleStatusBadgeProps {
  status: ArticleStatus;
  className?: string;
}

const statusConfig: Record<ArticleStatus, { label: string; variant: BadgeProps['variant'] }> = {
  draft: {
    label: 'Draft',
    variant: 'default',
  },
  sent_to_client: {
    label: 'Sent to Client',
    variant: 'teal',
  },
  approved: {
    label: 'Approved',
    variant: 'success',
  },
  published: {
    label: 'Published',
    variant: 'success',
  },
};

const ArticleStatusBadge: React.FC<ArticleStatusBadgeProps> = ({ status, className = '' }) => {
  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge variant={config.variant} size="sm" className={className}>
      {config.label}
    </Badge>
  );
};

export default ArticleStatusBadge;
