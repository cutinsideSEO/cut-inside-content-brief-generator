// Database types for Supabase tables
// These types mirror the database schema defined in supabase/schema.sql

import type { ContentBrief, ModelSettings, LengthConstraints, ExtractedTemplate, CompetitorRanking } from '../types';

// ============================================
// Access Codes
// ============================================
export interface AccessCode {
  id: string;
  code: string;
  name: string;
  email: string | null;
  client_ids: string[];
  is_admin: boolean;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  expires_at: string | null;
}

export type AccessCodeInsert = Omit<AccessCode, 'id' | 'created_at'>;
export type AccessCodeUpdate = Partial<Omit<AccessCode, 'id' | 'created_at'>>;

// ============================================
// Clients (Folders)
// ============================================
export interface Client {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ClientInsert = Omit<Client, 'id' | 'created_at' | 'updated_at'>;
export type ClientUpdate = Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>;

// ============================================
// Briefs
// ============================================
export type BriefStatus = 'draft' | 'in_progress' | 'complete' | 'archived';
export type AppView = 'login' | 'client_select' | 'brief_list' | 'initial_input' | 'context_input' | 'visualization' | 'briefing' | 'dashboard' | 'content_generation' | 'brief_upload';

export interface KeywordInput {
  kw: string;
  volume: number;
}

export interface Brief {
  id: string;
  client_id: string;
  created_by: string;

  // Metadata
  name: string;
  status: BriefStatus;
  current_view: AppView;
  current_step: number;

  // Input data
  keywords: KeywordInput[] | null;
  subject_info: string | null;
  brand_info: string | null;
  output_language: string;
  serp_language: string;
  serp_country: string;

  // Settings
  model_settings: ModelSettings | null;
  length_constraints: LengthConstraints | null;
  template_url: string | null;
  extracted_template: ExtractedTemplate | null;

  // Brief data (ContentBrief JSON)
  brief_data: Partial<ContentBrief>;

  // UI state for resume
  stale_steps: number[];
  user_feedbacks: { [key: number]: string };
  paa_questions: string[];

  // Timestamps
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

export type BriefInsert = Omit<Brief, 'id' | 'created_at' | 'updated_at' | 'last_accessed_at'>;
export type BriefUpdate = Partial<Omit<Brief, 'id' | 'created_at' | 'client_id' | 'created_by'>>;

// ============================================
// Brief Competitors
// ============================================
export interface BriefCompetitor {
  id: string;
  brief_id: string;
  url: string;
  weighted_score: number | null;
  rankings: CompetitorRanking[] | null;
  h1s: string[] | null;
  h2s: string[] | null;
  h3s: string[] | null;
  word_count: number | null;
  full_text: string | null;
  is_starred: boolean;
  created_at: string;
}

export type BriefCompetitorInsert = Omit<BriefCompetitor, 'id' | 'created_at'>;
export type BriefCompetitorUpdate = Partial<Omit<BriefCompetitor, 'id' | 'created_at' | 'brief_id'>>;

// ============================================
// Brief Context Files
// ============================================
export type ParseStatus = 'pending' | 'parsing' | 'done' | 'error';

export interface BriefContextFile {
  id: string;
  brief_id: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  storage_path: string;
  parsed_content: string | null;
  parse_status: ParseStatus;
  parse_error: string | null;
  created_at: string;
}

export type BriefContextFileInsert = Omit<BriefContextFile, 'id' | 'created_at'>;
export type BriefContextFileUpdate = Partial<Omit<BriefContextFile, 'id' | 'created_at' | 'brief_id'>>;

// ============================================
// Brief Context URLs
// ============================================
export type ScrapeStatus = 'pending' | 'scraping' | 'done' | 'error';

export interface BriefContextUrl {
  id: string;
  brief_id: string;
  url: string;
  scraped_content: string | null;
  scrape_status: ScrapeStatus;
  scrape_error: string | null;
  created_at: string;
}

export type BriefContextUrlInsert = Omit<BriefContextUrl, 'id' | 'created_at'>;
export type BriefContextUrlUpdate = Partial<Omit<BriefContextUrl, 'id' | 'created_at' | 'brief_id'>>;

// ============================================
// Brief Articles
// ============================================
export interface BriefArticle {
  id: string;
  brief_id: string;
  title: string;
  content: string;
  version: number;
  is_current: boolean;
  generation_settings: {
    model_settings?: ModelSettings;
    length_constraints?: LengthConstraints;
  } | null;
  writer_instructions: string | null;
  created_at: string;
}

export type BriefArticleInsert = Omit<BriefArticle, 'id' | 'created_at'>;
export type BriefArticleUpdate = Partial<Omit<BriefArticle, 'id' | 'created_at' | 'brief_id'>>;

// ============================================
// Joined/Extended Types
// ============================================

// Brief with client info
export interface BriefWithClient extends Brief {
  client: Client;
}

// Brief with all related data
export interface BriefWithRelations extends Brief {
  client: Client;
  competitors: BriefCompetitor[];
  context_files: BriefContextFile[];
  context_urls: BriefContextUrl[];
  articles: BriefArticle[];
}

// Client with brief count
export interface ClientWithBriefCount extends Client {
  brief_count: number;
}

// ============================================
// Auth Session Type
// ============================================
export interface AuthSession {
  accessCode: AccessCode;
  loginTime: string;
}

// ============================================
// API Response Types
// ============================================
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}
