import React, { useEffect, useMemo, useState } from 'react';
import type { GenerationBatch } from '../../types/database';
import type { BatchLiveProgress } from '../../hooks/useBatchSubscription';
import type { GeneratingBrief } from '../../types/generationActivity';
import { getGenerationProgressModel, getGenerationStatusBadgeLabel } from '../../utils/generationActivity';
import { buildBatchActivityModel } from '../../utils/generationActivitySummary';
import { isBriefActivelyGenerating } from '../../utils/generationStatus';
import Button from '../Button';
import {
  Badge,
  Card,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Progress,
} from '../ui';

interface GenerationActivityPanelProps {
  generatingBriefs: Record<string, GeneratingBrief>;
  briefNamesById: Record<string, string>;
  batches: GenerationBatch[];
  liveProgressByBatch: Record<string, BatchLiveProgress>;
  onViewBrief: (briefId: string) => void;
  onCancelBatch: (batchId: string) => void;
}

interface RecentTerminalActivity {
  briefId: string;
  briefName: string;
  terminalStatus: 'completed' | 'failed' | 'cancelled';
  endedAt: string;
}

const RECENT_ACTIVITY_WINDOW_MS = 90 * 1000;

function getRelativeTimeLabel(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const seconds = Math.max(0, Math.round(delta / 1000));
  if (seconds < 5) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

const GenerationActivityPanel: React.FC<GenerationActivityPanelProps> = ({
  generatingBriefs,
  briefNamesById,
  batches,
  liveProgressByBatch,
  onViewBrief,
  onCancelBatch,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [recentActivities, setRecentActivities] = useState<Record<string, RecentTerminalActivity>>({});

  const activeJobs = useMemo(() => {
    return Object.entries(generatingBriefs)
      .filter(([, entry]) => isBriefActivelyGenerating(entry.status))
      .map(([briefId, entry]) => {
        const briefName = briefNamesById[briefId] || `Brief ${briefId.slice(0, 8)}`;
        const model = getGenerationProgressModel({
          status: entry.status,
          generationStep: entry.step,
          jobProgress: entry.jobProgress,
        });
        return { briefId, briefName, entry, model };
      });
  }, [briefNamesById, generatingBriefs]);

  useEffect(() => {
    const nowIso = new Date().toISOString();

    setRecentActivities((prev) => {
      const next = { ...prev };

      for (const [briefId, entry] of Object.entries(generatingBriefs)) {
        if (isBriefActivelyGenerating(entry.status)) {
          delete next[briefId];
          continue;
        }
        if (entry.status !== 'idle' || !entry.terminalStatus) continue;
        const briefName = briefNamesById[briefId] || `Brief ${briefId.slice(0, 8)}`;
        next[briefId] = {
          briefId,
          briefName,
          terminalStatus: entry.terminalStatus,
          endedAt: entry.updatedAt || nowIso,
        };
      }

      return next;
    });
  }, [briefNamesById, generatingBriefs]);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setRecentActivities((prev) => {
        const filtered = Object.fromEntries(
          Object.entries(prev).filter(([, activity]) => {
            return now - new Date(activity.endedAt).getTime() <= RECENT_ACTIVITY_WINDOW_MS;
          })
        );
        return filtered;
      });
    }, 10_000);

    return () => clearInterval(timer);
  }, []);

  const recentItems = useMemo(() => {
    return Object.values(recentActivities).sort((a, b) => {
      return new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime();
    });
  }, [recentActivities]);

  const failedBatchJobs = batches.reduce((sum, batch) => sum + batch.failed_jobs, 0);
  const activeBatches = batches.filter((batch) => batch.status === 'running').length;
  const totalActiveItems = activeJobs.length + activeBatches;
  const hasActiveItems = totalActiveItems > 0;

  if (totalActiveItems === 0 && recentItems.length === 0) {
    return null;
  }

  return (
    <Card variant="elevated" padding="none" className="mb-6 overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="px-4 py-3 border-b border-border bg-secondary/20">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-teal animate-pulse-subtle" />
              <h2 className="text-sm font-heading font-semibold text-foreground">Generation Activity</h2>
              <Badge variant="teal" size="sm">{activeJobs.length} jobs</Badge>
              <Badge variant="default" size="sm">{activeBatches} batches</Badge>
              {failedBatchJobs > 0 && (
                <Badge variant="error" size="sm">{failedBatchJobs} failed</Badge>
              )}
            </div>
            <CollapsibleTrigger asChild>
              <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                {isExpanded ? 'Collapse' : 'Expand'}
              </button>
            </CollapsibleTrigger>
          </div>
        </div>

        <CollapsibleContent>
          <div className="p-4 space-y-5">
            {!hasActiveItems && (
              <div className="rounded-md border border-border bg-secondary/20 px-3 py-2 text-sm text-muted-foreground">
                No active generation jobs right now.
              </div>
            )}

            {activeJobs.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Active Jobs
                </h3>
                <div className="space-y-3">
                  {activeJobs.map(({ briefId, briefName, entry, model }) => (
                    <div key={briefId} className="rounded-md border border-border bg-card p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{briefName}</p>
                          <p className="text-xs text-muted-foreground truncate">{model.label}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="warning" size="sm">
                            {getGenerationStatusBadgeLabel(entry.status)}
                          </Badge>
                          <Button variant="secondary" size="sm" onClick={() => onViewBrief(briefId)}>
                            View
                          </Button>
                        </div>
                      </div>
                      <Progress value={model.percentage} size="sm" color="yellow" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {batches.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Batches
                </h3>
                <div className="space-y-3">
                  {batches.map((batch) => {
                    const live = liveProgressByBatch[batch.id];
                    const model = buildBatchActivityModel(batch, live);
                    const isRunning = batch.status === 'running';
                    const showBriefSummary = Boolean(live?.isMultiStage && live.totalBriefs > 0);
                    return (
                      <div key={batch.id} className="rounded-md border border-border bg-card p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {batch.name || `Batch ${batch.id.slice(0, 8)}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {model.doneCount}/{batch.total_jobs} jobs complete
                              {showBriefSummary ? ` (${live.completedBriefs}/${live.totalBriefs} briefs finished)` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={isRunning ? 'teal' : batch.status === 'cancelled' ? 'warning' : 'success'} size="sm">
                              {batch.status.replace(/_/g, ' ')}
                            </Badge>
                            {isRunning && (
                              <button
                                onClick={() => onCancelBatch(batch.id)}
                                className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                        <Progress
                          value={model.percentage}
                          size="sm"
                          color={batch.failed_jobs > 0 ? 'yellow' : 'teal'}
                        />
                        {batch.failed_jobs > 0 && (
                          <p className="text-xs text-red-600 mt-2">
                            {batch.failed_jobs} job{batch.failed_jobs !== 1 ? 's' : ''} failed. Review affected briefs.
                          </p>
                        )}
                        {batch.status === 'cancelled' && (
                          <p className="text-xs text-amber-700 mt-2">
                            Batch cancelled. Remaining queued jobs were stopped.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {recentItems.length > 0 && (
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                  Recent Activity
                </h3>
                <div className="space-y-2">
                  {recentItems.map((item) => (
                    <div
                      key={`${item.briefId}-${item.endedAt}`}
                      className="rounded-md border border-border bg-card px-3 py-2 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{item.briefName}</p>
                        <p className="text-xs text-muted-foreground">{getRelativeTimeLabel(item.endedAt)}</p>
                      </div>
                      <Badge
                        variant={
                          item.terminalStatus === 'completed'
                            ? 'success'
                            : item.terminalStatus === 'failed'
                              ? 'error'
                              : 'warning'
                        }
                        size="sm"
                      >
                        {item.terminalStatus}
                      </Badge>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default GenerationActivityPanel;
