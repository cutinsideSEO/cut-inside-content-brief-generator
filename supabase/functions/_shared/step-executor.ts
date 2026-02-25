// Main step execution logic for Edge Functions
// Ported from frontend services/geminiService.ts — generateBriefStep() and generateHierarchicalArticleStructure()

import type {
  ContentBrief,
  ArticleStructure,
  OutlineItem,
  HeadingNode,
  LengthConstraints,
  GeminiModel,
  ThinkingLevel,
  StepExecutionParams,
} from './types.ts';

import { getSystemPrompt, getStructureEnrichmentPrompt, getStructureResourceAnalysisPrompt, getLengthConstraintPrompt } from './prompts.ts';
import { getSchemaForStep } from './schemas.ts';
import { buildGenerationConfig, getThinkingLevelForStep } from './generation-config.ts';
import { callGeminiDirect, retryOperation, type GeminiCallConfig } from './gemini-client.ts';
import { truncateCompetitorText, checkTokenBudget } from './brief-context.ts';

// ============================================
// Outline Normalization Helper
// ============================================

/**
 * Ensures every node in the outline has a `children` array.
 * Gemini may omit empty children arrays.
 */
function normalizeOutline(items: OutlineItem[]): OutlineItem[] {
  if (!items) return [];
  return items.map(item => {
    const normalizedItem = { ...item };
    if (!normalizedItem.children) {
      normalizedItem.children = [];
    } else {
      normalizedItem.children = normalizeOutline(normalizedItem.children);
    }
    return normalizedItem;
  });
}

// ============================================
// Step 5: Hierarchical Article Structure (3-phase)
// ============================================

/**
 * Generates the article structure using a 3-phase approach:
 * 1. Core skeleton (headings + reasoning)
 * 2. Enrichment (guidelines, keywords, competitor coverage)
 * 3. Resource analysis (additional non-text resources)
 *
 * This mirrors the frontend's generateHierarchicalArticleStructure().
 */
