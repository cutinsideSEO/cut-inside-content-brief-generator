-- Migration: Batch generation infrastructure
-- Enables Realtime for generation_batches, adds atomic counter RPC,
-- and adds indexes for batch query patterns.
-- Supports Phase 5: Bulk Generation (create-generation-batch Edge Function,
-- batch counter updates in process-generation-queue, chained jobs).

-- ============================================
-- 1. Enable Realtime for generation_batches
-- ============================================
-- The frontend subscribes to generation_batches changes via useBatchSubscription
-- to show live batch progress in BatchProgressPanel.
-- Wrapped in a DO block to handle the case where it's already in the publication.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'generation_batches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE generation_batches;
  END IF;
END $$;

-- ============================================
-- 2. Atomic batch counter increment RPC
-- ============================================
-- Used by process-generation-queue to atomically increment completed_jobs
-- or failed_jobs on a batch row, avoiding read-modify-write race conditions
-- when multiple jobs complete in quick succession.
--
-- Usage from Edge Function:
--   await supabase.rpc('increment_batch_counter', {
--     p_batch_id: batchId,
--     p_column: 'completed_jobs',
--     p_increment: 1
--   });

CREATE OR REPLACE FUNCTION increment_batch_counter(
  p_batch_id UUID,
  p_column TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  IF p_column = 'completed_jobs' THEN
    UPDATE generation_batches
    SET completed_jobs = completed_jobs + p_increment
    WHERE id = p_batch_id;
  ELSIF p_column = 'failed_jobs' THEN
    UPDATE generation_batches
    SET failed_jobs = failed_jobs + p_increment
    WHERE id = p_batch_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. Additional indexes for batch queries
-- ============================================
-- The existing migration 003 already created:
--   idx_generation_batches_client_id ON generation_batches(client_id)
--   idx_generation_jobs_batch_id ON generation_jobs(batch_id) WHERE batch_id IS NOT NULL
--
-- Add a composite index for querying active batches by client + status,
-- which is the primary query pattern for useBatchSubscription:
--   SELECT * FROM generation_batches
--   WHERE client_id = ? AND status = 'running'
--   ORDER BY created_at DESC

CREATE INDEX IF NOT EXISTS idx_generation_batches_client_status
  ON generation_batches(client_id, status);

-- Add an index for looking up batch jobs by batch_id + status,
-- used when cancelling a batch (update all pending jobs) and
-- when checking if a batch is fully complete:
--   SELECT * FROM generation_jobs WHERE batch_id = ? AND status = 'pending'

CREATE INDEX IF NOT EXISTS idx_generation_jobs_batch_status
  ON generation_jobs(batch_id, status) WHERE batch_id IS NOT NULL;
