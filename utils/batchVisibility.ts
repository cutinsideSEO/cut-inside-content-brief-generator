import type { GenerationBatch } from '../types/database';

const GRACE_PERIOD_MS = 2 * 60 * 1000;

function isWithinGracePeriod(createdAt: string, now: Date): boolean {
  const createdMs = Date.parse(createdAt);
  if (Number.isNaN(createdMs)) return false;
  return now.getTime() - createdMs <= GRACE_PERIOD_MS;
}

export function filterRunningBatchesForDisplay(
  batches: GenerationBatch[],
  activeJobBatchIds: string[],
  now: Date = new Date()
): GenerationBatch[] {
  const activeSet = new Set(activeJobBatchIds);

  return batches.filter((batch) => {
    if (activeSet.has(batch.id)) return true;
    return isWithinGracePeriod(batch.created_at, now);
  });
}
