import React, { useState } from 'react';
import type { ArticleWithBrief, ArticleStatus } from '../../types/database';
import { Badge, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, WorkItemCard } from '../ui';
import { FileTextIcon } from '../Icon';
import { formatRelativeTime } from '../../utils/relativeTime';
import ArticleStatusBadge from './ArticleStatusBadge';
import WorkflowStatusSelect from '../briefs/WorkflowStatusSelect';
import PublishedUrlModal from '../briefs/PublishedUrlModal';

const MoreHorizontalIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" />
  </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);

const FolderIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
);

const LinkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
  </svg>
);

interface ArticleListCardProps {
  article: ArticleWithBrief;
  onView: (articleId: string) => void;
  onDelete: (articleId: string) => void;
  onStatusChange?: (articleId: string, newStatus: string, metadata?: { published_url?: string }) => void;
  onAssignProject?: (articleId: string, currentProjectId: string | null) => void;
  projectName?: string | null;
}

const ArticleListCard: React.FC<ArticleListCardProps> = ({ article, onView, onDelete, onStatusChange, onAssignProject, projectName }) => {
  const wordCount = article.content.trim().split(/\s+/).filter(Boolean).length;
  const [showPublishModal, setShowPublishModal] = useState(false);

  const articleStatus = article.status || 'draft';
  const stopClick = (event: React.MouseEvent) => event.stopPropagation();

  return (
    <>
      <WorkItemCard
        hover
        onClick={() => onView(article.id)}
        header={(
          <div className="flex items-start gap-3">
            <div className="pt-0.5 flex-shrink-0">
              <FileTextIcon className="h-4 w-4 text-teal" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="text-base font-heading font-semibold text-foreground leading-snug line-clamp-2">
                {article.title}
              </h3>
              {article.brief_name && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  From: {article.brief_name}
                </p>
              )}
              {projectName && (
                <div className="mt-1">
                  <Badge variant="default" size="sm">{projectName}</Badge>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0" onClick={stopClick}>
              {onStatusChange ? (
                <WorkflowStatusSelect
                  entityType="article"
                  entityId={article.id}
                  currentStatus={articleStatus}
                  publishedUrl={article.published_url}
                  onStatusChange={(newStatus, metadata) => onStatusChange(article.id, newStatus, metadata)}
                  onPublishClick={() => setShowPublishModal(true)}
                />
              ) : (
                <ArticleStatusBadge status={articleStatus} />
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    onClick={stopClick}
                    className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontalIcon className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onAssignProject && (
                    <>
                      <DropdownMenuItem onClick={() => onAssignProject(article.id, article.project_id)}>
                        <FolderIcon className="h-4 w-4 mr-2" />
                        Assign Project
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => { if (window.confirm('Delete this article version?')) onDelete(article.id); }}
                    className="text-red-500 focus:text-red-500"
                  >
                    <TrashIcon className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
        footer={(
          <div
            className="flex items-center justify-between gap-2 w-full text-xs text-muted-foreground"
            onClick={stopClick}
          >
            <div className="flex items-center gap-2">
              <span>v{article.version}</span>
              <span className="text-border">·</span>
              <span>{wordCount.toLocaleString()} words</span>
              {article.is_current && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-teal font-medium">Current</span>
                </>
              )}
            </div>
            <span>{formatRelativeTime(article.created_at)}</span>
          </div>
        )}
      >
        {article.published_url && (
          <a
            href={article.published_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={stopClick}
            className="inline-flex items-center gap-1 mt-3 text-xs text-teal hover:underline truncate max-w-full"
          >
            <LinkIcon className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{article.published_url.replace(/^https?:\/\//, '')}</span>
          </a>
        )}
      </WorkItemCard>

      <PublishedUrlModal
        isOpen={showPublishModal}
        onClose={() => setShowPublishModal(false)}
        onConfirm={(url) => {
          onStatusChange?.(article.id, 'published', { published_url: url });
          setShowPublishModal(false);
        }}
        existingUrl={article.published_url}
      />
    </>
  );
};

export default ArticleListCard;
