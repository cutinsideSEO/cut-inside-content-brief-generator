// Brand Context Builder - Aggregates and formats brand context for AI consumption
import type { ClientProfile, ClientContextFile, ClientContextUrl } from '../types/clientProfile';
import type { Client } from '../types/database';
import {
  INDUSTRY_LABELS,
  TONE_LABELS,
  WRITING_STYLE_LABELS,
  TECHNICAL_LEVEL_LABELS,
} from '../types/clientProfile';

/**
 * Build the full brand context string from client profile data.
 * Used as the primary brand context for AI consumption.
 */
export function buildBrandContext(
  client: Client,
  contextFiles?: ClientContextFile[],
  contextUrls?: ClientContextUrl[]
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
      // Limit each file to ~1500 chars to stay within token budget
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
 * Brief-level info supplements client context — it doesn't replace it.
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

  // Cap at ~28K chars (~7K tokens)
  const maxChars = 28000;
  const truncated = mergedContext.length > maxChars
    ? mergedContext.slice(0, maxChars) + '\n... [brand context truncated for token budget]'
    : mergedContext;

  return truncated;
}

/**
 * Format brand context for article generation (voice/tone/guidelines only, ~2K tokens max).
 * Strips reference documents and URL content.
 */
export function formatForArticleGeneration(client: Client): string {
  const parts: string[] = [];

  const bi = client.brand_identity;
  const bv = client.brand_voice;
  const cs = client.content_strategy;

  if (bi?.brand_name) parts.push(`Brand: ${bi.brand_name}`);
  if (bi?.positioning) parts.push(`Positioning: ${bi.positioning}`);

  if (bv?.tone_descriptors?.length) {
    parts.push(`Tone: ${bv.tone_descriptors.map(t => TONE_LABELS[t] || t).join(', ')}`);
  }
  if (bv?.writing_style) {
    parts.push(`Style: ${WRITING_STYLE_LABELS[bv.writing_style] || bv.writing_style}`);
  }
  if (bv?.technical_level) {
    parts.push(`Technical Level: ${TECHNICAL_LEVEL_LABELS[bv.technical_level] || bv.technical_level}`);
  }
  if (bv?.personality_traits?.length) {
    parts.push(`Personality: ${bv.personality_traits.join(', ')}`);
  }
  if (bv?.usps?.length) {
    parts.push(`USPs: ${bv.usps.join('; ')}`);
  }

  if (cs?.content_dos?.length) {
    parts.push(`DO: ${cs.content_dos.join('; ')}`);
  }
  if (cs?.content_donts?.length) {
    parts.push(`DON'T: ${cs.content_donts.join('; ')}`);
  }
  if (cs?.banned_terms?.length) {
    parts.push(`Banned Terms: ${cs.banned_terms.join(', ')}`);
  }
  if (cs?.preferred_terms?.length) {
    parts.push(`Preferred Terms: ${cs.preferred_terms.join(', ')}`);
  }

  if (parts.length === 0) return '';

  // Cap at ~8K chars (~2K tokens)
  const result = parts.join('\n');
  return result.slice(0, 8000);
}

/**
 * Format brand context for the article optimizer (concise voice summary, ~1K tokens max).
 */
export function formatForOptimizer(client: Client): string {
  const parts: string[] = [];

  const bv = client.brand_voice;
  const cs = client.content_strategy;

  if (bv?.tone_descriptors?.length) {
    parts.push(`Tone: ${bv.tone_descriptors.map(t => TONE_LABELS[t] || t).join(', ')}`);
  }
  if (bv?.writing_style) {
    parts.push(`Style: ${WRITING_STYLE_LABELS[bv.writing_style] || bv.writing_style}`);
  }
  if (cs?.content_donts?.length) {
    parts.push(`Avoid: ${cs.content_donts.join('; ')}`);
  }
  if (cs?.banned_terms?.length) {
    parts.push(`Banned: ${cs.banned_terms.join(', ')}`);
  }

  if (parts.length === 0) return '';

  return parts.join('\n').slice(0, 4000);
}
