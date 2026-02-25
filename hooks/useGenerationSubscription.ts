// useGenerationSubscription Hook - Real-time subscription to generation job updates
import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { getActiveJobForBrief } from '../services/generationJobService';
import type { GenerationJob, GenerationJobProgress } from '../types/database';

export interface GenerationState {
  activeJob: GenerationJob | null;
  isGenerating: boolean;
  progress: GenerationJobProgress;
  error: string | null;
}

const EMPTY_PROGRESS: GenerationJobProgress = {};

export function useGenerationSubscription(briefId: string | null): GenerationState & {
  refreshJob: () => Promise<void>;
} {
  const [activeJob, setActiveJob] = useState<GenerationJob | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch current active job on mount / briefId change
  const refreshJob = useCallback(async () => {
    if (!briefId) {
      setActiveJob(null);
      return;
    }
    try {
      const job = await getActiveJobForBrief(briefId);
      setActiveJob(job);
    } catch (e) {
      console.error('Failed to fetch active job:', e);
    }
  }, [briefId]);

  useEffect(() => {
    refreshJob();
  }, [refreshJob]);

  // Subscribe to realtime changes on generation_jobs for this brief
  useEffect(() => {
    if (!briefId) return;

    const channel = supabase
      .channel(`gen-jobs:${briefId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'generation_jobs',
        filter: `brief_id=eq.${briefId}`,
      }, (payload) => {
        const newRecord = payload.new as GenerationJob;
        if (payload.eventType === 'INSERT') {
          setActiveJob(newRecord);
        } else if (payload.eventType === 'UPDATE') {
          setActiveJob(prev => {
            // Only update if it's the same job or a newer one
            if (!prev || prev.id === newRecord.id) return newRecord;
            return prev;
          });
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [briefId]);

  const isGenerating = activeJob?.status === 'pending' || activeJob?.status === 'running';
  const progress = (activeJob?.progress as GenerationJobProgress) || EMPTY_PROGRESS;
  const error = activeJob?.status === 'failed' ? activeJob.error_message : null;

  return { activeJob, isGenerating, progress, error, refreshJob };
}
