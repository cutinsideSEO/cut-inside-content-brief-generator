export type BriefListActiveTab = 'briefs' | 'articles';

export type BriefListFilterStatus =
  | 'all'
  | 'draft'
  | 'in_progress'
  | 'complete'
  | 'workflow'
  | 'published'
  | 'archived';

export type BriefListSortBy = 'newest' | 'oldest' | 'modified' | 'name';

export interface BriefListUiState {
  activeTab: BriefListActiveTab;
  filterStatus: BriefListFilterStatus;
  sortBy: BriefListSortBy;
  projectFilter: string;
}
