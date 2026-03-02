// useBatchSubscription Hook - Real-time subscription to generation batch updates
import { useCallback, useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import type { GenerationBatch, GenerationJobStatus, GenerationJobType } from '../types/database';
import { filterRunningBatchesForDisplay } from '../utils/batchVisibility';
import { buildBatchBriefProgressSummary } from '../utils/batchProgressDetails';

export interface BatchLiveProgress {
  runningJobs: number;
  pendingJobs: number;
  averageRunningPercentage: number;
  fractionalCompletedJobs: number;
  totalBriefs: number;
  completedBriefs: number;
  isMultiStage: boolean;
}

function normalizeProgressPercentage(progress: unknown): number {
  if (!progress || typeof progress !== 'object') return 0;
  const raw = (progress as { percentage?: unknown }).percentage;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(100, raw));
}

export function useBatchSubscription(clientId: string | null) {
  const [activeBatches, setActiveBatches] = useState<GenerationBatch[]>([]);
  const [liveProgressByBatch, setLiveProgressByBatch] = useState<Record<string, BatchLiveProgress>>({});
  const dismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const activeBatchIdsRef = useRef<string[]>([]);
  const activeBatchesRef = useRef<GenerationBatch[]>([]);

  const refreshLiveProgress = useCallback(async (batches: GenerationBatch[]) => {
    const uniqueBatches = [...new Map((batches || []).map((batch) => [batch.id, batch])).values()];
    const uniqueBatchIds = uniqueBatches.map((batch) => batch.id).filter(Boolean);
    if (uniqueBatches.length === 0 || uniqueBatchIds.length === 0) {
      setLiveProgressByBatch({});
      return;
    }

    const totalJobsByBatch = Object.fromEntries(
      uniqueBatches.map((batch) => [batch.id, batch.total_jobs])
    );

    const { data, error } = await supabase
      .from('generation_jobs')
      .select('batch_id, brief_id, status, job_type, progress')
      .in('batch_id', uniqueBatchIds);

    if (error) {
      console.warn('Failed to load live batch progress:', error.message);
      return;
    }

    const next: Record<string, BatchLiveProgress> = {};
    for (const batchId of uniqueBatchIds) {
      next[batchId] = {
        runningJobs: 0,
        pendingJobs: 0,
        averageRunningPercentage: 0,
        fractionalCompletedJobs: 0,
        totalBriefs: 0,
        completedBriefs: 0,
        isMultiStage: false,
      };
    }

    const runningPercentTotals: Record<string, number> = {};
    const jobsByBatch: Record<string, Array<{
      brief_id: string | null;
      job_type: GenerationJobType;
      status: GenerationJobStatus;
    }>> = {};

    for (const row of data || []) {
      if (!row.batch_id || !next[row.batch_id]) continue;
      const rowStatus = row.status as GenerationJobStatus;
      const rowJobType = row.job_type as GenerationJobType;
      jobsByBatch[row.batch_id] = jobsByBatch[row.batch_id] || [];
      jobsByBatch[row.batch_id].push({
        brief_id: row.brief_id,
        job_type: rowJobType,
        status: rowStatus,
      });

      if (row.status === 'pending') {
        next[row.batch_id].pendingJobs += 1;
        continue;
      }
      if (row.status === 'running') {
        const pct = normalizeProgressPercentage(row.progress);
        next[row.batch_id].runningJobs += 1;
        next[row.batch_id].fractionalCompletedJobs += pct / 100;
        runningPercentTotals[row.batch_id] = (runningPercentTotals[row.batch_id] || 0) + pct;
      }
    }

    for (const batchId of Object.keys(next)) {
      const running = next[batchId].runningJobs;
      next[batchId].averageRunningPercentage = running > 0
        ? Math.round((runningPercentTotals[batchId] || 0) / running)
        : 0;

      const briefSummary = buildBatchBriefProgressSummary(
        jobsByBatch[batchId] || [],
        totalJobsByBatch[batchId] || 0
      );
      next[batchId].totalBriefs = briefSummary.totalBriefs;
      next[batchId].completedBriefs = briefSummary.completedBriefs;
      next[batchId].isMultiStage = briefSummary.isMultiStage;
    }

    setLiveProgressByBatch(next);
  }, []);

  useEffect(() => {
    activeBatchesRef.current = activeBatches;
  }, [activeBatches]);

  useEffect(() => {
    if (!clientId) {
      setActiveBatches([]);
      activeBatchesRef.current = [];
      setLiveProgressByBatch({});
      activeBatchIdsRef.current = [];
      return;
    }

    let isCancelled = false;

    // Load initial active (running) batches, then filter out stale rows
    // that no longer have pending/running jobs attached.
    const loadInitialBatches = async () => {
      const { data } = await supabase
        .from('generation_batches')
        .select('*')
        .eq('client_id', clientId)
        .eq('status', 'running')
        .order('created_at', { ascending: false });

      if (!data || isCancelled) {
        if (!data && !isCancelled) {
          setActiveBatches([]);
          activeBatchesRef.current = [];
        }
        return;
      }

      const batchIds = data.map((batch) => batch.id);
      if (batchIds.length === 0) {
        if (!isCancelled) {
          setActiveBatches([]);
          activeBatchesRef.current = [];
        }
        return;
      }

      const { data: activeJobs, error: activeJobsError } = await supabase
        .from('generation_jobs')
        .select('batch_id')
        .in('batch_id', batchIds)
        .in('status', ['pending', 'running']);

      if (isCancelled) return;

      if (activeJobsError) {
        // Fail open: still show running batches if active-jobs lookup fails.
        setActiveBatches(data as GenerationBatch[]);
        activeBatchesRef.current = data as GenerationBatch[];
        activeBatchIdsRef.current = (data as GenerationBatch[]).map((batch) => batch.id);
        void refreshLiveProgress(data as GenerationBatch[]);
        return;
      }

      const activeJobBatchIds = (activeJobs || [])
        .map((job) => job.batch_id)
        .filter((batchId): batchId is string => Boolean(batchId));

      const runningBatches = filterRunningBatchesForDisplay(
        data as GenerationBatch[],
        activeJobBatchIds
      );
      setActiveBatches(runningBatches);
      activeBatchesRef.current = runningBatches;
      activeBatchIdsRef.current = runningBatches.map((batch) => batch.id);
      void refreshLiveProgress(runningBatches);
    };

    void loadInitialBatches();

    // Subscribe to changes on generation_batches for this client
    const channel = supabase
      .channel(`batches-client:${clientId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'generation_batches',
        filter: `client_id=eq.${clientId}`,
      }, (payload) => {
        const batch = (payload.new || payload.old) as GenerationBatch | null;
        if (!batch?.id) return;
        setActiveBatches(prev => {
          const filtered = prev.filter(b => b.id !== batch.id);
          if (payload.eventType === 'DELETE') {
            activeBatchesRef.current = filtered;
            activeBatchIdsRef.current = filtered.map((entry) => entry.id);
            void refreshLiveProgress(filtered);
            return filtered;
          }
          if (batch.status === 'running') {
            const updated = [batch, ...filtered];
            activeBatchesRef.current = updated;
            activeBatchIdsRef.current = updated.map((entry) => entry.id);
            void refreshLiveProgress(updated);
            return updated;
          }
          // For completed/cancelled/partially_failed: keep visible briefly for UX,
          // then auto-dismiss after 5 seconds
          const updated = [batch, ...filtered];
          activeBatchesRef.current = updated;
          activeBatchIdsRef.current = updated.map((entry) => entry.id);
          void refreshLiveProgress(updated);

          // Clear any existing timer for this batch
          const existing = dismissTimers.current.get(batch.id);
          if (existing) clearTimeout(existing);

          // Set auto-dismiss timer
          const timer = setTimeout(() => {
            setActiveBatches(current => {
              const remaining = current.filter(b => b.id !== batch.id);
              activeBatchesRef.current = remaining;
              activeBatchIdsRef.current = remaining.map((entry) => entry.id);
              void refreshLiveProgress(remaining);
              return remaining;
            });
            dismissTimers.current.delete(batch.id);
          }, 5000);
          dismissTimers.current.set(batch.id, timer);

          return updated;
        });
      })
      .subscribe();

    // Subscribe to job-level updates to keep running-batch progress live.
    const jobsChannel = supabase
      .channel(`batch-jobs-client:${clientId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'generation_jobs',
        filter: `client_id=eq.${clientId}`,
      }, (payload) => {
        const newJob = payload.new as { batch_id?: string | null } | null;
        const oldJob = payload.old as { batch_id?: string | null } | null;
        const batchId = newJob?.batch_id || oldJob?.batch_id;
        if (!batchId) return;
        if (!activeBatchIdsRef.current.includes(batchId)) return;
        void refreshLiveProgress(activeBatchesRef.current);
      })
      .subscribe();

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
      supabase.removeChannel(jobsChannel);
      // Clear all dismiss timers on cleanup
      dismissTimers.current.forEach(timer => clearTimeout(timer));
      dismissTimers.current.clear();
    };
  }, [clientId, refreshLiveProgress]);

  return { activeBatches, liveProgressByBatch };
}
