import type {
  BriefListActiveTab,
  BriefListFilterStatus,
  BriefListSortBy,
  BriefListUiState,
  BriefListViewMode,
} from '../types/briefListUi';

const ACTIVE_TABS: readonly BriefListActiveTab[] = ['briefs', 'articles'];
const FILTER_STATUSES: readonly BriefListFilterStatus[] = [
  'all',
  'draft',
  'in_progress',
  'complete',
  'workflow',
  'published',
];
const SORT_BY_OPTIONS: readonly BriefListSortBy[] = ['smart', 'newest', 'oldest', 'modified', 'name'];
const VIEW_MODES: readonly BriefListViewMode[] = ['smart', 'grouped'];

const DEFAULT_BRIEF_LIST_UI_STATE: BriefListUiState = {
  activeTab: 'briefs',
  filterStatus: 'all',
  sortBy: 'smart',
  briefViewMode: 'smart',
  projectFilter: 'all',
};

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === 'string' && values.includes(value as T);
}

function normalizeProjectFilter(projectFilter: unknown): string {
  if (typeof projectFilter !== 'string') return DEFAULT_BRIEF_LIST_UI_STATE.projectFilter;

  const trimmedProjectFilter = projectFilter.trim();
  return trimmedProjectFilter.length > 0
    ? trimmedProjectFilter
    : DEFAULT_BRIEF_LIST_UI_STATE.projectFilter;
}

export function createDefaultBriefListUiState(): BriefListUiState {
  return { ...DEFAULT_BRIEF_LIST_UI_STATE };
}

export function normalizeBriefListUiState(
  input: Partial<BriefListUiState>,
  options?: { resetProjectFilter?: boolean }
): BriefListUiState {
  const defaults = createDefaultBriefListUiState();

  return {
    activeTab: isOneOf(input.activeTab, ACTIVE_TABS) ? input.activeTab : defaults.activeTab,
    filterStatus: isOneOf(input.filterStatus, FILTER_STATUSES)
      ? input.filterStatus
      : defaults.filterStatus,
    sortBy: isOneOf(input.sortBy, SORT_BY_OPTIONS) ? input.sortBy : defaults.sortBy,
    briefViewMode: isOneOf(input.briefViewMode, VIEW_MODES)
      ? input.briefViewMode
      : defaults.briefViewMode,
    projectFilter: options?.resetProjectFilter ? 'all' : normalizeProjectFilter(input.projectFilter),
  };
}
