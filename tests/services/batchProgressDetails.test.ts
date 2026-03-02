import { describe, expect, it } from 'vitest';
import type { GenerationJobStatus, GenerationJobType } from '../../types/database';
import { buildBatchBriefProgressSummary } from '../../utils/batchProgressDetails';

interface JobRow {
  brief_id: string | null;
  job_type: GenerationJobType;
  status: GenerationJobStatus;
}

function job(
  briefId: string,
  jobType: GenerationJobType,
  status: GenerationJobStatus
): JobRow {
  return {
    brief_id: briefId,
    job_type: jobType,
    status,
  };
}

describe('batch brief progress summary', () => {
  it('treats multi-stage batches as finished only after full_brief terminal status', () => {
    const rows: JobRow[] = [
      job('brief-1', 'competitors', 'completed'),
      job('brief-2', 'competitors', 'completed'),
    ];

    const summary = buildBatchBriefProgressSummary(rows, 4);

    expect(summary.isMultiStage).toBe(true);
    expect(summary.totalBriefs).toBe(2);
    expect(summary.completedBriefs).toBe(0);
  });

  it('counts finished briefs when full_brief is terminal in a multi-stage batch', () => {
    const rows: JobRow[] = [
      job('brief-1', 'competitors', 'completed'),
      job('brief-1', 'full_brief', 'completed'),
      job('brief-2', 'competitors', 'completed'),
      job('brief-2', 'full_brief', 'running'),
    ];

    const summary = buildBatchBriefProgressSummary(rows, 4);

    expect(summary.isMultiStage).toBe(true);
    expect(summary.totalBriefs).toBe(2);
    expect(summary.completedBriefs).toBe(1);
  });

  it('uses terminal job status directly for single-stage batches', () => {
    const rows: JobRow[] = [
      job('brief-1', 'article', 'completed'),
      job('brief-2', 'article', 'running'),
      job('brief-3', 'article', 'failed'),
    ];

    const summary = buildBatchBriefProgressSummary(rows, 3);

    expect(summary.isMultiStage).toBe(false);
    expect(summary.totalBriefs).toBe(3);
    expect(summary.completedBriefs).toBe(2);
  });
});
