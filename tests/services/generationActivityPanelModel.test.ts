import { describe, expect, it } from 'vitest';
import { buildGenerationActivitySummary } from '../../utils/generationActivitySummary';

describe('generation activity summary model', () => {
  it('returns compact badges for active jobs and batches', () => {
    const summary = buildGenerationActivitySummary({
      activeJobs: 3,
      activeBatches: 1,
      failedJobs: 0,
    });

    expect(summary.title).toContain('Generation Activity');
    expect(summary.badges).toEqual([
      { key: 'jobs', value: 3 },
      { key: 'batches', value: 1 },
    ]);
  });

  it('includes failed badge when failed jobs exist', () => {
    const summary = buildGenerationActivitySummary({
      activeJobs: 1,
      activeBatches: 0,
      failedJobs: 2,
    });

    expect(summary.badges).toEqual([
      { key: 'jobs', value: 1 },
      { key: 'batches', value: 0 },
      { key: 'failed', value: 2 },
    ]);
  });
});
