// useBriefRealtimeSync Hook - Real-time subscription to brief data updates
import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import type { ContentBrief } from '../types';

/**
 * Subscribes to changes on a specific brief row.
 * When the backend updates brief_data (e.g., after a generation step),
 * the callback fires so the UI can refresh.
 */
export function useBriefRealtimeSync(
  briefId: string | null,
  callbacks: {
    onBriefDataUpdated?: (briefData: Partial<ContentBrief>) => void;
    onStaleStepsUpdated?: (staleSteps: number[]) => void;
    onStatusUpdated?: (status: string) => void;
    onStepUpdated?: (step: number) => void;
  }
) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    if (!briefId) return;

    const channel = supabase
      .channel(`brief-sync:${briefId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'briefs',
        filter: `id=eq.${briefId}`,
      }, (payload) => {
        const newRecord = payload.new as Record<string, unknown>;
        const oldRecord = payload.old as Record<string, unknown>;
        const cb = callbacksRef.current;

        // Check what changed and fire appropriate callbacks
        if (cb.onBriefDataUpdated && newRecord.brief_data !== oldRecord.brief_data) {
          cb.onBriefDataUpdated(newRecord.brief_data as Partial<ContentBrief>);
        }
        if (cb.onStaleStepsUpdated && JSON.stringify(newRecord.stale_steps) !== JSON.stringify(oldRecord.stale_steps)) {
          cb.onStaleStepsUpdated((newRecord.stale_steps as number[]) || []);
        }
        if (cb.onStatusUpdated && newRecord.status !== oldRecord.status) {
          cb.onStatusUpdated(newRecord.status as string);
        }
        if (cb.onStepUpdated && newRecord.current_step !== oldRecord.current_step) {
          cb.onStepUpdated(newRecord.current_step as number);
        }
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [briefId]);
}
