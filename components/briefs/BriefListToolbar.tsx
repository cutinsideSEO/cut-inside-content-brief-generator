import React from 'react';
import Button from '../Button';
import type { BriefListActiveTab, BriefListSortBy } from '../../types/briefListUi';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Tabs,
} from '../ui';
import { ChevronDownIcon } from '../Icon';

interface BriefListToolbarProps {
  clientName: string;
  clientLogoUrl?: string | null;
  clientBrandColor?: string | null;
  briefCount: number;
  articleCount: number;
  activeTab: BriefListActiveTab;
  onActiveTabChange: (tab: BriefListActiveTab) => void;
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

const SORT_LABEL: Record<BriefListSortBy, string> = {
  newest: 'Newest',
  oldest: 'Oldest',
  modified: 'Last modified',
  name: 'Name A-Z',
};

const BriefListToolbar: React.FC<BriefListToolbarProps> = ({
  clientName,
  clientLogoUrl,
  clientBrandColor,
  briefCount,
  articleCount,
  activeTab,
  onActiveTabChange,
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
    <div data-testid="brief-list-toolbar" className="mb-6 space-y-3">
      {/* Row 1: client identity */}
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
          <span className="text-sm text-muted-foreground">
            {briefCount} {briefCount === 1 ? 'brief' : 'briefs'}
          </span>
        </div>
      </div>

      {/* Row 2: tabs + actions */}
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-3 py-2.5 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          items={[
            { id: 'briefs', label: 'Briefs', count: briefCount },
            { id: 'articles', label: 'Articles', count: articleCount },
          ]}
          activeId={activeTab}
          onChange={(id) => onActiveTabChange(id as BriefListActiveTab)}
          variant="pills"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onOpenCreateProject}>
            + Project
          </Button>
          <Button variant="outline" size="sm" onClick={onOpenBulkGenerate}>
            Bulk Generate
          </Button>
          {onOpenMobileFilters && (
            <Button variant="outline" size="sm" className="lg:hidden" onClick={onOpenMobileFilters}>
              Filters
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
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

      {/* Row 3: search + sort inline (briefs tab only) */}
      {showSearchControls && (
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search briefs by name or keywords..."
            value={searchQuery}
            onChange={(event) => onSearchQueryChange(event.target.value)}
            className="w-full sm:w-80"
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 border border-border rounded-md bg-card hover:bg-secondary transition-colors whitespace-nowrap"
                aria-label="Sort briefs"
              >
                <span className="text-muted-foreground">Sort:</span>
                <span className="font-medium text-foreground">{SORT_LABEL[sortBy]}</span>
                <ChevronDownIcon className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(Object.keys(SORT_LABEL) as BriefListSortBy[]).map((key) => (
                <DropdownMenuItem
                  key={key}
                  onSelect={() => onSortByChange(key)}
                  className={sortBy === key ? 'text-teal font-medium' : ''}
                >
                  {SORT_LABEL[key]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};

export default BriefListToolbar;
