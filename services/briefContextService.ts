import type { ContentBrief, CompetitorPage, CompetitorSummary } from '../types';

/**
 * Strips all .reasoning fields from brief to reduce context size ~40%
 * while preserving all substantive data for the writer AI.
 *
 * The reasoning fields are useful for users to understand AI decisions
 * but are not needed when passing the brief to the content writer.
 */
export function stripReasoningFromBrief(brief: Partial<ContentBrief>): Partial<ContentBrief> {
  return JSON.parse(JSON.stringify(brief, (key, value) => {
    // Remove reasoning fields but keep everything else
    if (key === 'reasoning') return undefined;
    return value;
  }));
}

/**
 * Counts words in a text string.
 * Used for word count tracking during content generation.
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Strips Full_Text from competitor data to reduce token usage.
 * Used for steps that don't need full competitor text (1, 2, 6, 7).
 */
export function stripCompetitorFullText(competitors: CompetitorPage[]): CompetitorSummary[] {
  return competitors.map(({ Full_Text, ...rest }) => rest);
}

/**
 * Rough token estimate based on character count (1 token ≈ 4 chars).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Checks if text exceeds token budgets. Returns true if over hard limit.
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
