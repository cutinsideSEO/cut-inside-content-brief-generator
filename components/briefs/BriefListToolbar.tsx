import React from 'react';
import Button from '../Button';
import type { BriefListSortBy } from '../../types/briefListUi';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Input, Select } from '../ui';

interface BriefListToolbarProps {
  clientName: string;
  clientLogoUrl?: string | null;
  clientBrandColor?: string | null;
  briefCount: number;
  showSearchControls: boolean;
  searchQuery: string;
  sortBy: BriefListSortBy;
  onSearchQueryChange: (value: string) => void;
  onSortByChange: (sortBy: BriefListSortBy) => void;
  onCreateBrief: () => void;
  onOpenBulkGenerate: () => void;
  onOpenCreateProject: () => void;
  onOpenMobileFilters?: () => void;
}

const BriefListToolbar: React.FC<BriefListToolbarProps> = ({
  clientName,
  clientLogoUrl,
  clientBrandColor,
  briefCount,
  showSearchControls,
  searchQuery,
  sortBy,
  onSearchQueryChange,
  onSortByChange,
  onCreateBrief,
  onOpenBulkGenerate,
  onOpenCreateProject,
  onOpenMobileFilters,
}) => {
  return (
    <div data-testid="brief-list-toolbar" className="mb-6 rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div
          className={clientBrandColor ? 'pl-3 border-l-[3px]' : ''}
          style={clientBrandColor ? { borderLeftColor: clientBrandColor } : undefined}
        >
          <div className="flex items-center gap-3">
            {clientLogoUrl && (
              <img
                src={clientLogoUrl}
                alt=""
                className="h-8 w-8 rounded-lg object-contain border border-gray-100"
              />
            )}
            <h1 className="text-2xl font-heading font-bold text-gray-900">{clientName}</h1>
          </div>
          <p className="text-gray-600 mt-0.5">{briefCount} {briefCount === 1 ? 'brief' : 'briefs'}</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {showSearchControls && (
            <>
              <Input
                placeholder="Search briefs by name or keywords..."
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                className="sm:w-[320px]"
                icon={(
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                )}
              />
              <Select
                value={sortBy}
                onChange={(event) => onSortByChange(event.target.value as BriefListSortBy)}
                options={[
                  { value: 'smart', label: 'Smart Queue (Recommended)' },
                  { value: 'newest', label: 'Newest First' },
                  { value: 'oldest', label: 'Oldest First' },
                  { value: 'modified', label: 'Last Modified' },
                  { value: 'name', label: 'Name A-Z' },
                ]}
                size="sm"
                className="sm:w-56"
                aria-label="Sort briefs"
              />
            </>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onOpenBulkGenerate}>
                Bulk Generate Briefs
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onOpenCreateProject}>
                New Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {onOpenMobileFilters && (
            <Button variant="outline" className="lg:hidden" onClick={onOpenMobileFilters}>
              Filters
            </Button>
          )}

          <Button
            variant="primary"
            onClick={onCreateBrief}
            icon={(
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )}
          >
            New Brief
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BriefListToolbar;
