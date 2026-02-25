// Shared generation configuration for Gemini API
// Ported from frontend services/geminiService.ts and constants.ts

import type { GeminiModel, ThinkingLevel } from './types.ts';

// ============================================
// Thinking Budget Constants
// ============================================

/** Thinking budget for article section generation */
export const ARTICLE_THINKING_BUDGET = 8192;

/** Thinking budget for article optimizer (chat-based rewrite) */
export const ARTICLE_OPTIMIZER_THINKING_BUDGET = 8192;

/** Word count threshold for chunked content validation */
export const VALIDATION_CHUNK_THRESHOLD = 8000;

// ============================================
// Recommended Thinking Levels per Step
// ============================================

/**
 * Default thinking levels per brief generation step.
 * These can be overridden by user model settings.
 */
export const THINKING_LEVEL_BY_STEP: Record<number, ThinkingLevel> = {
  1: 'high',    // Page Goal & Audience - benefits from deep reasoning
  2: 'high',    // Keyword Strategy - needs comprehensive analysis
  3: 'high',    // Competitor Analysis - complex reasoning
  4: 'high',    // Content Gap Analysis - deep reasoning
  5: 'high',    // Article Structure - complex outline generation
  6: 'medium',  // FAQ Generation - simpler task
  7: 'low',     // On-Page SEO - straightforward optimization
};

// ============================================
// Thinking Budget Mapping
// ============================================

/** Maps ThinkingLevel to token budget */
const THINKING_BUDGET_MAP: Record<ThinkingLevel, number> = {
  high: 24576,
  medium: 8192,
  low: 2048,
  minimal: 1024,
};

// ============================================
// Config Builder
// ============================================

/**
 * Gets the appropriate thinking level for a brief step.
 * Uses per-step defaults, falling back to the model's global level.
 */
export function getThinkingLevelForStep(step: number, globalLevel: ThinkingLevel): ThinkingLevel {
  return THINKING_LEVEL_BY_STEP[step] || globalLevel;
}

/**
 * Builds the Gemini API generation config for a brief step.
 *
 * @param model - The Gemini model to use
 * @param step - The brief step number (1-7)
 * @param thinkingLevel - The thinking level for this step
 * @param schema - Optional JSON response schema for structured output
 * @returns Config object ready for the Gemini API generationConfig field
 */
export function buildGenerationConfig(
  model: GeminiModel,
  step: number,
  thinkingLevel: ThinkingLevel,
  schema?: object
): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  // Add thinking config for Gemini 3 models (supports thinkingBudget)
  if (model.includes('gemini-3')) {
    // 'minimal' is only available for Flash model — still use minimal budget (1024)
    if (thinkingLevel === 'minimal' && !model.includes('flash')) {
      config.thinkingConfig = { thinkingBudget: THINKING_BUDGET_MAP.minimal };
    } else {
      config.thinkingConfig = { thinkingBudget: THINKING_BUDGET_MAP[thinkingLevel] };
    }
  }

  if (schema) {
    config.responseMimeType = 'application/json';
    config.responseSchema = schema;
  }

  return config;
}

/**
 * Builds the Gemini API generation config for article section generation.
 *
 * Unlike brief steps, article generation uses a fixed thinking budget
 * ({@link ARTICLE_THINKING_BUDGET}) regardless of the user's thinking-level
 * preference. This is intentional: article sections require consistent,
 * high-quality prose output and should not be degraded by a lower thinking
 * setting that the user may have chosen to speed up brief generation.
 *
 * The {@link ArticleSectionParams} interface still carries a `thinkingLevel`
 * field for type consistency with the job queue, but it is intentionally
 * ignored here -- only `model` is used.
 */
export function buildArticleGenerationConfig(model: GeminiModel): Record<string, unknown> {
  const config: Record<string, unknown> = {};

  if (model.includes('gemini-3')) {
    config.thinkingConfig = { thinkingBudget: ARTICLE_THINKING_BUDGET };
  }

  return config;
}
