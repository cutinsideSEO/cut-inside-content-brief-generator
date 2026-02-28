-- Migration 006: Add unique constraint on brief_competitors(brief_id, url)
-- Required for the upsert in process-generation-queue to work correctly
-- (onConflict: 'brief_id,url' needs a matching unique index)

CREATE UNIQUE INDEX IF NOT EXISTS idx_brief_competitors_brief_url ON brief_competitors(brief_id, url);
