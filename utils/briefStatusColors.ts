import type { BriefStatus } from '../types/database';

/**
 * Single source of truth for brief status presentation (color + label).
 *
 * Both the tinted file icon (BriefListCard) and the colored dot (BriefStatusBadge)
 * read from this map so the two can never drift apart. Tailwind needs literal
 * class strings for its JIT compiler, so `icon` and `dot` are kept as full
 * literal classes rather than a derived shade.
 *
 * - `icon` — text color class for the status file icon
 * - `dot`  — background color class for the status dot
 * - `label` — human-readable status label
 */
export interface BriefStatusColor {
  icon: string;
  dot: string;
  label: string;
}

export const BRIEF_STATUS_COLOR: Record<BriefStatus, BriefStatusColor> = {
  draft: { icon: 'text-gray-400', dot: 'bg-gray-300', label: 'Draft' },
  in_progress: { icon: 'text-amber-500', dot: 'bg-amber-400', label: 'In Progress' },
  complete: { icon: 'text-emerald-500', dot: 'bg-emerald-500', label: 'Complete' },
  sent_to_client: { icon: 'text-teal-500', dot: 'bg-teal-500', label: 'Sent to Client' },
  changes_requested: { icon: 'text-amber-500', dot: 'bg-amber-500', label: 'Changes Requested' },
  in_writing: { icon: 'text-blue-500', dot: 'bg-blue-500', label: 'In Writing' },
  approved: { icon: 'text-emerald-500', dot: 'bg-emerald-500', label: 'Approved' },
  published: { icon: 'text-emerald-600', dot: 'bg-emerald-600', label: 'Published' },
  archived: { icon: 'text-gray-300', dot: 'bg-gray-400', label: 'Archived' },
};

/**
 * Dot color for the sidebar's aggregate "In Workflow" row. The bucket covers
 * several workflow statuses (sent_to_client / changes_requested / in_writing /
 * approved), so it can't use a single per-status color. It uses teal to stay
 * within the badge palette (`sent_to_client`) instead of an orphan cyan that
 * appears nowhere else in the app.
 */
export const WORKFLOW_BUCKET_DOT = BRIEF_STATUS_COLOR.sent_to_client.dot;
