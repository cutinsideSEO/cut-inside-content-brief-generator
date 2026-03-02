import type { GenerationJobStatus, GenerationJobType } from '../types/database';

interface BatchJobRow {
  brief_id: string | null;
  job_type: GenerationJobType;
  status: GenerationJobStatus;
}

export interface BatchBriefProgressSummary {
  totalBriefs: number;
  completedBriefs: number;
  isMultiStage: boolean;
}

function isTerminal(status: GenerationJobStatus): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

function hasTerminalJobOfType(rows: BatchJobRow[], jobType: GenerationJobType): boolean {
  return rows.some((row) => row.job_type === jobType && isTerminal(row.status));
}

function isBriefCompleted(rows: BatchJobRow[], isMultiStage: boolean): boolean {
  if (isMultiStage) {
    const hasFullBrief = rows.some((row) => row.job_type === 'full_brief');
    if (!hasFullBrief) return false;
    return hasTerminalJobOfType(rows, 'full_brief');
  }

  if (rows.some((row) => row.job_type === 'article')) {
    return hasTerminalJobOfType(rows, 'article');
  }

  if (rows.some((row) => row.job_type === 'full_brief')) {
    return hasTerminalJobOfType(rows, 'full_brief');
  }

  if (rows.some((row) => row.job_type === 'brief_step')) {
    return hasTerminalJobOfType(rows, 'brief_step');
  }

  if (rows.some((row) => row.job_type === 'regenerate')) {
    return hasTerminalJobOfType(rows, 'regenerate');
  }

  return hasTerminalJobOfType(rows, 'competitors');
}

export function buildBatchBriefProgressSummary(
  rows: BatchJobRow[],
  batchTotalJobs: number
): BatchBriefProgressSummary {
  const rowsWithBriefId = rows.filter((row) => Boolean(row.brief_id));
  const briefRows = new Map<string, BatchJobRow[]>();

  for (const row of rowsWithBriefId) {
    const briefId = row.brief_id as string;
    const existing = briefRows.get(briefId) || [];
    existing.push(row);
    briefRows.set(briefId, existing);
  }

  const totalBriefs = briefRows.size;
  const isMultiStage = totalBriefs > 0 && batchTotalJobs > totalBriefs;

  let completedBriefs = 0;
  for (const rowsForBrief of briefRows.values()) {
    if (isBriefCompleted(rowsForBrief, isMultiStage)) {
      completedBriefs += 1;
    }
  }

  return {
    totalBriefs,
    completedBriefs,
    isMultiStage,
  };
}
