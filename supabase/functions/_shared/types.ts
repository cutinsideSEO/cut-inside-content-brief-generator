// Shared types for Edge Function generation logic
// Ported from frontend types.ts — Deno-compatible (no React/browser types)

// ============================================
// Core Brief Types
// ============================================

export interface ReasoningItem<T> {
  value: T;
  reasoning: string;
}

export interface CompetitorRanking {
  keyword: string;
  rank: number;
  volume: number;
}

export interface CompetitorPage {
  URL: string;
  Weighted_Score: number;
  rankings: CompetitorRanking[];
  H1s: string[];
  H2s: string[];
  H3s: string[];
  Word_Count: number;
  Full_Text: string;
  is_starred?: boolean;
}

export type CompetitorSummary = Omit<CompetitorPage, 'Full_Text'>;

export interface KeywordSelection {
  keyword: string;
  notes: string;
}

export interface KeywordStrategy {
  primary_keywords: KeywordSelection[];
  secondary_keywords: KeywordSelection[];
  reasoning: string;
}

export interface CompetitorBreakdown {
  url: string;
  description: string;
  good_points: string[];
  bad_points: string[];
}

export interface CompetitorInsights {
  competitor_breakdown: CompetitorBreakdown[];
  differentiation_summary: ReasoningItem<string>;
}

export interface ContentGapAnalysis {
  table_stakes: ReasoningItem<string>[];
  strategic_opportunities: ReasoningItem<string>[];
  reasoning: string;
}

export interface OnPageSeo {
  title_tag: ReasoningItem<string>;
  meta_description: ReasoningItem<string>;
  h1: ReasoningItem<string>;
  url_slug: ReasoningItem<string>;
  og_title: ReasoningItem<string>;
  og_description: ReasoningItem<string>;
}

export interface FeaturedSnippetTarget {
  is_target: boolean;
  format: 'paragraph' | 'list' | 'table';
  target_query?: string;
}

export interface OutlineItem {
  level: string;
  heading: string;
  guidelines: string[];
  reasoning: string;
  children: OutlineItem[];
  targeted_keywords: string[];
  competitor_coverage: string[];
  additional_resources?: string[];
  featured_snippet_target?: FeaturedSnippetTarget;
  target_word_count?: number;
}

export interface ArticleStructure {
  word_count_target: number;
  outline: OutlineItem[];
  reasoning: string;
}

export interface FAQItem {
  question: string;
  guidelines: string[];
}

export interface FAQs {
  questions: FAQItem[];
  reasoning: string;
}

export type SearchIntentType = 'informational' | 'transactional' | 'navigational' | 'commercial_investigation';

export interface SearchIntent {
  type: SearchIntentType;
  preferred_format: string;
  serp_features: string[];
  reasoning: string;
}

export interface ValidationScore {
  score: number;
  explanation: string;
}

export interface BriefValidation {
  scores: {
    search_intent_alignment: ValidationScore;
    table_stakes_coverage: ValidationScore;
    strategic_opportunities: ValidationScore;
    keyword_integration: ValidationScore;
    competitive_advantage: ValidationScore;
  };
  overall_score: number;
  improvements: { section: string; issue: string; suggestion: string }[];
  strengths: string[];
  ready_for_writing: boolean;
}

export interface EEATSignals {
  experience: string[];
  expertise: string[];
  authority: string[];
  trust: string[];
  reasoning: string;
}

export interface ContentBrief {
  search_intent?: SearchIntent;
  page_goal: ReasoningItem<string>;
  target_audience: ReasoningItem<string>;
  keyword_strategy: KeywordStrategy;
  competitor_insights: CompetitorInsights;
  content_gap_analysis: ContentGapAnalysis;
  article_structure: ArticleStructure;
  faqs: FAQs;
  on_page_seo: OnPageSeo;
  eeat_signals?: EEATSignals;
  validation?: BriefValidation;
}

// ============================================
// Model & Settings Types
// ============================================

export type GeminiModel = 'gemini-3-pro-preview' | 'gemini-3-flash-preview' | 'gemini-2.5-pro';
export type ThinkingLevel = 'high' | 'medium' | 'low' | 'minimal';

export interface ModelSettings {
  model: GeminiModel;
  thinkingLevel: ThinkingLevel;
}

// ============================================
// Template Types
// ============================================

export interface HeadingNode {
  level: 1 | 2 | 3 | 4;
  text: string;
  adaptedText?: string;
  children: HeadingNode[];
  guidelines?: string;
}

// ============================================
// Length Constraints
// ============================================

export interface LengthConstraints {
  globalTarget: number | null;
  sectionTargets: Record<string, number>;
  strictMode: boolean;
}

// ============================================
// Generation Parameters
// ============================================

/** Parameters needed by the worker Edge Function to execute a brief step */
export interface StepExecutionParams {
  step: number;
  competitorData: CompetitorPage[] | CompetitorSummary[];
  subjectInfo: string;
  brandInfo: string;
  previousStepsData: Partial<ContentBrief>;
  groundTruthText?: string;
  userFeedback?: string;
  availableKeywords?: { keyword: string; volume: number }[];
  isRegeneration?: boolean;
  language: string;
  templateHeadings?: HeadingNode[];
  lengthConstraints?: LengthConstraints;
  paaQuestions?: string[];
  model: GeminiModel;
  thinkingLevel: ThinkingLevel;
}

/** Parameters for article section generation */
export interface ArticleSectionParams {
  brief: Partial<ContentBrief>;
  contentSoFar: string;
  sectionToWrite: OutlineItem;
  upcomingHeadings: string[];
  language: string;
  writerInstructions?: string;
  brandContext?: string;
  model: GeminiModel;
  /**
   * Included for type consistency with the job queue payload, but intentionally
   * ignored during article generation. Articles always use the fixed
   * `ARTICLE_THINKING_BUDGET` from `generation-config.ts` to ensure consistent
   * high-quality output. See {@link buildArticleGenerationConfig}.
   */
  thinkingLevel: ThinkingLevel;
  globalWordTarget?: number | null;
  wordsWrittenSoFar?: number;
  totalSections?: number;
  currentSectionIndex?: number;
  strictMode?: boolean;
}

// ============================================
// Brand Context Types (subset for Edge Functions)
// ============================================

export interface BrandIdentity {
  brand_name?: string;
  tagline?: string;
  positioning?: string;
  industry?: string;
  website?: string;
  brand_color?: string;
  logo_url?: string;
}

export interface BrandVoice {
  tone_descriptors?: string[];
  writing_style?: string;
  technical_level?: string;
  values?: string[];
  usps?: string[];
  personality_traits?: string[];
}

export interface TargetAudienceProfile {
  audience_type?: string;
  demographics?: string;
  job_titles?: string[];
  personas?: { name: string; description?: string; pain_points?: string[]; goals?: string[] }[];
}

export interface ContentStrategy {
  default_output_language?: string;
  default_serp_language?: string;
  default_serp_country?: string;
  content_dos?: string[];
  content_donts?: string[];
  banned_terms?: string[];
  preferred_terms?: string[];
  seo_guidelines?: string;
  known_competitors?: string[];
}

/** Simplified client interface for brand context building in Edge Functions */
export interface ClientBrandData {
  brand_identity: BrandIdentity;
  brand_voice: BrandVoice;
  target_audience: TargetAudienceProfile;
  content_strategy: ContentStrategy;
}

export interface ContextFileData {
  file_name: string;
  description: string | null;
  parsed_content: string | null;
  parse_status: string;
}

export interface ContextUrlData {
  url: string;
  label: string | null;
  scraped_content: string | null;
  scrape_status: string;
}
