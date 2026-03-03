import type { BriefListFilterStatus } from '../types/briefListUi';

interface SidebarBriefListCounts {
  all: number;
  draft: number;
  in_progress: number;
  complete: number;
  workflow: number;
  published: number;
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
}

const STATUS_META: Record<BriefListFilterStatus, { label: string; dotClassName: string }> = {
  all: { label: 'All', dotClassName: 'bg-teal-500' },
  draft: { label: 'Drafts', dotClassName: 'bg-gray-300' },
  in_progress: { label: 'In Progress', dotClassName: 'bg-amber-400' },
  complete: { label: 'Complete', dotClassName: 'bg-emerald-500' },
  workflow: { label: 'In Workflow', dotClassName: 'bg-cyan-500' },
  published: { label: 'Published', dotClassName: 'bg-emerald-600' },
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

  return { statusRows };
}
