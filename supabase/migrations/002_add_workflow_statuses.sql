-- Migration: Add workflow statuses for briefs and articles
-- This adds post-generation workflow tracking to both briefs and articles

-- ============================================
-- 1. Update briefs.status CHECK constraint
-- ============================================
ALTER TABLE briefs DROP CONSTRAINT IF EXISTS briefs_status_check;
ALTER TABLE briefs ADD CONSTRAINT briefs_status_check
  CHECK (status IN (
    'draft', 'in_progress', 'complete',
    'sent_to_client', 'approved', 'changes_requested', 'in_writing', 'published',
    'archived'
  ));

-- Add published_url and published_at columns to briefs
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS published_url TEXT;
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- ============================================
-- 2. Add status and published_url to brief_articles
-- ============================================
ALTER TABLE brief_articles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
  CHECK (status IN ('draft', 'sent_to_client', 'approved', 'published'));
ALTER TABLE brief_articles ADD COLUMN IF NOT EXISTS published_url TEXT;

-- ============================================
-- 3. Indexes for new status values
-- ============================================
CREATE INDEX IF NOT EXISTS idx_briefs_workflow_status
  ON briefs(status) WHERE status IN ('sent_to_client', 'approved', 'changes_requested', 'in_writing', 'published');

CREATE INDEX IF NOT EXISTS idx_brief_articles_status
  ON brief_articles(status);