async function generateHierarchicalArticleStructure(params: StepExecutionParams): Promise<{ article_structure: ArticleStructure }> {
  const {
    competitorData,
    subjectInfo,
    brandInfo,
    previousStepsData,
    userFeedback,
    isRegeneration,
    groundTruthText,
    language,
    lengthConstraints,
    templateHeadings,
    model,
    thinkingLevel,
  } = params;

  const competitorDataJson = JSON.stringify(competitorData);
  const schema = getSchemaForStep(5);
  const effectiveThinkingLevel = getThinkingLevelForStep(5, thinkingLevel);
  const genConfig = buildGenerationConfig(model, 5, effectiveThinkingLevel, schema);

  // Part 1: Generate the core structure (skeleton)
  const structureSystemInstruction = getSystemPrompt(5, language, isRegeneration);

  let regenerationContext = '';
  if (isRegeneration && previousStepsData.article_structure) {
    const skeletonForRegen = JSON.parse(JSON.stringify(previousStepsData.article_structure));
    const clearEnrichment = (items: OutlineItem[]) => {
      if (!items) return;
      items.forEach(item => {
        item.guidelines = [];
        item.targeted_keywords = [];
        item.competitor_coverage = [];
        if (item.children) clearEnrichment(item.children);
      });
    };
    clearEnrichment(skeletonForRegen.outline);

    regenerationContext = `
      **Original JSON for this step (modify this based on feedback):**
      ${JSON.stringify({ article_structure: skeletonForRegen }, null, 2)}
    `;
  }

  // Template heading structure support
  let templateContext = '';
  if (templateHeadings && templateHeadings.length > 0) {
    templateContext = `
      **IMPORTANT: Use this heading structure as your foundation, adapting it to the current topic:**
      ${JSON.stringify(templateHeadings, null, 2)}

      You may add or adjust headings as needed based on the competitor analysis and content gaps, but preserve the overall structure as much as possible.
    `;
  }

  // Length constraints support
  const lengthContext = lengthConstraints ? getLengthConstraintPrompt(lengthConstraints.globalTarget) : '';

  const basePrompt = `
      ${regenerationContext}
      ${templateContext}
      ${lengthContext}

      ${groundTruthText ? `**"Ground Truth" Competitor Text (Full text from top 3 competitors):**\n${groundTruthText}` : ''}

      **Competitor Data:**
      ${competitorDataJson}

      **User-Provided Subject Matter Context:**
      ${subjectInfo || "Not provided."}

      **User-Provided Brand Information:**
      ${brandInfo || "Not provided."}

      **Results from Previous Steps (use this as context):**
      ${JSON.stringify(previousStepsData, null, 2)}

      ${userFeedback ? `**User Feedback for this step (incorporate this):**\n${userFeedback}` : ''}
  `;

  // PHASE 1: Structure Skeleton
  const initialStructure = await retryOperation(async () => {
    const response = await callGeminiDirect(
      model,
      `${basePrompt}\nPlease generate the JSON for step 5, part 1 (the core structure only).`,
      {
        systemInstruction: structureSystemInstruction,
        responseMimeType: 'application/json',
        responseSchema: schema,
        ...(genConfig.thinkingConfig ? { thinkingConfig: genConfig.thinkingConfig as { thinkingBudget: number } } : {}),
      }
    );
    const text = response.text;
    if (!text) throw new Error("Received an empty response from the AI for structure generation (Part 1).");
    return JSON.parse(text);
  });

  // PHASE 2: Enrichment
  const enrichmentSystemInstruction = getStructureEnrichmentPrompt(language);
  const enrichmentPrompt = `
      **Full Context from Previous Steps:**
      ${JSON.stringify(previousStepsData, null, 2)}

      **Core Article Outline to Enhance (JSON):**
      ${JSON.stringify(initialStructure, null, 2)}

      **Original Competitor Data:**
      ${competitorDataJson}

      ${groundTruthText ? `**"Ground Truth" Competitor Text:**\n${groundTruthText}` : ''}

      ${userFeedback ? `**User Feedback:**\n${userFeedback}` : ''}

      **Task:** Please enrich the 'guidelines', 'targeted_keywords', and 'competitor_coverage' fields.
  `;

  const enrichedStructure = await retryOperation(async () => {
    const response = await callGeminiDirect(
      model,
      enrichmentPrompt,
      {
        systemInstruction: enrichmentSystemInstruction,
        responseMimeType: 'application/json',
        responseSchema: schema,
        ...(genConfig.thinkingConfig ? { thinkingConfig: genConfig.thinkingConfig as { thinkingBudget: number } } : {}),
      }
    );
    const text = response.text;
    if (!text) throw new Error("Received an empty response from the AI for structure enrichment (Part 2).");
    return JSON.parse(text);
  });

  // PHASE 3: Resource Analysis (with fallback)
  const resourceAnalysisSystemInstruction = getStructureResourceAnalysisPrompt(language);
  const resourceAnalysisPrompt = `
      **Fully Enriched Article Outline (JSON):**
      ${JSON.stringify(enrichedStructure, null, 2)}

      **Task:** Identify necessary non-textual resources based on the guidelines.
  `;

  try {
    const finalStructure = await retryOperation(async () => {
      const response = await callGeminiDirect(
        model,
        resourceAnalysisPrompt,
        {
          systemInstruction: resourceAnalysisSystemInstruction,
          responseMimeType: 'application/json',
          responseSchema: schema,
          ...(genConfig.thinkingConfig ? { thinkingConfig: genConfig.thinkingConfig as { thinkingBudget: number } } : {}),
        }
      );
      const text = response.text;
      if (!text) throw new Error("Received empty response for resource analysis.");
      return JSON.parse(text);
    }, 2, 1000); // Fewer retries for this non-critical step

    if (finalStructure.article_structure?.outline) {
      finalStructure.article_structure.outline = normalizeOutline(finalStructure.article_structure.outline);
    }
    return finalStructure;

  } catch (err) {
    console.warn("Resource analysis step failed after retries. Returning structure without additional resources.", err);
    const finalStructure = enrichedStructure;
    if (finalStructure.article_structure?.outline) {
      finalStructure.article_structure.outline = normalizeOutline(finalStructure.article_structure.outline);
    }
    return finalStructure;
  }
}

// ============================================
// Main Step Executor
// ============================================

/**
 * Executes a single brief generation step (1-7).
 * This is the main entry point for the worker Edge Function.
 *
 * - Steps 1-4, 6-7: Single Gemini call with appropriate schema
 * - Step 5: 3-phase hierarchical structure generation
 *
 * @param params - All parameters needed for generation
 * @returns The generated brief data for the step
 */
