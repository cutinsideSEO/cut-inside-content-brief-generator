-- Migration: Queue leasing + retry backoff fields for generation_jobs
-- Adds lease-based claim metadata and scheduled retry/dead-letter columns.

ALTER TABLE generation_jobs
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lease_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claimed_by TEXT,
  ADD COLUMN IF NOT EXISTS dead_lettered_at TIMESTAMPTZ;

-- Pending queue scan by eligibility (next_retry_at <= now or null), FIFO by created_at.
CREATE INDEX IF NOT EXISTS idx_generation_jobs_pending_retry
  ON generation_jobs(status, next_retry_at, created_at ASC)
  WHERE status = 'pending';

-- Running lease scan for stale/expired claims.
CREATE INDEX IF NOT EXISTS idx_generation_jobs_running_lease
  ON generation_jobs(status, lease_expires_at)
  WHERE status = 'running';
