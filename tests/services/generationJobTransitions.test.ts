import { describe, expect, it } from 'vitest';
import {
  isOutOfOrderTerminalUpdate,
  isPipelinePhaseTransition,
  isTerminalJobUpdate,
} from '../../utils/generationJobTransitions';

describe('generation job transition helpers', () => {
  it('classifies terminal job statuses', () => {
    expect(isTerminalJobUpdate({ status: 'completed' })).toBe(true);
    expect(isTerminalJobUpdate({ status: 'failed' })).toBe(true);
    expect(isTerminalJobUpdate({ status: 'cancelled' })).toBe(true);
    expect(isTerminalJobUpdate({ status: 'running' })).toBe(false);
    expect(isTerminalJobUpdate({ status: 'pending' })).toBe(false);
  });

  it('detects batch competitors completion as a pipeline phase transition', () => {
    expect(isPipelinePhaseTransition({
      status: 'completed',
      job_type: 'competitors',
      batch_id: 'batch-1',
    })).toBe(true);

    expect(isPipelinePhaseTransition({
      status: 'completed',
      job_type: 'full_brief',
      batch_id: 'batch-1',
    })).toBe(false);

    expect(isPipelinePhaseTransition({
      status: 'running',
      job_type: 'competitors',
      batch_id: 'batch-1',
    })).toBe(false);
  });

  it('ignores stale terminal updates from older jobs', () => {
    expect(isOutOfOrderTerminalUpdate('new-job', {
      id: 'old-job',
      status: 'completed',
    })).toBe(true);

    expect(isOutOfOrderTerminalUpdate('same-job', {
      id: 'same-job',
      status: 'completed',
    })).toBe(false);

    expect(isOutOfOrderTerminalUpdate(undefined, {
      id: 'old-job',
      status: 'completed',
    })).toBe(false);

    expect(isOutOfOrderTerminalUpdate('new-job', {
      id: 'old-job',
      status: 'running',
    })).toBe(false);
  });
});
