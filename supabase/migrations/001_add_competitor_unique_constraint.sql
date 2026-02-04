-- Migration: Add unique constraint on brief_competitors for upsert support
-- This allows using upsert instead of delete-all + insert, preventing data loss

-- Add unique constraint on (brief_id, url) for upsert support
-- Using a unique index since Supabase/PostgreSQL supports ON CONFLICT with unique indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_brief_competitors_brief_id_url
  ON brief_competitors(brief_id, url);
