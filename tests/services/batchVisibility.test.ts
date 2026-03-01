import { describe, expect, it } from 'vitest';
import { filterRunningBatchesForDisplay } from '../../utils/batchVisibility';
import type { GenerationBatch } from '../../types/database';

function makeBatch(id: string, createdAt: string): GenerationBatch {
  return {
    id,
    client_id: 'client-1',
    created_by: 'user-1',
    name: null,
    total_jobs: 2,
    completed_jobs: 0,
    failed_jobs: 0,
    status: 'running',
    created_at: createdAt,
    completed_at: null,
  };
}

describe('batch visibility helpers', () => {
  it('keeps running batches that have active jobs', () => {
    const batches = [
      makeBatch('a', '2026-03-01T18:00:00.000Z'),
      makeBatch('b', '2026-03-01T18:05:00.000Z'),
    ];

    const visible = filterRunningBatchesForDisplay(batches, ['b'], new Date('2026-03-01T18:10:00.000Z'));
    expect(visible.map((b) => b.id)).toEqual(['b']);
  });

  it('keeps newly created running batches briefly even before active jobs are observed', () => {
    const now = new Date('2026-03-01T18:10:00.000Z');
    const batches = [
      makeBatch('recent', '2026-03-01T18:09:10.000Z'),
      makeBatch('stale', '2026-03-01T17:50:00.000Z'),
    ];

    const visible = filterRunningBatchesForDisplay(batches, [], now);
    expect(visible.map((b) => b.id)).toEqual(['recent']);
  });
});
