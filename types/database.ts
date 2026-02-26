// Database types for Supabase tables
// These types mirror the database schema defined in supabase/schema.sql

import type { ContentBrief, ModelSettings, LengthConstraints, ExtractedTemplate, CompetitorRanking } from '../types';
import type { BrandIdentity, BrandVoice, TargetAudience, ContentStrategy, OperationalSettings, ClientContextFile, ClientContextUrl } from './clientProfile';

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
  // Brand profile JSONB columns
  brand_identity: BrandIdentity;
  brand_voice: BrandVoice;
  target_audience: TargetAudience;
  content_strategy: ContentStrategy;
  operational_settings: OperationalSettings;
}

export type ClientInsert = Omit<Client, 'id' | 'created_at' | 'updated_at'>;
export type ClientUpdate = Partial<Omit<Client, 'id' | 'created_at' | 'updated_at'>>;

// ============================================
// Briefs
// ============================================
export type BriefStatus = 'draft' | 'in_progress' | 'complete' | 'sent_to_client' | 'approved' | 'changes_requested' | 'in_writing' | 'published' | 'archived';
export type ArticleStatus = 'draft' | 'sent_to_client' | 'approved' | 'published';

/** Statuses that represent the manual post-generation workflow */
export const WORKFLOW_STATUSES: BriefStatus[] = ['sent_to_client', 'approved', 'changes_requested', 'in_writing', 'published'];

/** Check if a brief status is a manual workflow status (not auto-computed) */
export function isWorkflowStatus(status: BriefStatus): boolean {
  return (WORKFLOW_STATUSES as string[]).includes(status);
}
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

  // Workflow
  published_url: string | null;
  published_at: string | null;

  // Generation
  active_job_id: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

export type BriefInsert = Omit<Brief, 'id' | 'created_at' | 'updated_at' | 'last_accessed_at'>;
export type BriefUpdate = Partial<Omit<Brief, 'id' | 'created_at' | 'client_id' | 'created_by'>>;

// ============================================
// Generation Jobs
// ============================================

export type GenerationJobType = 'competitors' | 'brief_step' | 'full_brief' | 'article' | 'regenerate';
export type GenerationJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type GenerationBatchStatus = 'running' | 'completed' | 'partially_failed' | 'cancelled';

export interface GenerationJobProgress {
  current_step?: number;
  total_steps?: number;
  step_name?: string;
  current_section?: string;
  current_index?: number;
  total_sections?: number;
  percentage?: number;
  word_count?: number;
  // Competitor analysis progress
  phase?: string;              // 'serp' | 'onpage' | 'saving' | 'complete'
  completed_keywords?: number;
  total_keywords?: number;
  completed_urls?: number;
  total_urls?: number;
  current_domain?: string;     // e.g. "example.com" being scraped
}

export interface GenerationJob {
  id: string;
  brief_id: string;
  client_id: string;
  created_by: string;
  job_type: GenerationJobType;
  step_number: number | null;
  config: Record<string, unknown>;
  status: GenerationJobStatus;
  progress: GenerationJobProgress;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  batch_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  updated_at: string;
}

export interface GenerationBatch {
  id: string;
  client_id: string;
  created_by: string;
  name: string | null;
  total_jobs: number;
  completed_jobs: number;
  failed_jobs: number;
  status: GenerationBatchStatus;
  created_at: string;
  completed_at: string | null;
}

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
  status: ArticleStatus;
  published_url: string | null;
  generation_settings: {
    model_settings?: ModelSettings;
    length_constraints?: LengthConstraints;
  } | null;
  writer_instructions: string | null;
  created_at: string;
}

export type BriefArticleInsert = Omit<BriefArticle, 'id' | 'created_at'>;
export type BriefArticleUpdate = Partial<Omit<BriefArticle, 'id' | 'created_at' | 'brief_id'>>;

// Article with parent brief info
export interface ArticleWithBrief extends BriefArticle {
    brief_name: string;
    brief_status: BriefStatus;
}

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

// Client with all context data (files + URLs)
export interface ClientWithContext extends Client {
  context_files: ClientContextFile[];
  context_urls: ClientContextUrl[];
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
