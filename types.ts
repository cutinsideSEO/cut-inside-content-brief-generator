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

// Feature N2: Featured Snippet Targeting
export interface FeaturedSnippetTarget {
  is_target: boolean;
  format: 'paragraph' | 'list' | 'table';
  target_query?: string;
}

export interface OutlineItem {
  level: string; // E.g., "H2", "H3", "Hero", "Conclusion"
  heading: string;
  guidelines: string[];
  reasoning: string;
  children: OutlineItem[];
  targeted_keywords: string[];
  competitor_coverage: string[];
  additional_resources?: string[];
  featured_snippet_target?: FeaturedSnippetTarget;  // N2: Featured Snippet Targeting
  target_word_count?: number;  // N5: Per-Section Word Count
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

// Feature N1: Search Intent Classification
export type SearchIntentType = 'informational' | 'transactional' | 'navigational' | 'commercial_investigation';

export interface SearchIntent {
  type: SearchIntentType;
  preferred_format: string;
  serp_features: string[];
  reasoning: string;
}

// Feature N3: Brief Validation
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

// Feature N4: E-E-A-T Signals
export interface EEATSignals {
  experience: string[];
  expertise: string[];
  authority: string[];
  trust: string[];
  reasoning: string;
}

export interface ContentBrief {
  search_intent?: SearchIntent;  // N1: Search Intent Classification
  page_goal: ReasoningItem<string>;
  target_audience: ReasoningItem<string>;
  keyword_strategy: KeywordStrategy;
  competitor_insights: CompetitorInsights;
  content_gap_analysis: ContentGapAnalysis;
  article_structure: ArticleStructure;
  faqs: FAQs;
  on_page_seo: OnPageSeo;
  eeat_signals?: EEATSignals;  // N4: E-E-A-T Signals
  validation?: BriefValidation;  // N3: Self-Validation
}

// Feature 6: Gemini Model Settings
// Gemini 3: https://ai.google.dev/gemini-api/docs/gemini-3
export type GeminiModel = 'gemini-3-pro-preview' | 'gemini-3-flash-preview' | 'gemini-2.5-pro';
export type ThinkingLevel = 'high' | 'medium' | 'low' | 'minimal';

export interface ModelSettings {
  model: GeminiModel;
  thinkingLevel: ThinkingLevel;
}

// Feature 1 & 2: Template Types
export interface HeadingNode {
  level: 1 | 2 | 3 | 4;
  text: string;
  adaptedText?: string;
  children: HeadingNode[];
  guidelines?: string;
}

export interface ExtractedTemplate {
  sourceUrl: string;
  headingStructure: HeadingNode[];
  extractedAt: Date;
}

// Feature 3: Length Constraints
export interface LengthConstraints {
  globalTarget: number | null;
  sectionTargets: Record<string, number>;
  strictMode: boolean;
}

// Feature 4: Paragraph Feedback
export interface ParagraphFeedback {
  paragraphIndex: number;
  paragraphContent: string;
  userFeedback: string;
}

// Feature 5: Rewrite Actions
export type RewriteAction = 'rewrite' | 'expand' | 'shorten' | 'custom';

// Post-Content Validation Types
export interface ProposedChange {
  id: string;
  type: 'alignment' | 'length' | 'paragraph_length' | 'missing_keyword' | 'structure' | 'tone';
  severity: 'critical' | 'warning' | 'suggestion';
  location: {
    sectionHeading?: string;
    paragraphIndex?: number;
  };
  description: string;
  currentText?: string;
  proposedText?: string;
  reasoning: string;
}

export interface ContentValidationResult {
  overallScore: number;  // 1-100
  scores: {
    briefAlignment: { score: number; explanation: string };
    paragraphLengths: { score: number; explanation: string };
    totalWordCount: { actual: number; target: number; explanation: string };
    keywordUsage: { score: number; explanation: string };
    structureAdherence: { score: number; explanation: string };
  };
  proposedChanges: ProposedChange[];
  summary: string;
}

export interface ValidationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  validationResult?: ContentValidationResult;
}

export interface ValidationState {
  isValidating: boolean;
  isApplyingChanges: boolean;
  validationResult: ContentValidationResult | null;
  conversationHistory: ValidationMessage[];
  selectedChanges: Set<string>;
  showPanel: boolean;
}