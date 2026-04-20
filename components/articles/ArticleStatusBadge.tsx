// Article Status Badge - Compact dot + label indicator (no pill fill)
import React from 'react';
import type { ArticleStatus } from '../../types/database';
import { cn } from '../../lib/utils';

interface ArticleStatusBadgeProps {
  status: ArticleStatus;
  className?: string;
}

const statusConfig: Record<ArticleStatus, { label: string; dotClassName: string }> = {
  draft: { label: 'Draft', dotClassName: 'bg-gray-300' },
  sent_to_client: { label: 'Sent to Client', dotClassName: 'bg-teal-500' },
  approved: { label: 'Approved', dotClassName: 'bg-emerald-500' },
  published: { label: 'Published', dotClassName: 'bg-emerald-600' },
};

const ArticleStatusBadge: React.FC<ArticleStatusBadgeProps> = ({ status, className = '' }) => {
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

export default ArticleStatusBadge;
