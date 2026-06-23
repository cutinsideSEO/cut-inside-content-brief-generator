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

const TRUNCATION_SUFFIX = '... [truncated]';

/**
 * Truncates competitor Full_Text fields to fit within a token budget.
 * Targets ~90% of the budget and accounts for the per-competitor suffix plus
 * non-text JSON fields so the result stays conservatively UNDER maxTokens.
 */
export function truncateCompetitorText(json: string, maxTokens = 150000): string {
  const est = estimateTokens(json);
  if (est <= maxTokens) return json;
  // Aim under the cap to leave headroom for suffixes, JSON punctuation, and
  // non-text fields the proportional ratio doesn't shrink.
  const targetTokens = Math.floor(maxTokens * 0.9);
  try {
    const data = JSON.parse(json);
    const ratio = targetTokens / est;
    for (const c of data) {
      if (c.Full_Text) {
        // Reserve room for the appended suffix so it can't push us back over.
        const allowed = Math.max(0, Math.floor(c.Full_Text.length * ratio) - TRUNCATION_SUFFIX.length);
        c.Full_Text = c.Full_Text.slice(0, allowed) + TRUNCATION_SUFFIX;
      }
    }
    let result = JSON.stringify(data);
    // Belt-and-suspenders: if the re-serialized JSON still exceeds the budget
    // (e.g. many competitors with large non-text fields), hard-cap it.
    if (estimateTokens(result) > maxTokens) {
      result = result.slice(0, targetTokens * 4);
    }
    return result;
  } catch {
    return json.slice(0, targetTokens * 4);
  }
}

// ============================================
// Brand Voice Sample Extraction
// ============================================

/** Max characters of representative prose used as a voice sample. */
const VOICE_SAMPLE_MAX_CHARS = 600;
/** Minimum characters required before we bother emitting a voice sample. */
const VOICE_SAMPLE_MIN_CHARS = 120;
/** Hard cap on how far into the raw text we scan looking for body prose. */
const VOICE_SAMPLE_SCAN_LIMIT = 6000;

/**
 * Heuristic: does a single line look like real body prose (a sentence) rather
 * than navigation/boilerplate (menu items, button labels, cookie notices)?
 * We treat a line as prose when it is reasonably long and contains
 * sentence-ending punctuation — cheap but effective at skipping nav/chrome.
 */
function looksLikeProse(line: string): boolean {
  const t = line.trim();
  if (t.length < 60) return false; // nav links / labels are short
  if (!/[.!?…]/.test(t)) return false; // a sentence has terminal punctuation
  // Skip obvious cookie/legal/nav chrome that can still be long.
  if (/\b(cookie|privacy policy|terms of service|all rights reserved|sign in|log in|subscribe|menu|navigation)\b/i.test(t)) {
    return false;
  }
  // Skip lines that are mostly a list of short, capitalized nav words.
  const words = t.split(/\s+/);
  const shortCapWords = words.filter((w) => /^[A-Z][a-z]{0,3}$/.test(w)).length;
  if (words.length > 0 && shortCapWords / words.length > 0.6) return false;
  return true;
}

/**
 * Extracts a SHORT representative prose excerpt from raw scraped/parsed body
 * copy, skipping obvious nav/boilerplate at the very start. Returns '' when no
 * usable prose is found (graceful no-op). Token-bounded via
 * {@link VOICE_SAMPLE_MAX_CHARS}.
 *
 * Strategy: scan the first {@link VOICE_SAMPLE_SCAN_LIMIT} chars line-by-line,
 * find the first line that {@link looksLikeProse}, then accumulate following
 * prose until the char cap. Falls back to a mid-document slice (past the typical
 * header region) when no clean prose line is detected.
 */
function extractVoiceSample(rawText: string): string {
  const text = (rawText || '').trim();
  if (text.length < VOICE_SAMPLE_MIN_CHARS) return '';

  const scanRegion = text.slice(0, VOICE_SAMPLE_SCAN_LIMIT);
  const lines = scanRegion.split(/\r?\n/);

  const collected: string[] = [];
  let started = false;
  let chars = 0;
  for (const line of lines) {
    const t = line.trim();
    if (!started) {
      if (!looksLikeProse(t)) continue; // skip leading boilerplate
      started = true;
    } else if (!t) {
      // A blank line after we've collected enough ends the excerpt cleanly.
      if (chars >= VOICE_SAMPLE_MIN_CHARS) break;
      continue;
    }
    collected.push(t);
    chars += t.length + 1;
    if (chars >= VOICE_SAMPLE_MAX_CHARS) break;
  }

  let sample = collected.join(' ').replace(/\s+/g, ' ').trim();

  // Fallback: no clean prose line found (e.g. text has no newlines, or is one
  // long boilerplate-then-body blob). Skip a typical header region and slice.
  if (sample.length < VOICE_SAMPLE_MIN_CHARS) {
    const flat = text.replace(/\s+/g, ' ').trim();
    if (flat.length < VOICE_SAMPLE_MIN_CHARS) return '';
    const skip = flat.length > 400 ? 200 : 0; // jump past likely header/nav blob
    sample = flat.slice(skip);
  }

  if (sample.length <= VOICE_SAMPLE_MAX_CHARS) return sample;
  // Trim to the cap on a sentence boundary if possible, else a word boundary.
  const slice = sample.slice(0, VOICE_SAMPLE_MAX_CHARS);
  const lastSentence = Math.max(slice.lastIndexOf('. '), slice.lastIndexOf('! '), slice.lastIndexOf('? '));
  if (lastSentence > VOICE_SAMPLE_MAX_CHARS * 0.5) {
    return slice.slice(0, lastSentence + 1);
  }
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > VOICE_SAMPLE_MAX_CHARS * 0.5 ? slice.slice(0, lastSpace) : slice) + '…';
}

/**
 * Picks the single best voice sample across all available context files and
 * URLs (first one that yields a usable prose excerpt). Files are preferred over
 * URLs because uploaded brand docs tend to be cleaner body copy than scraped
 * pages. Returns '' when nothing usable is found.
 */
function buildVoiceSampleBlock(
  contextFiles?: ContextFileData[],
  contextUrls?: ContextUrlData[],
): string {
  const candidates: string[] = [];
  for (const f of contextFiles || []) {
    if (f.parse_status === 'done' && f.parsed_content) candidates.push(f.parsed_content);
  }
  for (const u of contextUrls || []) {
    if (u.scrape_status === 'done' && u.scraped_content) candidates.push(u.scraped_content);
  }

  for (const raw of candidates) {
    const sample = extractVoiceSample(raw);
    if (sample) {
      return `**Write in a voice matching this sample (mirror its tone, sentence rhythm, and vocabulary — do NOT copy its content):**\n"${sample}"`;
    }
  }
  return '';
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

  // Brand voice sample (short representative PROSE excerpt of real body copy).
  // Labels above tell the model WHAT the voice is; this shows it BY EXAMPLE.
  // Token-bounded and additive — never replaces the label-based context.
  const voiceSampleBlock = buildVoiceSampleBlock(contextFiles, contextUrls);
  if (voiceSampleBlock) {
    sections.push(voiceSampleBlock);
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
