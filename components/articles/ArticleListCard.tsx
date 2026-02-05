import React from 'react';
import type { ArticleWithBrief } from '../../types/database';
import { Card, Badge } from '../ui';
import Button from '../Button';
import { FileTextIcon } from '../Icon';

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
        <Card variant="default" padding="md" hover>
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <FileTextIcon className="h-4 w-4 text-teal flex-shrink-0" />
                        <h3 className="text-lg font-heading font-semibold text-gray-900 truncate">
                            {article.title}
                        </h3>
                    </div>
                    <p className="text-sm text-gray-500">
                        From: <span className="text-gray-600">{article.brief_name}</span>
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {article.is_current && <Badge variant="success" size="sm">Current</Badge>}
                    <Badge variant="default" size="sm">v{article.version}</Badge>
                </div>
            </div>

            <div className="flex items-center text-sm text-gray-600 mb-4">
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

            <div className="flex gap-2 pt-3 border-t border-gray-100">
                <Button variant="primary" size="sm" onClick={() => onView(article.id)}>
                    View Article
                </Button>
                <Button variant="danger" size="sm" onClick={() => {
                    if (window.confirm('Delete this article version?')) onDelete(article.id);
                }}>
                    Delete
                </Button>
            </div>
        </Card>
    );
};

export default ArticleListCard;