export async function executeBriefStep(params: StepExecutionParams): Promise<Partial<ContentBrief>> {
  const {
    step,
    competitorData,
    subjectInfo,
    brandInfo,
    previousStepsData,
    groundTruthText,
    userFeedback,
    availableKeywords,
    isRegeneration,
    language,
    lengthConstraints,
    paaQuestions,
    model,
    thinkingLevel,
  } = params;

  try {
    // Step 5 uses the 3-phase hierarchical approach
    if (step === 5) {
      return await generateHierarchicalArticleStructure(params);
    }

    const systemInstruction = getSystemPrompt(step, language, isRegeneration);
    const schema = getSchemaForStep(step);
    const effectiveThinkingLevel = getThinkingLevelForStep(step, thinkingLevel);

    // Step-specific context
    let stepSpecificContext = '';
    if (step === 2 && availableKeywords && availableKeywords.length > 0) {
      stepSpecificContext = `
        **Available Keywords to use (You MUST choose from this list and categorize ALL of them):**
        ${JSON.stringify(availableKeywords, null, 2)}
      `;
    }

    // Add PAA questions to Step 6 (FAQ generation)
    if (step === 6 && paaQuestions && paaQuestions.length > 0) {
      stepSpecificContext += `
        **IMPORTANT: "People Also Ask" Questions from Google SERPs:**
        These questions appeared in Google's "People Also Ask" boxes for our target keywords.
        These are PROVEN questions that users are actively searching for.
        PRIORITIZE including as many of these as relevant in your FAQ generation:

        ${paaQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

        When selecting FAQs, use these PAA questions first, then supplement with additional relevant questions
        based on competitor analysis and the content gap analysis.
      `;
    }

    // Regeneration context
    let regenerationContext = '';
    if (isRegeneration) {
      let currentStepData: Partial<ContentBrief> = {};
      switch (step) {
        case 1: currentStepData = { page_goal: previousStepsData.page_goal, target_audience: previousStepsData.target_audience }; break;
        case 2: currentStepData = { keyword_strategy: previousStepsData.keyword_strategy }; break;
        case 3: currentStepData = { competitor_insights: previousStepsData.competitor_insights }; break;
        case 4: currentStepData = { content_gap_analysis: previousStepsData.content_gap_analysis }; break;
        case 6: currentStepData = { faqs: previousStepsData.faqs }; break;
        case 7: currentStepData = { on_page_seo: previousStepsData.on_page_seo }; break;
      }

      if (Object.keys(currentStepData).length > 0) {
        regenerationContext = `
        **Original JSON for this step (modify this based on feedback):**
        ${JSON.stringify(currentStepData, null, 2)}
        `;
      }
    }

    // Length constraints
    const lengthContext = lengthConstraints ? getLengthConstraintPrompt(lengthConstraints.globalTarget) : '';

    // Token safety: truncate competitor data if it exceeds safe limits
    const competitorDataJson = JSON.stringify(competitorData);
    const safeCompetitorDataJson = truncateCompetitorText(competitorDataJson);

    const prompt = `
      ${stepSpecificContext}
      ${regenerationContext}
      ${lengthContext}

      ${groundTruthText ? `**"Ground Truth" Competitor Text (Full text from top 3 competitors):**\n${groundTruthText}` : ''}

      **Competitor Data:**
      ${safeCompetitorDataJson}

      **User-Provided Subject Matter Context:**
      ${subjectInfo || "Not provided."}

      **User-Provided Brand Information:**
      ${brandInfo || "Not provided."}

      **Results from Previous Steps (use this as context):**
      ${JSON.stringify(previousStepsData, null, 2)}

      ${userFeedback ? `**User Feedback to apply (this is the most important instruction):**\n${userFeedback}` : ''}

      Please generate the new JSON for step ${step}, incorporating the feedback into the original JSON if provided.
    `;

    checkTokenBudget(`executeBriefStep-step${step}`, prompt);

    // Build generation config
    const genConfig = buildGenerationConfig(model, step, effectiveThinkingLevel, schema);

    // Execute with retry
    return await retryOperation(async () => {
      const response = await callGeminiDirect(
        model,
        prompt,
        {
          systemInstruction: systemInstruction,
          ...(genConfig.responseMimeType ? { responseMimeType: genConfig.responseMimeType as string } : {}),
          ...(genConfig.responseSchema ? { responseSchema: genConfig.responseSchema as object } : {}),
          ...(genConfig.thinkingConfig ? { thinkingConfig: genConfig.thinkingConfig as { thinkingBudget: number } } : {}),
        }
      );

      const text = response.text;
      if (!text) {
        throw new Error(`Received an empty response from the AI for step ${step}.`);
      }
      return JSON.parse(text);
    });

  } catch (error) {
    console.error(`Error generating brief for step ${step}:`, error);
    if (error instanceof Error && error.message.includes('call stack size exceeded')) {
      throw new Error(`Failed to generate brief for step ${step} due to a schema recursion issue.`);
    }
    throw new Error(`Failed to generate brief from Gemini API for step ${step} after retries. Please try again.`);
  }
}
