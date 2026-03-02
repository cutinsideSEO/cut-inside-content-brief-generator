-- Migration: Add client_projects model and project invariants across briefs/articles

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- 1. Client Projects table
-- ============================================
CREATE TABLE IF NOT EXISTS client_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES access_codes(id),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'client_projects_status_check'
  ) THEN
    ALTER TABLE client_projects
      ADD CONSTRAINT client_projects_status_check
      CHECK (status IN ('active', 'archived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_client_projects_client_id
  ON client_projects(client_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_projects_client_name_unique
  ON client_projects(client_id, lower(name));

DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'update_updated_at_column'
  )
  AND NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_client_projects_updated_at'
  ) THEN
    CREATE TRIGGER update_client_projects_updated_at
      BEFORE UPDATE ON client_projects
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================
-- 2. Add project_id columns + FKs
-- ============================================
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE brief_articles ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE generation_batches ADD COLUMN IF NOT EXISTS project_id UUID;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'briefs_project_id_fkey'
  ) THEN
    ALTER TABLE briefs
      ADD CONSTRAINT briefs_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'brief_articles_project_id_fkey'
  ) THEN
    ALTER TABLE brief_articles
      ADD CONSTRAINT brief_articles_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'generation_batches_project_id_fkey'
  ) THEN
    ALTER TABLE generation_batches
      ADD CONSTRAINT generation_batches_project_id_fkey
      FOREIGN KEY (project_id) REFERENCES client_projects(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION enforce_project_client_match(
  p_project_id UUID,
  p_client_id UUID,
  p_entity TEXT
)
RETURNS VOID AS $$
DECLARE
  v_project_client_id UUID;
BEGIN
  IF p_project_id IS NULL THEN
    RETURN;
  END IF;

  SELECT client_id
  INTO v_project_client_id
  FROM client_projects
  WHERE id = p_project_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION '% references unknown project_id %', p_entity, p_project_id;
  END IF;

  IF v_project_client_id IS DISTINCT FROM p_client_id THEN
    RAISE EXCEPTION '% project_id % belongs to client %, expected client %',
      p_entity, p_project_id, v_project_client_id, p_client_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION enforce_brief_project_client_match()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM enforce_project_client_match(NEW.project_id, NEW.client_id, 'briefs');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_brief_project_client_match ON briefs;
CREATE TRIGGER enforce_brief_project_client_match
  BEFORE INSERT OR UPDATE OF project_id, client_id ON briefs
  FOR EACH ROW
  EXECUTE FUNCTION enforce_brief_project_client_match();

CREATE OR REPLACE FUNCTION enforce_generation_batch_project_client_match()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM enforce_project_client_match(NEW.project_id, NEW.client_id, 'generation_batches');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_generation_batch_project_client_match ON generation_batches;
CREATE TRIGGER enforce_generation_batch_project_client_match
  BEFORE INSERT OR UPDATE OF project_id, client_id ON generation_batches
  FOR EACH ROW
  EXECUTE FUNCTION enforce_generation_batch_project_client_match();

CREATE INDEX IF NOT EXISTS idx_briefs_client_project_id
  ON briefs(client_id, project_id);

CREATE INDEX IF NOT EXISTS idx_brief_articles_project_id
  ON brief_articles(project_id);

CREATE INDEX IF NOT EXISTS idx_generation_batches_client_project_id
  ON generation_batches(client_id, project_id);

-- ============================================
-- 3. Realtime + RLS for client_projects
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'client_projects'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE client_projects;
  END IF;
END $$;

ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage client projects' AND tablename = 'client_projects'
  ) THEN
    CREATE POLICY "Users can manage client projects"
      ON client_projects FOR ALL
      USING (true);
  END IF;
END $$;

-- ============================================
-- 4. Backfill article project_id from parent brief
-- ============================================
UPDATE brief_articles AS ba
SET project_id = b.project_id
FROM briefs AS b
WHERE b.id = ba.brief_id
  AND ba.project_id IS DISTINCT FROM b.project_id;

-- ============================================
-- 5. Invariant triggers
-- ============================================
CREATE OR REPLACE FUNCTION enforce_brief_article_project_match()
RETURNS TRIGGER AS $$
DECLARE
  v_brief_project_id UUID;
BEGIN
  SELECT project_id
  INTO v_brief_project_id
  FROM briefs
  WHERE id = NEW.brief_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Parent brief % not found for article %', NEW.brief_id, NEW.id;
  END IF;

  IF NEW.project_id IS NULL THEN
    NEW.project_id := v_brief_project_id;
  ELSIF NEW.project_id IS DISTINCT FROM v_brief_project_id THEN
    RAISE EXCEPTION 'brief_articles.project_id (%) must match briefs.project_id (%) for brief %',
      NEW.project_id,
      v_brief_project_id,
      NEW.brief_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_brief_article_project_match ON brief_articles;
CREATE TRIGGER enforce_brief_article_project_match
  BEFORE INSERT OR UPDATE ON brief_articles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_brief_article_project_match();

CREATE OR REPLACE FUNCTION cascade_brief_project_to_articles()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE brief_articles
  SET project_id = NEW.project_id
  WHERE brief_id = NEW.id
    AND project_id IS DISTINCT FROM NEW.project_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cascade_brief_project_to_articles ON briefs;
CREATE TRIGGER cascade_brief_project_to_articles
  AFTER UPDATE OF project_id ON briefs
  FOR EACH ROW
  WHEN (OLD.project_id IS DISTINCT FROM NEW.project_id)
  EXECUTE FUNCTION cascade_brief_project_to_articles();
