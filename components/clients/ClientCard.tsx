// Client Card - Card component for displaying client folders
import React from 'react';
import type { ClientWithBriefCount } from '../../types/database';

interface ClientCardProps {
  client: ClientWithBriefCount;
  onClick: (clientId: string) => void;
  isSelected?: boolean;
}

const ClientCard: React.FC<ClientCardProps> = ({
  client,
  onClick,
  isSelected = false,
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
    <button
      onClick={() => onClick(client.id)}
      className={`
        w-full text-left p-4 rounded-lg border transition-all duration-200
        bg-black/30 hover:bg-black/40
        ${isSelected
          ? 'border-teal ring-1 ring-teal'
          : 'border-white/10 hover:border-teal/50'
        }
      `}
    >
      {/* Folder Icon and Name */}
      <div className="flex items-start">
        <div className="flex-shrink-0 w-10 h-10 bg-teal/20 rounded-lg flex items-center justify-center mr-3">
          <svg
            className="w-5 h-5 text-teal"
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
          <h3 className="text-lg font-heading font-semibold text-brand-white truncate">
            {client.name}
          </h3>
          {client.description && (
            <p className="text-sm text-grey mt-0.5 line-clamp-2">
              {client.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-grey">
        <span>
          <span className="text-brand-white font-medium">{client.brief_count}</span>
          {' '}{client.brief_count === 1 ? 'brief' : 'briefs'}
        </span>
        <span>
          Created {formatDate(client.created_at)}
        </span>
      </div>
    </button>
  );
};

export default ClientCard;
