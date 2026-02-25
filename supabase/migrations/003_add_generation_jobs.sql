-- Migration: Add generation_jobs and generation_batches tables
-- Provides server-side job queue infrastructure for background brief/article generation.
-- Edge Functions (create-generation-job, process-generation-queue) read and write these tables.
-- Frontend subscribes via Supabase Realtime for live progress updates.

-- ============================================
-- 1. Generation Batches (parent for grouped jobs)
-- ============================================
-- Batches group multiple generation jobs together (e.g., generating briefs
-- for an entire client). Referenced by generation_jobs.batch_id.

CREATE TABLE IF NOT EXISTS generation_batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES access_codes(id),
  name TEXT,
  total_jobs INTEGER NOT NULL DEFAULT 0,
  completed_jobs INTEGER NOT NULL DEFAULT 0,
  failed_jobs INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Status CHECK constraint: separated from CREATE TABLE to avoid the
-- IF NOT EXISTS + inline CHECK gotcha in PostgreSQL.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_batches_status_check'
  ) THEN
    ALTER TABLE generation_batches
      ADD CONSTRAINT generation_batches_status_check
      CHECK (status IN ('running', 'completed', 'partially_failed', 'cancelled'));
  END IF;
END $$;

-- ============================================
-- 2. Generation Jobs (the job queue)
-- ============================================
-- Each row is a unit of work: one brief step, a full 7-step brief,
-- an article generation, or a regeneration with user feedback.
-- The process-generation-queue Edge Function polls for status='pending',
-- claims jobs atomically, runs them, and writes results back.

CREATE TABLE IF NOT EXISTS generation_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brief_id UUID NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES access_codes(id),

  -- Job specification
  job_type TEXT NOT NULL,
  step_number INTEGER,                       -- Which brief step (1-7), NULL for article jobs
  config JSONB NOT NULL DEFAULT '{}',        -- Snapshot of all data the worker needs

  -- Execution state
  status TEXT NOT NULL DEFAULT 'pending',
  progress JSONB NOT NULL DEFAULT '{}',      -- Live progress for Realtime subscription
  error_message TEXT,
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,

  -- Batch linkage (NULL for standalone jobs)
  batch_id UUID REFERENCES generation_batches(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- job_type CHECK constraint (separated per project convention)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_jobs_job_type_check'
  ) THEN
    ALTER TABLE generation_jobs
      ADD CONSTRAINT generation_jobs_job_type_check
      CHECK (job_type IN ('competitors', 'brief_step', 'full_brief', 'article', 'regenerate'));
  END IF;
END $$;

-- status CHECK constraint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_jobs_status_check'
  ) THEN
    ALTER TABLE generation_jobs
      ADD CONSTRAINT generation_jobs_status_check
      CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));
  END IF;
END $$;

-- step_number range constraint (valid brief steps are 1-7)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_jobs_step_number_check'
  ) THEN
    ALTER TABLE generation_jobs
      ADD CONSTRAINT generation_jobs_step_number_check
      CHECK (step_number IS NULL OR (step_number >= 1 AND step_number <= 7));
  END IF;
END $$;

-- ============================================
-- 3. Add active_job_id to briefs
-- ============================================
-- Points to the currently running/pending job for this brief.
-- Set by create-generation-job, cleared when the job completes/fails.
-- Frontend uses this to show "generation in progress" state.

ALTER TABLE briefs ADD COLUMN IF NOT EXISTS active_job_id UUID;

-- Foreign key constraint (separated per project convention)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'briefs_active_job_id_fkey'
  ) THEN
    ALTER TABLE briefs
      ADD CONSTRAINT briefs_active_job_id_fkey
      FOREIGN KEY (active_job_id) REFERENCES generation_jobs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- 4. Indexes for the job queue pattern
-- ============================================

-- Primary queue index: the worker queries pending jobs ordered by created_at.
-- This composite index supports the exact query in process-generation-queue:
--   SELECT * FROM generation_jobs WHERE status='pending' ORDER BY created_at ASC LIMIT 3
CREATE INDEX IF NOT EXISTS idx_generation_jobs_status_created
  ON generation_jobs(status, created_at ASC);

-- Brief lookup: frontend queries jobs by brief_id + status (getActiveJobForBrief,
-- and the duplicate-check in create-generation-job).
CREATE INDEX IF NOT EXISTS idx_generation_jobs_brief_id_status
  ON generation_jobs(brief_id, status);

