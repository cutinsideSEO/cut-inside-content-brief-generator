import type { BriefListFilterStatus } from '../types/briefListUi';
import { BRIEF_STATUS_COLOR, WORKFLOW_BUCKET_DOT } from './briefStatusColors';

interface SidebarBriefListCounts {
  all: number;
  draft: number;
  in_progress: number;
  complete: number;
  workflow: number;
  published: number;
  archived: number;
}

interface BuildSidebarBriefListModelInput {
  counts: SidebarBriefListCounts;
  activeFilter: BriefListFilterStatus;
}

interface SidebarStatusRow {
  id: BriefListFilterStatus;
  label: string;
  count: number;
  dotClassName: string;
  isActive: boolean;
}

interface SidebarBriefListModel {
  statusRows: SidebarStatusRow[];
  archivedRow: SidebarStatusRow | null;
}

// Dot colors come from the shared brief-status color map so the sidebar can
// never drift from the status badge / card icon. `all` and `workflow` are
// aggregate rows: `all` keeps the brand teal; `workflow` uses the shared
// workflow-bucket accent (teal) instead of an orphan cyan.
const STATUS_META: Record<BriefListFilterStatus, { label: string; dotClassName: string }> = {
  all: { label: 'All', dotClassName: 'bg-teal-500' },
  draft: { label: 'Drafts', dotClassName: BRIEF_STATUS_COLOR.draft.dot },
  in_progress: { label: 'In Progress', dotClassName: BRIEF_STATUS_COLOR.in_progress.dot },
  complete: { label: 'Complete', dotClassName: BRIEF_STATUS_COLOR.complete.dot },
  workflow: { label: 'In Workflow', dotClassName: WORKFLOW_BUCKET_DOT },
  published: { label: 'Published', dotClassName: BRIEF_STATUS_COLOR.published.dot },
  archived: { label: 'Archived', dotClassName: BRIEF_STATUS_COLOR.archived.dot },
};

export function buildSidebarBriefListModel({
  counts,
  activeFilter,
}: BuildSidebarBriefListModelInput): SidebarBriefListModel {
  const orderedIds: BriefListFilterStatus[] = [
    'all',
    'draft',
    'in_progress',
    'complete',
    'workflow',
    'published',
  ];

  const statusRows = orderedIds
    .filter((id) => id === 'all' || counts[id] > 0)
    .map((id) => ({
      id,
      label: STATUS_META[id].label,
      count: counts[id],
      dotClassName: STATUS_META[id].dotClassName,
      isActive: activeFilter === id,
    }));

  const archivedRow: SidebarStatusRow | null = counts.archived > 0 || activeFilter === 'archived'
    ? {
        id: 'archived' as BriefListFilterStatus,
        label: STATUS_META.archived.label,
        count: counts.archived,
        dotClassName: STATUS_META.archived.dotClassName,
        isActive: activeFilter === 'archived',
      }
    : null;

  return { statusRows, archivedRow };
}
