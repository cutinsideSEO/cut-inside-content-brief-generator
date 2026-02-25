// Shared context preparation functions for Edge Functions
// Ported from frontend services/briefContextService.ts and services/brandContextBuilder.ts
// All pure functions with no browser dependencies

import type {
  ContentBrief,
  CompetitorPage,
  CompetitorSummary,
  ClientBrandData,
  ContextFileData,
  ContextUrlData,
} from './types.ts';

// ============================================
// Display Label Maps (for brand context formatting)
// ============================================

const INDUSTRY_LABELS: Record<string, string> = {
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

const TONE_LABELS: Record<string, string> = {
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

const WRITING_STYLE_LABELS: Record<string, string> = {
  concise: 'Concise',
  detailed: 'Detailed',
  storytelling: 'Storytelling',
  data_driven: 'Data-Driven',
  conversational: 'Conversational',
  academic: 'Academic',
  journalistic: 'Journalistic',
  tutorial: 'Tutorial',
};

const TECHNICAL_LEVEL_LABELS: Record<string, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
  expert: 'Expert',
  mixed: 'Mixed',
};

// ============================================
// Brief Context Functions
// ============================================

/**
 * Strips all .reasoning fields from brief to reduce context size ~40%
 * while preserving all substantive data for the writer AI.
 */
export function stripReasoningFromBrief(brief: Partial<ContentBrief>): Partial<ContentBrief> {
  return JSON.parse(JSON.stringify(brief, (key, value) => {
    if (key === 'reasoning') return undefined;
    return value;
  }));
}

/**
 * Counts words in a text string.
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Strips Full_Text from competitor data to reduce token usage.
 * Used for steps that don't need full competitor text.
 */
export function stripCompetitorFullText(competitors: CompetitorPage[]): CompetitorSummary[] {
  return competitors.map(({ Full_Text, ...rest }) => rest);
}

/**
 * Rough token estimate based on character count (1 token ~ 4 chars).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Checks if text exceeds token budgets. Logs warnings/errors.
 * @returns true if over hard limit
 */
export function checkTokenBudget(label: string, text: string, warnAt = 200000, hardLimit = 900000): boolean {
  const tokens = estimateTokens(text);
  if (tokens > hardLimit) {
    console.error(`[TOKENS] ${label}: ~${tokens} tokens OVER hard limit`);
    return true;
  }
  if (tokens > warnAt) {
    console.warn(`[TOKENS] ${label}: ~${tokens} tokens (warn at ${warnAt})`);
  }
  return false;
}

/**
 * Truncates competitor Full_Text fields to fit within a token budget.
 */
export function truncateCompetitorText(json: string, maxTokens = 150000): string {
  const est = estimateTokens(json);
  if (est <= maxTokens) return json;
  try {
    const data = JSON.parse(json);
    const ratio = maxTokens / est;
    for (const c of data) {
      if (c.Full_Text) {
        c.Full_Text = c.Full_Text.slice(0, Math.floor(c.Full_Text.length * ratio)) + '... [truncated]';
      }
    }
    return JSON.stringify(data);
  } catch {
    return json.slice(0, maxTokens * 4);
  }
}

// ============================================
// Brand Context Functions
// ============================================

/**
 * Build the full brand context string from client profile data.
 * Used as the primary brand context for AI consumption.
 */
export function buildBrandContext(
  client: ClientBrandData,
  contextFiles?: ContextFileData[],
  contextUrls?: ContextUrlData[]
): string {
  const sections: string[] = [];

  const bi = client.brand_identity;
  const bv = client.brand_voice;
  const ta = client.target_audience;
  const cs = client.content_strategy;

  // Brand Identity
  const identityParts: string[] = [];
  if (bi?.brand_name) identityParts.push(`Brand: ${bi.brand_name}`);
  if (bi?.tagline) identityParts.push(`Tagline: "${bi.tagline}"`);
  if (bi?.positioning) identityParts.push(`Positioning: ${bi.positioning}`);
  if (bi?.industry) identityParts.push(`Industry: ${INDUSTRY_LABELS[bi.industry] || bi.industry}`);
  if (bi?.website) identityParts.push(`Website: ${bi.website}`);
  if (identityParts.length > 0) {
    sections.push(`**Brand Identity:**\n${identityParts.join('\n')}`);
  }

  // Brand Voice
  const voiceParts: string[] = [];
  if (bv?.tone_descriptors?.length) {
    voiceParts.push(`Tone: ${bv.tone_descriptors.map(t => TONE_LABELS[t] || t).join(', ')}`);
  }
  if (bv?.writing_style) {
    voiceParts.push(`Writing Style: ${WRITING_STYLE_LABELS[bv.writing_style] || bv.writing_style}`);
  }
  if (bv?.technical_level) {
    voiceParts.push(`Technical Level: ${TECHNICAL_LEVEL_LABELS[bv.technical_level] || bv.technical_level}`);
  }
  if (bv?.personality_traits?.length) {
    voiceParts.push(`Personality: ${bv.personality_traits.join(', ')}`);
  }
  if (bv?.values?.length) {
    voiceParts.push(`Brand Values: ${bv.values.join(', ')}`);
  }
  if (bv?.usps?.length) {
    voiceParts.push(`USPs: ${bv.usps.join('; ')}`);
  }
  if (voiceParts.length > 0) {
    sections.push(`**Brand Voice & Tone:**\n${voiceParts.join('\n')}`);
  }

  // Target Audience
  const audienceParts: string[] = [];
  if (ta?.audience_type) {
    audienceParts.push(`Type: ${ta.audience_type.toUpperCase()}`);
  }
  if (ta?.demographics) {
    audienceParts.push(`Demographics: ${ta.demographics}`);
  }
  if (ta?.job_titles?.length) {
    audienceParts.push(`Job Titles: ${ta.job_titles.join(', ')}`);
  }
  if (ta?.personas?.length) {
    const personaSummaries = ta.personas.map(p => {
      let s = `- ${p.name}`;
      if (p.description) s += `: ${p.description}`;
      if (p.pain_points?.length) s += `\n  Pain Points: ${p.pain_points.join('; ')}`;
      if (p.goals?.length) s += `\n  Goals: ${p.goals.join('; ')}`;
      return s;
    });
    audienceParts.push(`Personas:\n${personaSummaries.join('\n')}`);
  }
  if (audienceParts.length > 0) {
    sections.push(`**Target Audience:**\n${audienceParts.join('\n')}`);
  }

  // Content Strategy
  const strategyParts: string[] = [];
  if (cs?.content_dos?.length) {
    strategyParts.push(`DO: ${cs.content_dos.join('; ')}`);
  }
  if (cs?.content_donts?.length) {
    strategyParts.push(`DON'T: ${cs.content_donts.join('; ')}`);
  }
  if (cs?.banned_terms?.length) {
    strategyParts.push(`Banned Terms: ${cs.banned_terms.join(', ')}`);
  }
  if (cs?.preferred_terms?.length) {
    strategyParts.push(`Preferred Terms: ${cs.preferred_terms.join(', ')}`);
  }
  if (cs?.seo_guidelines) {
    strategyParts.push(`SEO Guidelines: ${cs.seo_guidelines}`);
  }
  if (cs?.known_competitors?.length) {
    strategyParts.push(`Known Competitors: ${cs.known_competitors.join(', ')}`);
  }
  if (strategyParts.length > 0) {
    sections.push(`**Content Strategy:**\n${strategyParts.join('\n')}`);
  }

  // Context files (parsed content summaries)
  const parsedFiles = contextFiles?.filter(f => f.parse_status === 'done' && f.parsed_content);
  if (parsedFiles && parsedFiles.length > 0) {
    const fileTexts = parsedFiles.map(f => {
      const label = f.description || f.file_name;
      const content = f.parsed_content!.slice(0, 1500);
      return `[${label}]: ${content}${f.parsed_content!.length > 1500 ? '... [truncated]' : ''}`;
    });
    sections.push(`**Brand Reference Documents:**\n${fileTexts.join('\n\n')}`);
  }

  // Context URLs (scraped content summaries)
  const scrapedUrls = contextUrls?.filter(u => u.scrape_status === 'done' && u.scraped_content);
  if (scrapedUrls && scrapedUrls.length > 0) {
    const urlTexts = scrapedUrls.map(u => {
      const label = u.label || u.url;
      const content = u.scraped_content!.slice(0, 1000);
      return `[${label}]: ${content}${u.scraped_content!.length > 1000 ? '... [truncated]' : ''}`;
    });
    sections.push(`**Brand Reference URLs:**\n${urlTexts.join('\n\n')}`);
  }

  if (sections.length === 0) {
    return '';
  }

  return sections.join('\n\n');
}

/**
 * Merge client-level brand context with brief-level brand info.
 * Brief-level info supplements client context -- it doesn't replace it.
 */
export function mergeBrandContext(clientContext: string, briefLevelBrandInfo?: string): string {
  if (!clientContext && !briefLevelBrandInfo) return '';
  if (!clientContext) return briefLevelBrandInfo || '';
  if (!briefLevelBrandInfo?.trim()) return clientContext;

  return `${clientContext}\n\n**Brief-Specific Notes:**\n${briefLevelBrandInfo}`;
}

/**
 * Format brand context for brief generation steps (full context, ~7K tokens max).
 */
export function formatForBriefGeneration(mergedContext: string): string {
  if (!mergedContext) return '';

  const maxChars = 28000;
  const truncated = mergedContext.length > maxChars
    ? mergedContext.slice(0, maxChars) + '\n... [brand context truncated for token budget]'
    : mergedContext;

  return truncated;
}
