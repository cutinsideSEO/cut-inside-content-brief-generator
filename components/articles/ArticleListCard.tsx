import React from 'react';
import type { ArticleWithBrief } from '../../types/database';
import { Card, Badge, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui';
import Button from '../Button';
import { FileTextIcon } from '../Icon';

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

interface ArticleListCardProps {
    article: ArticleWithBrief;
    onView: (articleId: string) => void;
    onDelete: (articleId: string) => void;
}

const ArticleListCard: React.FC<ArticleListCardProps> = ({ article, onView, onDelete }) => {
    const wordCount = article.content.trim().split(/\s+/).filter(Boolean).length;

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    return (
        <Card variant="default" padding="md" hover className="flex flex-col h-full">
            <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <FileTextIcon className="h-4 w-4 text-teal flex-shrink-0" />
                        <h3 className="text-base font-heading font-semibold text-gray-900 truncate">
                            {article.title}
                        </h3>
                    </div>
                    <p className="text-sm text-gray-500">
                        From: <span className="text-gray-600">{article.brief_name}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {article.is_current && <Badge variant="success" size="sm">Current</Badge>}
                    <Badge variant="default" size="sm">v{article.version}</Badge>
                </div>
            </div>

            <div className="flex items-center text-sm text-gray-600 mb-3">
                <span className="mr-3">
                    <span className="text-gray-400">Words:</span>{' '}
                    <span className="text-gray-900">{wordCount.toLocaleString()}</span>
                </span>
                <span className="text-gray-400">|</span>
                <span className="ml-3">
                    <span className="text-gray-400">Created:</span>{' '}
                    {formatDate(article.created_at)}
                </span>
            </div>

            {/* Actions — primary CTA left, dropdown menu right */}
            <div className="flex items-center justify-between mt-auto pt-3">
                <Button variant="primary" size="sm" onClick={() => onView(article.id)}>
                    View Article
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-md hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                            <MoreHorizontalIcon className="h-5 w-5" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
        </Card>
    );
};

export default ArticleListCard;
