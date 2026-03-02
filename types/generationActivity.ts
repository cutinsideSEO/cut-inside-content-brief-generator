import type { GenerationJobProgress } from './database';

export type GenerationStatus =
  | 'idle'
  | 'analyzing_competitors'
  | 'generating_brief'
  | 'generating_content';

export interface GeneratingBrief {
  clientId: string;
  clientName: string;
  status: GenerationStatus;
  step: number | null;
  terminalStatus?: 'completed' | 'failed' | 'cancelled';
  jobId?: string;
  jobProgress?: GenerationJobProgress;
  updatedAt?: string;
  isBackend?: boolean;
}
