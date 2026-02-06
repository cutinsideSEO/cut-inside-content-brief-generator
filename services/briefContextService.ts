import type { ContentBrief } from '../types';

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
