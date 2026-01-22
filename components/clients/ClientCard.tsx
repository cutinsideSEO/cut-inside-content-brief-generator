// Client Card - Card component for displaying client folders
import React from 'react';
import type { ClientWithBriefCount } from '../../types/database';
import { Card, Badge } from '../ui';

interface ClientCardProps {
  client: ClientWithBriefCount;
  onClick: (clientId: string) => void;
  isSelected?: boolean;
  isGenerating?: boolean;
  generatingCount?: number;
}

const ClientCard: React.FC<ClientCardProps> = ({
  client,
  onClick,
  isSelected = false,
  isGenerating = false,
  generatingCount = 0,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Card
      variant="interactive"
      padding="md"
      hover
      glow={isGenerating ? 'yellow' : 'teal'}
      className={`
        relative cursor-pointer
        ${isGenerating ? 'border-status-generating/50 ring-1 ring-status-generating/30' : ''}
        ${isSelected ? 'border-teal ring-1 ring-teal' : ''}
      `}
      onClick={() => onClick(client.id)}
    >
      {/* Generation indicator */}
      {isGenerating && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          <Badge variant="warning" size="sm" pulse>
            {generatingCount > 1 ? `${generatingCount} Generating` : 'Generating'}
          </Badge>
        </div>
      )}

      {/* Folder Icon and Name */}
      <div className="flex items-start">
        <div className="flex-shrink-0 w-12 h-12 bg-teal/20 rounded-radius-lg flex items-center justify-center mr-4">
          <svg
            className="w-6 h-6 text-teal"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-heading font-semibold text-text-primary truncate">
            {client.name}
          </h3>
          {client.description && (
            <p className="text-sm text-text-tertiary mt-0.5 line-clamp-2">
              {client.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-between text-sm">
        <span className="text-text-secondary">
          <span className="text-text-primary font-medium">{client.brief_count}</span>
          {' '}{client.brief_count === 1 ? 'brief' : 'briefs'}
        </span>
        <span className="text-text-muted">
          Created {formatDate(client.created_at)}
        </span>
      </div>
    </Card>
  );
};

export default ClientCard;
