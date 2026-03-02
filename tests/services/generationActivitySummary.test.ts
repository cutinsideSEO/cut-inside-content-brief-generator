import { describe, expect, it } from 'vitest';
import type { GenerationBatch } from '../../types/database';
import type { BatchLiveProgress } from '../../hooks/useBatchSubscription';
import { buildBatchActivityModel } from '../../utils/generationActivitySummary';

function makeBatch(overrides: Partial<GenerationBatch> = {}): GenerationBatch {
  return {
    id: 'batch-1',
    client_id: 'client-1',
    created_by: 'user-1',
    name: 'My Batch',
    total_jobs: 10,
    completed_jobs: 3,
    failed_jobs: 1,
    status: 'running',
    created_at: '2026-03-02T10:00:00.000Z',
    completed_at: null,
    ...overrides,
  };
}

describe('generation activity summary helpers', () => {
  it('computes batch percentage using live fractional progress when available', () => {
    const batch = makeBatch();
    const live: BatchLiveProgress = {
      runningJobs: 2,
      pendingJobs: 4,
      averageRunningPercentage: 50,
      fractionalCompletedJobs: 1.2,
      totalBriefs: 0,
      completedBriefs: 0,
      isMultiStage: false,
    };

    const model = buildBatchActivityModel(batch, live);

    expect(model.percentage).toBe(52);
    expect(model.doneCount).toBe(4);
    expect(model.pendingCount).toBe(6);
  });

  it('falls back to persisted counts when live progress is unavailable', () => {
    const batch = makeBatch({
      total_jobs: 8,
      completed_jobs: 5,
      failed_jobs: 1,
    });

    const model = buildBatchActivityModel(batch);

    expect(model.percentage).toBe(75);
    expect(model.doneCount).toBe(6);
    expect(model.pendingCount).toBe(2);
  });
});
