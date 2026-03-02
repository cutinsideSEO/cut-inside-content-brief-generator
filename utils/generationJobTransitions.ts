import type { GenerationJob } from '../types/database';

type TerminalJobStatus = 'completed' | 'failed' | 'cancelled';

function isTerminalStatus(status: GenerationJob['status']): status is TerminalJobStatus {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

export function isTerminalJobUpdate(job: Pick<GenerationJob, 'status'>): boolean {
  return isTerminalStatus(job.status);
}

export function isPipelinePhaseTransition(job: Pick<GenerationJob, 'status' | 'job_type' | 'batch_id'>): boolean {
  return job.status === 'completed' && job.job_type === 'competitors' && Boolean(job.batch_id);
}

export function isOutOfOrderTerminalUpdate(
  activeJobId: string | undefined,
  job: Pick<GenerationJob, 'id' | 'status'>
): boolean {
  if (!isTerminalStatus(job.status)) return false;
  if (!activeJobId) return false;
  return activeJobId !== job.id;
}
