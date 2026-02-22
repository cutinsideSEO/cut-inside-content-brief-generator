// Client Profile Completeness Score Calculator
import type { Client } from '../types/database';
import type { ClientContextFile, ClientContextUrl } from '../types/clientProfile';

interface CompletenessResult {
  score: number; // 0-100
  sections: {
    name: string;
    score: number;
    maxScore: number;
    filled: boolean;
  }[];
}

/**
 * Calculate profile completeness score (0-100) based on filled fields.
 */
export function calculateProfileCompleteness(
  client: Client,
  contextFiles?: ClientContextFile[],
  contextUrls?: ClientContextUrl[]
): CompletenessResult {
  const sections: CompletenessResult['sections'] = [];

  // Name (10 points)
  const hasName = !!client.name?.trim();
  sections.push({ name: 'Name', score: hasName ? 10 : 0, maxScore: 10, filled: hasName });

  // Description (10 points)
  const hasDesc = !!client.description?.trim();
  sections.push({ name: 'Description', score: hasDesc ? 10 : 0, maxScore: 10, filled: hasDesc });

  // Industry (10 points)
  const bi = client.brand_identity || {};
  const hasIndustry = !!bi.industry;
  sections.push({ name: 'Industry', score: hasIndustry ? 10 : 0, maxScore: 10, filled: hasIndustry });

  // Website (5 points)
  const hasWebsite = !!bi.website?.trim();
  sections.push({ name: 'Website', score: hasWebsite ? 5 : 0, maxScore: 5, filled: hasWebsite });

  // Brand color (5 points)
  const hasColor = !!bi.brand_color?.trim();
  sections.push({ name: 'Brand Color', score: hasColor ? 5 : 0, maxScore: 5, filled: hasColor });

  // Voice (15 points) — tone, style, or technical level
  const bv = client.brand_voice || {};
  let voiceScore = 0;
  if (bv.tone_descriptors?.length) voiceScore += 5;
  if (bv.writing_style) voiceScore += 5;
  if (bv.technical_level) voiceScore += 5;
  sections.push({ name: 'Voice', score: voiceScore, maxScore: 15, filled: voiceScore > 0 });

  // Audience (10 points) — type, demographics, or personas
  const ta = client.target_audience || {};
  let audienceScore = 0;
  if (ta.audience_type) audienceScore += 4;
  if (ta.demographics?.trim()) audienceScore += 3;
  if (ta.personas?.length) audienceScore += 3;
  sections.push({ name: 'Audience', score: audienceScore, maxScore: 10, filled: audienceScore > 0 });

  // Brand info/positioning (20 points)
  let positioningScore = 0;
  if (bi.positioning?.trim()) positioningScore += 10;
  if (bi.tagline?.trim()) positioningScore += 5;
  if (bv.usps?.length) positioningScore += 5;
  sections.push({ name: 'Positioning', score: positioningScore, maxScore: 20, filled: positioningScore > 0 });

  // Content guidelines (5 points) — dos, donts, or banned terms
  const cs = client.content_strategy || {};
  let guidelinesScore = 0;
  if (cs.content_dos?.length || cs.content_donts?.length) guidelinesScore += 3;
  if (cs.banned_terms?.length || cs.preferred_terms?.length) guidelinesScore += 2;
  sections.push({ name: 'Guidelines', score: guidelinesScore, maxScore: 5, filled: guidelinesScore > 0 });

  // Context files/URLs (5 points)
  const hasFiles = (contextFiles?.length || 0) > 0;
  const hasUrls = (contextUrls?.length || 0) > 0;
  const contextScore = (hasFiles ? 3 : 0) + (hasUrls ? 2 : 0);
  sections.push({ name: 'Context', score: contextScore, maxScore: 5, filled: hasFiles || hasUrls });

  // Competitors (5 points)
  const hasCompetitors = (cs.known_competitors?.length || 0) > 0;
  sections.push({ name: 'Competitors', score: hasCompetitors ? 5 : 0, maxScore: 5, filled: hasCompetitors });

  const totalScore = sections.reduce((sum, s) => sum + s.score, 0);

  return { score: totalScore, sections };
}

/**
 * Check if a client has meaningful brand context (score >= 30).
 */
export function hasSignificantBrandContext(client: Client): boolean {
  const { score } = calculateProfileCompleteness(client);
  return score >= 30;
}
