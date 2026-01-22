-- Cut Inside Content Brief Generator - Supabase Schema
-- Run this SQL in the Supabase SQL Editor to create all required tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. Access Codes (Authentication)
-- ============================================
CREATE TABLE access_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  client_ids UUID[] DEFAULT '{}',
  is_admin BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Index for fast code lookups
CREATE INDEX idx_access_codes_code ON access_codes(code);
CREATE INDEX idx_access_codes_is_active ON access_codes(is_active);

-- ============================================
-- 2. Clients (Folders)
-- ============================================
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  created_by UUID REFERENCES access_codes(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_clients_slug ON clients(slug);
CREATE INDEX idx_clients_created_by ON clients(created_by);

-- ============================================
-- 3. Briefs (Main Entity)
-- ============================================
CREATE TABLE briefs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES access_codes(id),

  -- Metadata
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'complete', 'archived')),
  current_view TEXT DEFAULT 'initial_input',
  current_step INTEGER DEFAULT 1,

  -- Input data
  keywords JSONB,
  subject_info TEXT,
  brand_info TEXT,
  output_language TEXT DEFAULT 'English',
  serp_language TEXT DEFAULT 'English',
  serp_country TEXT DEFAULT 'United States',

  -- Settings
  model_settings JSONB,
  length_constraints JSONB,
  template_url TEXT,
  extracted_template JSONB,

  -- Brief data (ContentBrief JSON)
  brief_data JSONB DEFAULT '{}',

  -- UI state for resume
  stale_steps INTEGER[] DEFAULT '{}',
  user_feedbacks JSONB DEFAULT '{}',
  paa_questions TEXT[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for briefs
CREATE INDEX idx_briefs_client_id ON briefs(client_id);
CREATE INDEX idx_briefs_created_by ON briefs(created_by);
CREATE INDEX idx_briefs_status ON briefs(status);
CREATE INDEX idx_briefs_updated_at ON briefs(updated_at DESC);

-- ============================================
-- 4. Brief Competitors
-- ============================================
CREATE TABLE brief_competitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brief_id UUID NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  weighted_score INTEGER,
  rankings JSONB,
  h1s TEXT[],
  h2s TEXT[],
  h3s TEXT[],
  word_count INTEGER,
  full_text TEXT,
  is_starred BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for competitors
CREATE INDEX idx_brief_competitors_brief_id ON brief_competitors(brief_id);

-- ============================================
-- 5. Brief Context Files
-- ============================================
CREATE TABLE brief_context_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brief_id UUID NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  storage_path TEXT NOT NULL,
  parsed_content TEXT,
  parse_status TEXT DEFAULT 'pending' CHECK (parse_status IN ('pending', 'parsing', 'done', 'error')),
  parse_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for context files
CREATE INDEX idx_brief_context_files_brief_id ON brief_context_files(brief_id);

-- ============================================
-- 6. Brief Context URLs
-- ============================================
CREATE TABLE brief_context_urls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brief_id UUID NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  scraped_content TEXT,
  scrape_status TEXT DEFAULT 'pending' CHECK (scrape_status IN ('pending', 'scraping', 'done', 'error')),
  scrape_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for context URLs
CREATE INDEX idx_brief_context_urls_brief_id ON brief_context_urls(brief_id);

-- ============================================
-- 7. Brief Articles (Versioned)
-- ============================================
CREATE TABLE brief_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brief_id UUID NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  is_current BOOLEAN DEFAULT TRUE,
  generation_settings JSONB,
  writer_instructions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for articles
CREATE INDEX idx_brief_articles_brief_id ON brief_articles(brief_id);
CREATE INDEX idx_brief_articles_is_current ON brief_articles(is_current) WHERE is_current = TRUE;

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_context_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_context_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE brief_articles ENABLE ROW LEVEL SECURITY;

-- Access codes: Only authenticated users can read their own code
CREATE POLICY "Users can read their own access code"
  ON access_codes FOR SELECT
  USING (true);

-- Clients: Users can see clients they have access to
CREATE POLICY "Users can read their assigned clients"
  ON clients FOR SELECT
  USING (true);

CREATE POLICY "Users can create clients"
  ON clients FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their clients"
  ON clients FOR UPDATE
  USING (true);

-- Briefs: Users can manage briefs in their assigned clients
CREATE POLICY "Users can read briefs in their clients"
  ON briefs FOR SELECT
  USING (true);

CREATE POLICY "Users can create briefs"
  ON briefs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their briefs"
  ON briefs FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete their briefs"
  ON briefs FOR DELETE
  USING (true);

-- Competitors: Access through brief ownership
CREATE POLICY "Users can manage competitors"
  ON brief_competitors FOR ALL
  USING (true);

-- Context files: Access through brief ownership
CREATE POLICY "Users can manage context files"
  ON brief_context_files FOR ALL
  USING (true);

-- Context URLs: Access through brief ownership
CREATE POLICY "Users can manage context URLs"
  ON brief_context_urls FOR ALL
  USING (true);

-- Articles: Access through brief ownership
CREATE POLICY "Users can manage articles"
  ON brief_articles FOR ALL
  USING (true);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_briefs_updated_at
  BEFORE UPDATE ON briefs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to mark previous article versions as not current
CREATE OR REPLACE FUNCTION mark_previous_articles_not_current()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = TRUE THEN
    UPDATE brief_articles
    SET is_current = FALSE
    WHERE brief_id = NEW.brief_id
      AND id != NEW.id
      AND is_current = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mark_previous_articles
  AFTER INSERT ON brief_articles
  FOR EACH ROW
  EXECUTE FUNCTION mark_previous_articles_not_current();

-- ============================================
-- Storage Bucket for Context Files
-- ============================================
-- Run this in the Supabase dashboard under Storage:
-- Create a bucket named "context-files" with public access disabled

-- Sample data for testing (optional)
-- INSERT INTO access_codes (code, name, email, is_admin)
-- VALUES ('ADMIN123', 'Admin User', 'admin@cutinside.com', true);
