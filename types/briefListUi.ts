export type BriefListActiveTab = 'briefs' | 'articles';

export type BriefListFilterStatus =
  | 'all'
  | 'draft'
  | 'in_progress'
  | 'complete'
  | 'workflow'
  | 'published';

export type BriefListSortBy = 'smart' | 'newest' | 'oldest' | 'modified' | 'name';

export type BriefListViewMode = 'smart' | 'grouped';

export interface BriefListUiState {
  activeTab: BriefListActiveTab;
  filterStatus: BriefListFilterStatus;
  sortBy: BriefListSortBy;
  briefViewMode: BriefListViewMode;
  projectFilter: string;
}
