import React from 'react';
import type { ArticleWithBrief } from '../../types/database';
import { Badge, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui';
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
        <div className="group bg-card border border-border rounded-lg shadow-card transition-all duration-200 hover:shadow-card-hover hover:border-gray-300">
            {/* Card body */}
            <div className="p-4">
                {/* Top row: icon + title + badges + menu */}
                <div className="flex items-start gap-3">
                    <div className="pt-0.5 flex-shrink-0">
                        <FileTextIcon className="h-4 w-4 text-teal" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-heading font-semibold text-foreground leading-snug truncate">
                            {article.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            From: {article.brief_name}
                        </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {article.is_current && <Badge variant="success" size="sm">Current</Badge>}
                        <Badge variant="default" size="sm">v{article.version}</Badge>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 focus:opacity-100">
                                    <MoreHorizontalIcon className="h-4 w-4" />
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
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
                    <span>{wordCount.toLocaleString()} words</span>
                    <span className="text-border">·</span>
                    <span>{formatDate(article.created_at)}</span>
                </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-border bg-secondary/30 rounded-b-lg">
                <Button variant="primary" size="sm" onClick={() => onView(article.id)}>
                    View Article
                </Button>
            </div>
        </div>
    );
};

export default ArticleListCard;
