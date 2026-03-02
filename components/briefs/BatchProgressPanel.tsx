// BatchProgressPanel - Floating panel showing active batch generation progress
import React from 'react';
import type { GenerationBatch } from '../../types/database';
import type { BatchLiveProgress } from '../../hooks/useBatchSubscription';
import {
  FloatingPanel,
  FloatingPanelHeader,
  FloatingPanelItem,
  FloatingPanelFooter,
  Progress,
  Badge,
} from '../ui';

interface BatchProgressPanelProps {
  batches: GenerationBatch[];
  onCancel: (batchId: string) => void;
  liveProgressByBatch?: Record<string, BatchLiveProgress>;
}

const BatchProgressPanel: React.FC<BatchProgressPanelProps> = ({
  batches,
  onCancel,
  liveProgressByBatch = {},
}) => {
  if (batches.length === 0) return null;

  const totalRunning = batches.filter(b => b.status === 'running').length;

  return (
    <FloatingPanel position="bottom-right" variant="info">
      <FloatingPanelHeader
        icon={
          <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        }
      >
        Batch Generation
      </FloatingPanelHeader>

      {batches.map(batch => {
        const doneCount = batch.completed_jobs + batch.failed_jobs;
        const live = liveProgressByBatch[batch.id];
        const runningFraction = live?.fractionalCompletedJobs || 0;
        const effectiveDoneCount = Math.min(batch.total_jobs, doneCount + runningFraction);
        const pendingCount = batch.total_jobs - doneCount;
        const isComplete = batch.status !== 'running';
        const showBriefSummary = Boolean(live?.isMultiStage && live.totalBriefs > 0);
        const livePercent = batch.total_jobs > 0
          ? Math.round((effectiveDoneCount / batch.total_jobs) * 100)
          : 0;

        return (
          <FloatingPanelItem
            key={batch.id}
            title={batch.name || `Batch ${batch.id.slice(0, 8)}`}
            subtitle={`${doneCount}/${batch.total_jobs} jobs complete${showBriefSummary ? ` (${live.completedBriefs}/${live.totalBriefs} briefs finished)` : ''}${live?.runningJobs ? ` - live ${livePercent}%` : ''}`}
            status={
              <div className="flex items-center gap-2 text-xs">
                {batch.completed_jobs > 0 && (
                  <Badge variant="success" size="sm">{batch.completed_jobs} done</Badge>
                )}
                {batch.failed_jobs > 0 && (
                  <Badge variant="error" size="sm">{batch.failed_jobs} failed</Badge>
                )}
                {live?.runningJobs ? (
                  <span className="text-muted-foreground">{live.runningJobs} running</span>
                ) : null}
                {pendingCount > 0 && !isComplete && (
                  <span className="text-muted-foreground">{pendingCount} pending</span>
                )}
                {isComplete && batch.status === 'cancelled' && (
                  <Badge variant="warning" size="sm">Cancelled</Badge>
                )}
              </div>
            }
            progress={
              <Progress
                value={effectiveDoneCount}
                max={batch.total_jobs}
                size="sm"
                color={batch.failed_jobs > 0 ? 'yellow' : 'teal'}
              />
            }
            action={
              batch.status === 'running' ? (
                <button
                  onClick={() => onCancel(batch.id)}
                  className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                >
                  Cancel
                </button>
              ) : undefined
            }
          />
        );
      })}

      <FloatingPanelFooter>
        {totalRunning > 0
          ? `${totalRunning} batch${totalRunning !== 1 ? 'es' : ''} running`
          : 'All batches complete'}
      </FloatingPanelFooter>
    </FloatingPanel>
  );
};

export default BatchProgressPanel;
