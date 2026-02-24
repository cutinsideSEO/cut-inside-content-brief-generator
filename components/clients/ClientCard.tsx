// Client Card - Card component for displaying client folders
import React from 'react';
import type { ClientWithBriefCount } from '../../types/database';
import { INDUSTRY_LABELS } from '../../types/clientProfile';
import type { IndustryVertical } from '../../types/clientProfile';
import { Card, Badge } from '../ui';
import { getClientColor } from '../../lib/clientColors';
import { getClientLogoUrl } from '../../lib/favicon';

interface ClientCardProps {
  client: ClientWithBriefCount;
  onClick: (clientId: string) => void;
  isSelected?: boolean;
  isGenerating?: boolean;
  generatingCount?: number;
  colorIndex?: number;
}

/** Get initials from client name (max 2 chars) */
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

const ClientCard: React.FC<ClientCardProps> = ({
  client,
  onClick,
  isSelected = false,
  isGenerating = false,
  generatingCount = 0,
  colorIndex = 0,
}) => {
  const clientColor = getClientColor(colorIndex);
  const brandColor = client.brand_identity?.brand_color;
  const logoUrl = getClientLogoUrl(client.brand_identity);
  const industry = client.brand_identity?.industry as IndustryVertical | undefined;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Use brand_color for border and icon background if set, otherwise fall back to palette
  const borderStyle = brandColor
    ? { borderLeftColor: brandColor }
    : undefined;
  const borderClass = brandColor ? 'border-l-4' : `border-l-4 ${clientColor.border}`;
  const iconBg = brandColor ? undefined : clientColor.bg;
  const iconBgStyle = brandColor ? { backgroundColor: `${brandColor}15` } : undefined;
  const initialsColor = brandColor ? { color: brandColor } : undefined;

  return (
    <Card
      variant="interactive"
      padding="md"
      hover
      glow={isGenerating ? 'yellow' : 'teal'}
      className={`
        relative cursor-pointer ${borderClass}
        ${isGenerating ? 'border-amber-400/50 ring-1 ring-status-generating/30' : ''}
        ${isSelected ? 'border-teal ring-1 ring-teal' : ''}
      `}
      style={borderStyle}
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

      {/* Icon/Logo/Initials and Name */}
      <div className="flex items-start">
        {logoUrl ? (
          <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden mr-4 border border-gray-100">
            <img
              src={logoUrl}
              alt={client.name}
              className="w-full h-full object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          </div>
        ) : (
          <div
            className={`flex-shrink-0 w-12 h-12 ${iconBg || ''} rounded-lg flex items-center justify-center mr-4`}
            style={iconBgStyle}
          >
            <span
              className={`text-base font-heading font-bold ${!brandColor ? clientColor.icon : ''}`}
              style={initialsColor}
            >
              {getInitials(client.name)}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-heading font-semibold text-gray-900 truncate">
            {client.name}
          </h3>
          <div className="flex items-center gap-2 mt-0.5">
            {industry && INDUSTRY_LABELS[industry] && (
              <Badge variant="secondary" size="sm">
                {INDUSTRY_LABELS[industry]}
              </Badge>
            )}
            {client.description && !industry && (
              <p className="text-sm text-gray-500 line-clamp-1">
                {client.description}
              </p>
            )}
          </div>
          {client.description && industry && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
              {client.description}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-sm">
        <span className="text-gray-600">
          <span className="text-gray-900 font-medium">{client.brief_count}</span>
          {' '}{client.brief_count === 1 ? 'brief' : 'briefs'}
        </span>
        <span className="text-gray-400">
          Created {formatDate(client.created_at)}
        </span>
      </div>
    </Card>
  );
};

export default ClientCard;
