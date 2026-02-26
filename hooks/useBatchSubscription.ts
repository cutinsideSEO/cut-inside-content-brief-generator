// useBatchSubscription Hook - Real-time subscription to generation batch updates
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import type { GenerationBatch } from '../types/database';

export function useBatchSubscription(clientId: string | null) {
  const [activeBatches, setActiveBatches] = useState<GenerationBatch[]>([]);
  const dismissTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!clientId) {
      setActiveBatches([]);
      return;
    }

    // Load initial active (running) batches
    supabase
      .from('generation_batches')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'running')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setActiveBatches(data);
      });

    // Subscribe to changes on generation_batches for this client
    const channel = supabase
      .channel(`batches-client:${clientId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'generation_batches',
        filter: `client_id=eq.${clientId}`,
      }, (payload) => {
        const batch = payload.new as GenerationBatch;
        setActiveBatches(prev => {
          const filtered = prev.filter(b => b.id !== batch.id);
          if (batch.status === 'running') {
            return [batch, ...filtered];
          }
          // For completed/cancelled/partially_failed: keep visible briefly for UX,
          // then auto-dismiss after 5 seconds
          const updated = [batch, ...filtered];

          // Clear any existing timer for this batch
          const existing = dismissTimers.current.get(batch.id);
          if (existing) clearTimeout(existing);

          // Set auto-dismiss timer
          const timer = setTimeout(() => {
            setActiveBatches(current => current.filter(b => b.id !== batch.id));
            dismissTimers.current.delete(batch.id);
          }, 5000);
          dismissTimers.current.set(batch.id, timer);

          return updated;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      // Clear all dismiss timers on cleanup
      dismissTimers.current.forEach(timer => clearTimeout(timer));
      dismissTimers.current.clear();
    };
  }, [clientId]);

  return { activeBatches };
}
