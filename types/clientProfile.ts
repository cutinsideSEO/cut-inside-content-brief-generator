// Client Brand Profile Types
// These types define the brand intelligence data stored as JSONB on the clients table

// ============================================
// Union Types for Select Fields
// ============================================

export type IndustryVertical =
  | 'technology'
  | 'ecommerce'
  | 'finance'
  | 'healthcare'
  | 'education'
  | 'travel'
  | 'real_estate'
  | 'food_beverage'
  | 'fashion'
  | 'automotive'
  | 'entertainment'
  | 'sports'
  | 'legal'
  | 'insurance'
  | 'crypto'
  | 'saas'
  | 'agency'
  | 'manufacturing'
  | 'nonprofit'
  | 'other';

export type ToneDescriptor =
  | 'professional'
  | 'casual'
  | 'authoritative'
  | 'friendly'
  | 'witty'
  | 'formal'
  | 'conversational'
  | 'empathetic'
  | 'bold'
  | 'inspiring'
  | 'educational'
  | 'technical'
  | 'playful'
  | 'serious'
  | 'luxurious'
  | 'minimalist';

export type WritingStyle =
  | 'concise'
  | 'detailed'
  | 'storytelling'
  | 'data_driven'
  | 'conversational'
  | 'academic'
  | 'journalistic'
  | 'tutorial';

export type TechnicalLevel =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'expert'
  | 'mixed';

export type AudienceType = 'b2b' | 'b2c' | 'both';

export type ContextFileCategory =
  | 'brand_guidelines'
  | 'style_guide'
  | 'product_info'
  | 'competitor_analysis'
  | 'general';

// ============================================
// Brand Profile Section Interfaces
// ============================================

export interface BrandIdentity {
  brand_name?: string;
  tagline?: string;
  positioning?: string;
  industry?: IndustryVertical;
  website?: string;
  brand_color?: string; // hex color, e.g. "#0D9488"
  logo_url?: string; // URL to brand logo image
}

export interface BrandVoice {
  tone_descriptors?: ToneDescriptor[];
  writing_style?: WritingStyle;
  technical_level?: TechnicalLevel;
  values?: string[];
  usps?: string[]; // unique selling propositions
  personality_traits?: string[];
}

export interface AudiencePersona {
  name: string;
  description?: string;
  pain_points?: string[];
  goals?: string[];
}

export interface TargetAudience {
  audience_type?: AudienceType;
  demographics?: string;
  job_titles?: string[];
  personas?: AudiencePersona[];
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
  known_competitors?: string[]; // competitor URLs
}

export interface OperationalSettings {
  default_model?: string;
  default_thinking_level?: string;
  contact_info?: string;
}

// ============================================
// Client Context File & URL Interfaces
// ============================================

export interface ClientContextFile {
  id: string;
  client_id: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  storage_path: string;
  parsed_content: string | null;
  parse_status: 'pending' | 'parsing' | 'done' | 'error';
  parse_error: string | null;
  category: ContextFileCategory;
  description: string | null;
  created_at: string;
}

export type ClientContextFileInsert = Omit<ClientContextFile, 'id' | 'created_at'>;
export type ClientContextFileUpdate = Partial<Omit<ClientContextFile, 'id' | 'created_at' | 'client_id'>>;

export interface ClientContextUrl {
  id: string;
  client_id: string;
  url: string;
  label: string | null;
  scraped_content: string | null;
  scrape_status: 'pending' | 'scraping' | 'done' | 'error';
  scrape_error: string | null;
  created_at: string;
}

export type ClientContextUrlInsert = Omit<ClientContextUrl, 'id' | 'created_at'>;
export type ClientContextUrlUpdate = Partial<Omit<ClientContextUrl, 'id' | 'created_at' | 'client_id'>>;

// ============================================
// Aggregate Types
// ============================================

export interface ClientProfile {
  brand_identity: BrandIdentity;
  brand_voice: BrandVoice;
  target_audience: TargetAudience;
  content_strategy: ContentStrategy;
  operational_settings: OperationalSettings;
}

export const EMPTY_CLIENT_PROFILE: ClientProfile = {
  brand_identity: {},
  brand_voice: {},
  target_audience: {},
  content_strategy: {},
  operational_settings: {},
};

// ============================================
// Display Label Maps
// ============================================

export const INDUSTRY_LABELS: Record<IndustryVertical, string> = {
  technology: 'Technology',
  ecommerce: 'E-Commerce',
  finance: 'Finance',
  healthcare: 'Healthcare',
  education: 'Education',
  travel: 'Travel',
  real_estate: 'Real Estate',
  food_beverage: 'Food & Beverage',
  fashion: 'Fashion',
  automotive: 'Automotive',
  entertainment: 'Entertainment',
  sports: 'Sports',
  legal: 'Legal',
  insurance: 'Insurance',
  crypto: 'Crypto',
  saas: 'SaaS',
  agency: 'Agency',
  manufacturing: 'Manufacturing',
  nonprofit: 'Nonprofit',
  other: 'Other',
};

export const TONE_LABELS: Record<ToneDescriptor, string> = {
  professional: 'Professional',
  casual: 'Casual',
  authoritative: 'Authoritative',
  friendly: 'Friendly',
  witty: 'Witty',
  formal: 'Formal',
  conversational: 'Conversational',
  empathetic: 'Empathetic',
  bold: 'Bold',
  inspiring: 'Inspiring',
  educational: 'Educational',
  technical: 'Technical',
  playful: 'Playful',
  serious: 'Serious',
  luxurious: 'Luxurious',
  minimalist: 'Minimalist',
};

export const WRITING_STYLE_LABELS: Record<WritingStyle, string> = {
  concise: 'Concise',
  detailed: 'Detailed',
  storytelling: 'Storytelling',
  data_driven: 'Data-Driven',
  conversational: 'Conversational',
  academic: 'Academic',
  journalistic: 'Journalistic',
  tutorial: 'Tutorial',
};

export const TECHNICAL_LEVEL_LABELS: Record<TechnicalLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
  mixed: 'Mixed',
};

export const CONTEXT_FILE_CATEGORY_LABELS: Record<ContextFileCategory, string> = {
  brand_guidelines: 'Brand Guidelines',
  style_guide: 'Style Guide',
  product_info: 'Product Info',
  competitor_analysis: 'Competitor Analysis',
  general: 'General',
};
