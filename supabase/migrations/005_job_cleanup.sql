-- Migration 005: Job Cleanup
-- Adds a scheduled cleanup function for old generation jobs.
--
-- NOTE ON RLS: Row Level Security policies on generation_jobs, briefs, and
-- related tables are intentionally permissive. The Edge Functions
-- (create-generation-job, process-generation-queue) perform their own
-- authorization checks (user ownership, client access) before any mutations.
-- This is by design — the Edge Function layer is the auth boundary.

-- Function to clean up old completed/failed/cancelled generation jobs
CREATE OR REPLACE FUNCTION cleanup_old_generation_jobs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM generation_jobs
  WHERE status IN ('completed', 'failed', 'cancelled')
    AND updated_at < NOW() - INTERVAL '30 days';

  DELETE FROM generation_batches
  WHERE status = 'running'
    AND created_at < NOW() - INTERVAL '1 day';
END;
$$;

-- Schedule cleanup to run daily at 3:00 AM UTC
-- Requires pg_cron extension (enabled by default on Supabase)
-- Uncomment the following lines to activate:
--
-- SELECT cron.schedule(
--   'cleanup-old-generation-jobs',
--   '0 3 * * *',
--   $$SELECT cleanup_old_generation_jobs()$$
-- );
