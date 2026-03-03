import type { BatchLiveProgress } from '../hooks/useBatchSubscription';
import type { GenerationBatch } from '../types/database';

export interface BatchActivityModel {
  doneCount: number;
  pendingCount: number;
  percentage: number;
}

interface GenerationActivitySummaryInput {
  activeJobs: number;
  activeBatches: number;
  failedJobs: number;
}

interface GenerationActivitySummaryBadge {
  key: 'jobs' | 'batches' | 'failed';
  value: number;
}

export interface GenerationActivitySummaryModel {
  title: string;
  totalActiveItems: number;
  hasActiveItems: boolean;
  badges: GenerationActivitySummaryBadge[];
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

export function buildBatchActivityModel(
  batch: GenerationBatch,
  live?: BatchLiveProgress
): BatchActivityModel {
  const doneCount = batch.completed_jobs + batch.failed_jobs;
  const runningFraction = live?.fractionalCompletedJobs || 0;
  const effectiveDoneCount = Math.min(batch.total_jobs, doneCount + runningFraction);

  const percentage = batch.total_jobs > 0
    ? clampPercentage(Math.round((effectiveDoneCount / batch.total_jobs) * 100))
    : 0;

  return {
    doneCount,
    pendingCount: Math.max(0, batch.total_jobs - doneCount),
    percentage,
  };
}

export function buildGenerationActivitySummary({
  activeJobs,
  activeBatches,
  failedJobs,
}: GenerationActivitySummaryInput): GenerationActivitySummaryModel {
  const badges: GenerationActivitySummaryBadge[] = [
    { key: 'jobs', value: activeJobs },
    { key: 'batches', value: activeBatches },
  ];

  if (failedJobs > 0) {
    badges.push({ key: 'failed', value: failedJobs });
  }

  const totalActiveItems = activeJobs + activeBatches;

  return {
    title: 'Generation Activity',
    totalActiveItems,
    hasActiveItems: totalActiveItems > 0,
    badges,
  };
}