-- Brief history: getJobsForBrief orders by created_at DESC.
CREATE INDEX IF NOT EXISTS idx_generation_jobs_brief_id_created
  ON generation_jobs(brief_id, created_at DESC);

-- Batch membership: look up all jobs in a batch.
CREATE INDEX IF NOT EXISTS idx_generation_jobs_batch_id
  ON generation_jobs(batch_id) WHERE batch_id IS NOT NULL;

-- Client-level queries: find all jobs for a client.
CREATE INDEX IF NOT EXISTS idx_generation_jobs_client_id
  ON generation_jobs(client_id);

-- Batch lookups by client.
CREATE INDEX IF NOT EXISTS idx_generation_batches_client_id
  ON generation_batches(client_id);

-- Active job reference on briefs (for fast "is this brief generating?" checks).
CREATE INDEX IF NOT EXISTS idx_briefs_active_job_id
  ON briefs(active_job_id) WHERE active_job_id IS NOT NULL;

-- ============================================
-- 5. Auto-update updated_at trigger
-- ============================================
-- Reuses the existing update_updated_at_column() function from schema.sql.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_generation_jobs_updated_at'
  ) THEN
    CREATE TRIGGER update_generation_jobs_updated_at
      BEFORE UPDATE ON generation_jobs
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================
-- 6. Enable RLS
-- ============================================

ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_batches ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. RLS Policies
-- ============================================
-- The app uses custom access-code auth (not Supabase Auth), and existing
-- tables use permissive USING(true) policies. We follow the same pattern.
-- The create-generation-job Edge Function uses the service-role key (bypasses RLS).
-- The process-generation-queue Edge Function also uses the service-role key.
-- Frontend reads (Realtime subscriptions, getActiveJobForBrief) go through
-- the anon key and need SELECT access.

-- Generation Jobs: full access (matches existing table policy pattern)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can read generation jobs' AND tablename = 'generation_jobs'
  ) THEN
    CREATE POLICY "Users can read generation jobs"
      ON generation_jobs FOR SELECT
      USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can create generation jobs' AND tablename = 'generation_jobs'
  ) THEN
    CREATE POLICY "Users can create generation jobs"
      ON generation_jobs FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update generation jobs' AND tablename = 'generation_jobs'
  ) THEN
    CREATE POLICY "Users can update generation jobs"
      ON generation_jobs FOR UPDATE
      USING (true);
  END IF;
END $$;

-- Generation Batches: full access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage generation batches' AND tablename = 'generation_batches'
  ) THEN
    CREATE POLICY "Users can manage generation batches"
      ON generation_batches FOR ALL
      USING (true);
  END IF;
END $$;

-- ============================================
-- 8. Enable Realtime publication
-- ============================================
-- The frontend subscribes to INSERT/UPDATE events on generation_jobs
-- (useGenerationSubscription) and briefs (useBriefRealtimeSync) via
-- Supabase Realtime postgres_changes. The table must be added to the
-- supabase_realtime publication for this to work.
--
-- Note: briefs is likely already in the publication. Adding IF NOT EXISTS
-- equivalent via DO block since ALTER PUBLICATION doesn't support it natively.

DO $$ BEGIN
  -- Add generation_jobs to realtime publication if not already present
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'generation_jobs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE generation_jobs;
  END IF;

  -- Ensure briefs is in the realtime publication (for useBriefRealtimeSync)
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'briefs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE briefs;
  END IF;
END $$;

-- ============================================
-- 9. pg_cron schedule (manual setup required)
-- ============================================
-- pg_cron must be enabled as a Supabase extension first:
--   1. Go to Supabase Dashboard > Database > Extensions
--   2. Search for "pg_cron" and enable it
--   3. Then run the following SQL manually:
--
-- -- Schedule the queue processor to run every 15 seconds
-- SELECT cron.schedule(
--   'process-generation-queue',           -- job name
--   '15 seconds',                         -- interval
--   $$
--   SELECT net.http_post(
--     url := 'https://iwzaikvwiwrgyliykqah.supabase.co/functions/v1/process-generation-queue',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
--     ),
--     body := '{}'::jsonb
--   ) AS request_id;
--   $$
-- );
--
-- To verify it's running:
--   SELECT * FROM cron.job;
--
-- To check recent executions:
--   SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
--
-- To unschedule:
--   SELECT cron.unschedule('process-generation-queue');
