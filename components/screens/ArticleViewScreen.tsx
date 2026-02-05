import React, { useState, useEffect } from 'react';
import { getArticle } from '../../services/articleService';
import type { BriefArticle } from '../../types/database';
import Button from '../Button';
import { Card, Alert, Skeleton, Badge } from '../ui';

interface ArticleViewScreenProps {
    articleId: string;
    onBack: () => void;
}

const ArticleViewScreen: React.FC<ArticleViewScreenProps> = ({ articleId, onBack }) => {
    const [article, setArticle] = useState<BriefArticle | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadArticle();
    }, [articleId]);

    const loadArticle = async () => {
        setIsLoading(true);
        const { data, error: fetchError } = await getArticle(articleId);
        if (fetchError) {
            setError(fetchError);
        } else {
            setArticle(data);
        }
        setIsLoading(false);
    };

    const handleCopy = async () => {
        if (!article) return;
        await navigator.clipboard.writeText(article.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const wordCount = article?.content.trim().split(/\s+/).filter(Boolean).length || 0;

    // Simple markdown rendering
    const renderMarkdown = (text: string) => {
        return text
            .replace(/^### (.+)$/gm, '<h3 class="text-lg font-heading font-semibold text-gray-900 mt-6 mb-2">$1</h3>')
            .replace(/^## (.+)$/gm, '<h2 class="text-xl font-heading font-bold text-gray-900 mt-8 mb-3">$1</h2>')
            .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-heading font-bold text-gray-900 mt-8 mb-4">$1</h1>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-600">$1</li>')
            .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-gray-600">$2</li>')
            .replace(/\n\n/g, '</p><p class="text-gray-600 leading-relaxed mb-4">')
            .replace(/^(?!<)/, '<p class="text-gray-600 leading-relaxed mb-4">')
            .replace(/$/, '</p>');
    };

    if (isLoading) {
        return (
            <div className="p-6 lg:p-8">
                <Skeleton variant="text" width="40%" height={32} className="mb-4" />
                <Skeleton variant="text" width="100%" height={400} />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 lg:p-8">
                <Alert variant="error" title="Error loading article">{error}</Alert>
                <Button variant="secondary" onClick={onBack} className="mt-4">Back to Articles</Button>
            </div>
        );
    }

    if (!article) return null;

    return (
        <div className="p-6 lg:p-8 max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-sm text-gray-600 hover:text-teal transition-colors mb-3 group"
                    >
                        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Articles
                    </button>
                    <h1 className="text-2xl font-heading font-bold text-gray-900">{article.title}</h1>
                    <div className="flex items-center gap-3 mt-2">
                        <Badge variant="default" size="sm">Version {article.version}</Badge>
                        {article.is_current && <Badge variant="success" size="sm">Current</Badge>}
                        <span className="text-sm text-gray-400">{wordCount.toLocaleString()} words</span>
                        <span className="text-sm text-gray-400">
                            {new Date(article.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                    </div>
                </div>
                <Button variant="secondary" onClick={handleCopy}>
                    {copied ? 'Copied!' : 'Copy to Clipboard'}
                </Button>
            </div>

            {/* Article content */}
            <Card variant="default" padding="lg">
                <div
                    className="prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(article.content) }}
                />
            </Card>
        </div>
    );
};

export default ArticleViewScreen;
