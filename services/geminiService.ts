import { Type } from "@google/genai";
import { getSystemPrompt, getStructureEnrichmentPrompt, getStructureResourceAnalysisPrompt, getContentGenerationPrompt, TEMPLATE_EXTRACTION_PROMPT, ADAPT_HEADINGS_PROMPT, PARAGRAPH_REGENERATION_PROMPT, REWRITE_SELECTION_PROMPTS, THINKING_LEVEL_BY_STEP, getLengthConstraintPrompt, VALIDATION_PROMPT, EEAT_SIGNALS_PROMPT, CONTENT_VALIDATION_SYSTEM_PROMPT, CONTENT_VALIDATION_PROMPT, CONTENT_VALIDATION_FOLLOWUP_PROMPT } from '../constants';
import type { ContentBrief, ArticleStructure, OutlineItem, ModelSettings, GeminiModel, ThinkingLevel, HeadingNode, RewriteAction, LengthConstraints, BriefValidation, EEATSignals, ContentValidationResult } from "../types";
import { stripReasoningFromBrief } from './briefContextService';
import { supabase } from './supabaseClient';

// Supabase project URL for edge function calls
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Call the Gemini proxy edge function (non-streaming).
 */
const callGemini = async (model: string, contents: string, config: any): Promise<{ text: string }> => {
  const { data, error } = await supabase.functions.invoke('gemini-proxy', {
    body: { model, contents, config },
  });

  if (error) {
    throw new Error(`Gemini proxy error: ${error.message}`);
  }

  if (data?.error) {
    throw new Error(`Gemini API error: ${data.error}`);
  }

  return data;
};

/**
 * Call the Gemini proxy edge function with streaming (SSE).
 */
const callGeminiStream = async function* (model: string, contents: string, config: any): AsyncGenerator<{ text: string }> {
  const url = `${supabaseUrl}/functions/v1/gemini-proxy`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ model, contents, config, stream: true }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini proxy stream error: ${response.status} ${errorBody}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim();
        if (data === '[DONE]') return;
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) throw new Error(parsed.error);
          yield parsed;
        } catch (e) {
          if (e instanceof SyntaxError) continue;
          throw e;
        }
      }
    }
  }
};

// Default model settings - can be overridden by user
let currentModelSettings: ModelSettings = {
  model: 'gemini-3-pro-preview',
  thinkingLevel: 'high'
};

export const setModelSettings = (settings: ModelSettings) => {
  currentModelSettings = settings;
};

export const getModelSettings = (): ModelSettings => currentModelSettings;

// Get appropriate model based on settings
const getModelForStep = (step: number): string => {
  return currentModelSettings.model;
};

// Get thinking level for a step (uses recommended if not manually set)
const getThinkingLevelForStep = (step: number): ThinkingLevel => {
  // Use manual setting if it's been specifically configured, otherwise use recommended
  return THINKING_LEVEL_BY_STEP[step] || currentModelSettings.thinkingLevel;
};

// Build generation config with Gemini 3 thinkingConfig
const buildGenerationConfig = (step: number, schema?: any) => {
  const config: any = {};

  // Add thinking config for Gemini 3 models (supports thinkingBudget)
  if (currentModelSettings.model.includes('gemini-3')) {
    const thinkingLevel = getThinkingLevelForStep(step);
    // Note: 'minimal' is only available for Flash model
    if (thinkingLevel === 'minimal' && !currentModelSettings.model.includes('flash')) {
      config.thinkingConfig = { thinkingBudget: 1024 };
    } else {
      // Map thinking levels to budget tokens
      const budgetMap: Record<ThinkingLevel, number> = {
        high: 24576,
        medium: 8192,
        low: 2048,
        minimal: 1024,
      };
      config.thinkingConfig = { thinkingBudget: budgetMap[thinkingLevel] };
    }
  }

  if (schema) {
    config.responseMimeType = "application/json";
    config.responseSchema = schema;
  }

  return config;
};

// Retry utility to handle transient errors or occasional schema validation hiccups
const retryOperation = async <T>(operation: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
        try {
            return await operation();
        } catch (error) {
            console.warn(`Attempt ${i + 1} failed. Retrying...`, error);
            lastError = error;
            if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
};

const reasoningItemSchema = (description: string) => ({
    type: Type.OBJECT,
    properties: {
        value: { type: Type.STRING, description },
        reasoning: { type: Type.STRING, description: "The reasoning behind this recommendation, referencing competitor data." }
    },
    required: ["value", "reasoning"]
});

// Feature N1: Search Intent schema
const searchIntentSchema = {
  type: Type.OBJECT,
  properties: {
    type: {
      type: Type.STRING,
      description: "The primary search intent type: 'informational', 'transactional', 'navigational', or 'commercial_investigation'.",
      enum: ['informational', 'transactional', 'navigational', 'commercial_investigation']
    },
    preferred_format: { type: Type.STRING, description: "The content format Google prefers for this query (e.g., 'How-to guide', 'Listicle', 'Comparison')." },
    serp_features: { type: Type.ARRAY, items: { type: Type.STRING }, description: "SERP features present or expected (e.g., 'Featured Snippet', 'PAA', 'Video')." },
    reasoning: { type: Type.STRING, description: "Explanation of why this intent classification was chosen based on competitor analysis." }
  },
  required: ["type", "preferred_format", "serp_features", "reasoning"]
};

// Schemas for each step
const goalSchema = {
  type: Type.OBJECT,
  properties: {
    search_intent: searchIntentSchema,
    page_goal: reasoningItemSchema("A concise statement defining the primary purpose of the article."),
    target_audience: reasoningItemSchema("A description of the ideal reader for this content.")
  },
  required: ["search_intent", "page_goal", "target_audience"]
};

const keywordSelectionSchema = {
    type: Type.OBJECT,
    properties: {
        keyword: { type: Type.STRING, description: "The exact keyword from the provided list." },
        notes: { type: Type.STRING, description: "Brief notes explaining the keyword's role or relevance." }
    },
    required: ["keyword", "notes"]
};

const keywordSchema = {
  type: Type.OBJECT,
  properties: {
    keyword_strategy: {
      type: Type.OBJECT,
      properties: {
        primary_keywords: {
          type: Type.ARRAY,
          items: keywordSelectionSchema,
          description: "One or more keywords that best represent the core user intent."
        },
        secondary_keywords: {
          type: Type.ARRAY,
          items: keywordSelectionSchema,
          description: "All other keywords from the provided list, designated as secondary."
        },
        reasoning: { 
            type: Type.STRING, 
            description: "The rationale for the overall keyword strategy, explaining the choice of primary keywords." 
        }
      },
      required: ["primary_keywords", "secondary_keywords", "reasoning"]
    }
  },
  required: ["keyword_strategy"]
};

const competitorBreakdownSchema = {
    type: Type.OBJECT,
    properties: {
        url: { type: Type.STRING, description: "The competitor's URL." },
        description: { type: Type.STRING, description: "A one-sentence summary of the page." },
        good_points: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific strengths of the page." },
        bad_points: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific weaknesses of the page." }
    },
    required: ["url", "description", "good_points", "bad_points"]
};

const competitorInsightsSchema = {
    type: Type.OBJECT,
    properties: {
        competitor_insights: {
            type: Type.OBJECT,
            properties: {
                competitor_breakdown: {
                    type: Type.ARRAY,
                    items: competitorBreakdownSchema,
                    description: "A detailed breakdown for each competitor."
                },
                differentiation_summary: reasoningItemSchema("An analysis of what separates top performers from the rest.")
            },
            required: ["competitor_breakdown", "differentiation_summary"]
        }
    },
    required: ["competitor_insights"]
};

const contentGapSchema = {
    type: Type.OBJECT,
    properties: {
        content_gap_analysis: {
            type: Type.OBJECT,
            properties: {
                table_stakes: {
                    type: Type.ARRAY,
                    items: reasoningItemSchema("A topic that is essential to cover to be competitive."),
                    description: "A list of must-have topics covered by top competitors."
                },
                strategic_opportunities: {
                    type: Type.ARRAY,
                    items: reasoningItemSchema("A topic or angle that competitors cover poorly or not at all."),
                    description: "A list of content gaps to exploit for a competitive advantage."
                },
                reasoning: { 
                    type: Type.STRING, 
                    description: "The rationale for the overall content gap analysis."
                }
            },
            required: ["table_stakes", "strategic_opportunities", "reasoning"]
        }
    },
    required: ["content_gap_analysis"]
};

// --- Improved Hierarchical Outline Schema ---
// Defines 3 levels of explicit nesting (e.g. H2 -> H3 -> H4) to support deep structures without ambiguous recursion.

// Feature N2: Featured Snippet Target schema
const featuredSnippetTargetSchema = {
    type: Type.OBJECT,
    properties: {
        is_target: { type: Type.BOOLEAN, description: "Whether this section should target a featured snippet." },
        format: { type: Type.STRING, description: "The format to target: 'paragraph', 'list', or 'table'.", enum: ['paragraph', 'list', 'table'] },
        target_query: { type: Type.STRING, description: "The specific query this section aims to answer for the snippet." }
    },
    required: ["is_target", "format"]
};

const outlineBaseProperties = {
    level: { type: Type.STRING, description: "The heading level, e.g., 'H2', 'H3', 'Hero', 'Conclusion'." },
    heading: { type: Type.STRING, description: "The text for the heading." },
    guidelines: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific bullet points for the writer." },
    reasoning: { type: Type.STRING, description: "Why this heading is included." },
    targeted_keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific keywords targeted by this heading." },
    competitor_coverage: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Competitor URLs covering this topic." },
    additional_resources: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of non-text resources needed." },
    featured_snippet_target: featuredSnippetTargetSchema,  // N2: Featured Snippet Targeting
    target_word_count: { type: Type.INTEGER, description: "Approximate word count target for this section." }  // N5: Word Count
};

// Leaf node (Level 3, e.g. H4) - No children allowed/expected
const outlineItemSchemaL3 = {
  type: Type.OBJECT,
  properties: outlineBaseProperties,
  required: ["level", "heading", "guidelines", "reasoning", "targeted_keywords", "competitor_coverage"]
};

// Middle node (Level 2, e.g. H3) - Can have Leaf children
const outlineItemSchemaL2 = {
  type: Type.OBJECT,
  properties: {
    ...outlineBaseProperties,
    children: { type: Type.ARRAY, items: outlineItemSchemaL3, description: "Nested sub-sections." }
  },
  required: ["level", "heading", "guidelines", "reasoning", "targeted_keywords", "competitor_coverage"] // children optional
};

// Root node (Level 1, e.g. H2) - Can have Middle children
const outlineItemSchemaL1 = {
  type: Type.OBJECT,
  properties: {
    ...outlineBaseProperties,
    children: { type: Type.ARRAY, items: outlineItemSchemaL2, description: "Nested sub-sections." }
  },
  required: ["level", "heading", "guidelines", "reasoning", "targeted_keywords", "competitor_coverage"] // children optional
};

const structureSchema = {
  type: Type.OBJECT,
  properties: {
    article_structure: {
      type: Type.OBJECT,
      properties: {
        word_count_target: { 
          type: Type.INTEGER,
          description: "The recommended word count for the article."
        },
        reasoning: { 
            type: Type.STRING, 
            description: "The rationale for the overall structure and word count target." 
        },
        outline: {
          type: Type.ARRAY,
          items: outlineItemSchemaL1 // Top level items can nest up to 3 levels deep
        }
      },
      required: ["word_count_target", "outline", "reasoning"]
    }
  },
  required: ["article_structure"]
};

const faqItemSchema = {
    type: Type.OBJECT,
    properties: {
        question: { type: Type.STRING, description: "The frequently asked question." },
        guidelines: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Actionable guidelines for a writer on how to answer this question."
        }
    },
    required: ["question", "guidelines"]
};

const faqSchema = {
  type: Type.OBJECT,
  properties: {
    faqs: {
      type: Type.OBJECT,
      properties: {
        questions: {
          type: Type.ARRAY,
          items: faqItemSchema,
          description: "A list of frequently asked questions and their answers."
        },
        reasoning: { 
            type: Type.STRING, 
            description: "The rationale for selecting these FAQs, referencing keywords and competitor analysis." 
        }
      },
      required: ["questions", "reasoning"]
    }
  },
  required: ["faqs"]
};

const seoSchema = {
  type: Type.OBJECT,
  properties: {
    on_page_seo: {
      type: Type.OBJECT,
      properties: {
        title_tag: reasoningItemSchema("An SEO-optimized title tag (50-60 characters)."),
        meta_description: reasoningItemSchema("A compelling meta description (150-160 characters)."),
        h1: reasoningItemSchema("The main heading (H1) for the article."),
        url_slug: reasoningItemSchema("A short, keyword-rich URL slug."),
        og_title: reasoningItemSchema("An Open Graph title for social media sharing (around 60 characters)."),
        og_description: reasoningItemSchema("An Open Graph description for social media sharing (around 200 characters).")
      },
      required: ["title_tag", "meta_description", "h1", "url_slug", "og_title", "og_description"]
    }
  },
  required: ["on_page_seo"]
};

const getSchemaForStep = (step: number) => {
  switch (step) {
    case 1: return goalSchema;
    case 2: return keywordSchema;
    case 3: return competitorInsightsSchema;
    case 4: return contentGapSchema;
    case 5: return structureSchema;
    case 6: return faqSchema;
    case 7: return seoSchema;
    default: throw new Error(`Invalid step number: ${step}`);
  }
};

interface GenerationParams {
  step: number;
  competitorDataJson: string;
  subjectInfo: string;
  brandInfo: string;
  previousStepsData: Partial<ContentBrief>;
  language: string;
  groundTruthText?: string;
  userFeedback?: string;
  availableKeywords?: { keyword: string; volume: number }[];
  isRegeneration?: boolean;
  lengthConstraints?: LengthConstraints;
  templateHeadings?: HeadingNode[];
  paaQuestions?: string[];  // People Also Ask questions from SERPs
}

// Helper function to ensure every node in the outline has a `children` array
const normalizeOutline = (items: OutlineItem[]): OutlineItem[] => {
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
};

const generateHierarchicalArticleStructure = async (params: GenerationParams): Promise<{ article_structure: ArticleStructure }> => {
    const { competitorDataJson, subjectInfo, brandInfo, previousStepsData, userFeedback, isRegeneration, groundTruthText, language, lengthConstraints, templateHeadings } = params;
    const modelName = getModelForStep(5);
    const schema = getSchemaForStep(5);
    const genConfig = buildGenerationConfig(5, schema);

    // Part 1: Generate the core structure (skeleton)
    const structureSystemInstruction = getSystemPrompt(5, language, isRegeneration);

    let regenerationContext = '';
    if (isRegeneration && previousStepsData.article_structure) {
        const skeletonForRegen = JSON.parse(JSON.stringify(previousStepsData.article_structure));
        const clearEnrichment = (items: any[]) => {
            if (!items) return;
            items.forEach(item => {
                item.guidelines = [];
                item.targeted_keywords = [];
                item.competitor_coverage = [];
                if(item.children) clearEnrichment(item.children);
            });
        };
        clearEnrichment(skeletonForRegen.outline);

        regenerationContext = `
      **Original JSON for this step (modify this based on feedback):**
      ${JSON.stringify({ article_structure: skeletonForRegen }, null, 2)}
      `;
    }

    // Feature 1: Template heading structure support
    let templateContext = '';
    if (templateHeadings && templateHeadings.length > 0) {
        templateContext = `
      **IMPORTANT: Use this heading structure as your foundation, adapting it to the current topic:**
      ${JSON.stringify(templateHeadings, null, 2)}

      You may add or adjust headings as needed based on the competitor analysis and content gaps, but preserve the overall structure as much as possible.
      `;
    }

    // Feature 3: Length constraints support
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

    // RETRY 1: Structure Skeleton
    const initialStructure = await retryOperation(async () => {
        const response = await callGemini(
            modelName,
            `${basePrompt}\nPlease generate the JSON for step 5, part 1 (the core structure only).`,
            {
                systemInstruction: structureSystemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        );
        const text = response.text;
        if (!text) throw new Error("Received an empty response from the AI for structure generation (Part 1).");
        return JSON.parse(text);
    });

    // Part 2: Enrich the structure
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

    // RETRY 2: Enrichment
    const enrichedStructure = await retryOperation(async () => {
        const response = await callGemini(
            modelName,
            enrichmentPrompt,
            {
                systemInstruction: enrichmentSystemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        );
        const text = response.text;
        if (!text) throw new Error("Received an empty response from the AI for structure enrichment (Part 2).");
        return JSON.parse(text);
    });

    // Part 3: Resource Analysis
    const resourceAnalysisSystemInstruction = getStructureResourceAnalysisPrompt(language);
    const resourceAnalysisPrompt = `
        **Fully Enriched Article Outline (JSON):**
        ${JSON.stringify(enrichedStructure, null, 2)}

        **Task:** Identify necessary non-textual resources based on the guidelines.
    `;

    // RETRY 3: Resource Analysis (with fallback)
    try {
        const finalStructure = await retryOperation(async () => {
             const response = await callGemini(
                modelName,
                resourceAnalysisPrompt,
                {
                    systemInstruction: resourceAnalysisSystemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: schema,
                }
            );
            const text = response.text;
            if (!text) throw new Error("Received empty response for resource analysis.");
            return JSON.parse(text);
        }, 2, 1000); // Fewer retries for this non-critical step

        if (finalStructure.article_structure && finalStructure.article_structure.outline) {
            finalStructure.article_structure.outline = normalizeOutline(finalStructure.article_structure.outline);
        }
        return finalStructure;

    } catch (err) {
        console.warn("Resource analysis step failed after retries. Returning structure without additional resources.", err);
        const finalStructure = enrichedStructure;
        if (finalStructure.article_structure && finalStructure.article_structure.outline) {
            finalStructure.article_structure.outline = normalizeOutline(finalStructure.article_structure.outline);
        }
        return finalStructure;
    }
};


export const generateBriefStep = async (params: GenerationParams): Promise<Partial<ContentBrief>> => {
  const { step, competitorDataJson, subjectInfo, brandInfo, previousStepsData, groundTruthText, userFeedback, availableKeywords, isRegeneration, language, lengthConstraints, templateHeadings, paaQuestions } = params;

  try {
    if (step === 5) {
        return await generateHierarchicalArticleStructure(params);
    }

    const systemInstruction = getSystemPrompt(step, language, isRegeneration);
    const schema = getSchemaForStep(step);
    const modelName = getModelForStep(step);

    let stepSpecificContext = '';
    if (step === 2 && availableKeywords && availableKeywords.length > 0) {
      stepSpecificContext = `
        **Available Keywords to use (You MUST choose from this list and categorize ALL of them):**
        ${JSON.stringify(availableKeywords, null, 2)}
      `;
    }

    // Feature: Add PAA questions to Step 6 (FAQ generation)
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
    
    let regenerationContext = '';
    if (isRegeneration) {
        let currentStepData: Partial<ContentBrief> = {};
        switch(step) {
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

    // Feature 3: Length constraints support
    const lengthContext = lengthConstraints ? getLengthConstraintPrompt(lengthConstraints.globalTarget) : '';

    const prompt = `
      ${stepSpecificContext}
      ${regenerationContext}
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

      ${userFeedback ? `**User Feedback to apply (this is the most important instruction):**\n${userFeedback}` : ''}

      Please generate the new JSON for step ${step}, incorporating the feedback into the original JSON if provided.
    `;

    // Build generation config with Gemini 3 support
    const genConfig = buildGenerationConfig(step, schema);

    // RETRY Wrapper for general steps
    return await retryOperation(async () => {
        const response = await callGemini(
            modelName,
            prompt,
            {
                systemInstruction: systemInstruction,
                ...genConfig,
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
};

interface ArticleSectionParams {
    brief: Partial<ContentBrief>;
    contentSoFar: string;
    sectionToWrite: OutlineItem;
    upcomingHeadings: string[];
    language: string;
    writerInstructions?: string;
    onStream?: (chunk: string) => void;  // Streaming callback
    // Word budget context
    globalWordTarget?: number | null;
    wordsWrittenSoFar?: number;
    totalSections?: number;
    currentSectionIndex?: number;
    strictMode?: boolean;
}

export const generateArticleSection = async ({ brief, contentSoFar, sectionToWrite, upcomingHeadings, language, writerInstructions, onStream, globalWordTarget, wordsWrittenSoFar, totalSections, currentSectionIndex, strictMode }: ArticleSectionParams): Promise<string> => {
    const systemInstruction = getContentGenerationPrompt(language, writerInstructions);
    const modelName = currentModelSettings.model;

    // Build featured snippet instruction if applicable
    let featuredSnippetInstruction = '';
    if (sectionToWrite.featured_snippet_target?.is_target) {
        const format = sectionToWrite.featured_snippet_target.format;
        const targetQuery = sectionToWrite.featured_snippet_target.target_query;

        featuredSnippetInstruction = `
        ---

        **🎯 FEATURED SNIPPET TARGET:**
        This section should be optimized to win a featured snippet for the query: "${targetQuery || sectionToWrite.heading}"

        Format your answer as a **${format.toUpperCase()}**:
        ${format === 'paragraph' ? '- Write a concise, direct answer in 40-60 words that directly answers the query in the first 1-2 sentences.' : ''}
        ${format === 'list' ? '- Structure the content as a numbered or bulleted list with 5-8 clear, actionable items.' : ''}
        ${format === 'table' ? '- Present the information in a clear markdown table format with appropriate headers.' : ''}
        `;
    }

    // Build word count constraint if specified
    let wordCountInstruction = '';
    if (sectionToWrite.target_word_count && sectionToWrite.target_word_count > 0) {
        wordCountInstruction = `
        ---

        **📏 WORD COUNT REQUIREMENT:**
        You MUST write between **${Math.round(sectionToWrite.target_word_count * 0.85)} and ${Math.round(sectionToWrite.target_word_count * 1.15)} words** for this section (target: ${sectionToWrite.target_word_count}).
        `;
    }

    // Build global word budget instruction
    let wordBudgetInstruction = '';
    if (globalWordTarget && globalWordTarget > 0) {
        const wordsRemaining = Math.max(0, globalWordTarget - (wordsWrittenSoFar || 0));
        const sectionsRemaining = Math.max(1, (totalSections || 1) - (currentSectionIndex || 0));
        const suggestedWords = Math.round(wordsRemaining / sectionsRemaining);

        // Section-level target takes priority if set, otherwise use calculated budget
        const effectiveTarget = (sectionToWrite.target_word_count && sectionToWrite.target_word_count > 0)
            ? sectionToWrite.target_word_count
            : suggestedWords;

        if (strictMode) {
            wordBudgetInstruction = `
---

**STRICT WORD COUNT LIMIT — THIS IS MANDATORY:**
- Total article target: ${globalWordTarget} words
- Words written so far: ${wordsWrittenSoFar || 0}
- Words remaining in budget: ${wordsRemaining}
- **YOU MUST write EXACTLY between ${Math.round(effectiveTarget * 0.9)} and ${Math.round(effectiveTarget * 1.1)} words for this section. Do NOT go outside this range.**
- Going over budget will make the article too long. Be concise and focused.
- If you need to cut content, prioritize the most valuable information.
`;
        } else {
            wordBudgetInstruction = `
---

**WORD COUNT REQUIREMENT:**
- Total article target: ${globalWordTarget} words
- Words written so far: ${wordsWrittenSoFar || 0}
- You MUST write between **${Math.round(effectiveTarget * 0.85)} and ${Math.round(effectiveTarget * 1.15)} words** for this section (target: ${effectiveTarget}).
`;
        }
    }

    // Build E-E-A-T signals instruction if available on the brief
    let eeatInstruction = '';
    if (brief.eeat_signals) {
        const s = brief.eeat_signals;
        const bullets = [
            ...(s.experience?.length ? [`**Experience:** ${s.experience.join('; ')}`] : []),
            ...(s.expertise?.length ? [`**Expertise:** ${s.expertise.join('; ')}`] : []),
            ...(s.authority?.length ? [`**Authority:** ${s.authority.join('; ')}`] : []),
            ...(s.trust?.length ? [`**Trust:** ${s.trust.join('; ')}`] : []),
        ];
        if (bullets.length > 0) {
            eeatInstruction = `
---

**🛡️ E-E-A-T SIGNALS — WEAVE THESE INTO YOUR WRITING:**
Where naturally relevant to this section, incorporate the following credibility signals:
${bullets.map(b => `- ${b}`).join('\n')}

Do NOT force every signal into every section. Only include signals that fit organically with this section's topic. A single well-placed signal per section is better than shoehorning multiple.
`;
        }
    }

    // Build brief validation awareness — flag known gaps so the writer compensates
    let validationInstruction = '';
    if (brief.validation?.improvements && brief.validation.improvements.length > 0) {
        const relevantImprovements = brief.validation.improvements.filter(imp => {
            // Include improvements that reference this section or are general
            const sectionLower = sectionToWrite.heading.toLowerCase();
            const impSectionLower = imp.section.toLowerCase();
            return impSectionLower === 'general' ||
                   impSectionLower === 'overall' ||
                   sectionLower.includes(impSectionLower) ||
                   impSectionLower.includes(sectionLower.split(':')[0].trim());
        });

        // Always include all improvements for the first section so nothing is missed
        const improvementsToShow = (currentSectionIndex === 0)
            ? brief.validation.improvements
            : relevantImprovements;

        if (improvementsToShow.length > 0) {
            validationInstruction = `
---

**⚠️ BRIEF QUALITY ISSUES — COMPENSATE IN YOUR WRITING:**
A validation pass identified these gaps in the brief. Address them in your writing where relevant:
${improvementsToShow.map(imp => `- **${imp.section}:** ${imp.issue} → ${imp.suggestion}`).join('\n')}
`;
        }
    }

    // Build additional resources instruction if available
    let resourcesInstruction = '';
    if (sectionToWrite.additional_resources && sectionToWrite.additional_resources.length > 0) {
        resourcesInstruction = `
        ---

        **📎 MEDIA PLACEHOLDERS TO INSERT:**
        After writing the text, include these placeholder comments where appropriate:
        ${sectionToWrite.additional_resources.map(r => `<!-- [RESOURCE: ${r}] -->`).join('\n')}

        Place each placeholder at a logical position within the section where that resource would enhance the content.
        `;
    }

    const prompt = `
        **FULL CONTENT BRIEF (JSON, reasoning fields stripped for brevity):**
        ${JSON.stringify(stripReasoningFromBrief(brief), null, 2)}

        ---

        **CONTENT WRITTEN SO FAR:**
        ${contentSoFar.slice(-3000)}

        ---

        **CURRENT SECTION TO WRITE:**
        - **Heading:** ${sectionToWrite.heading}
        - **Keywords to include:** ${sectionToWrite.targeted_keywords?.join(', ') || 'None specified'}
        - **Guidelines:**
        ${sectionToWrite.guidelines.map(g => `  - ${g}`).join('\n')}
        ${featuredSnippetInstruction}
        ${wordCountInstruction}
        ${resourcesInstruction}
        ${wordBudgetInstruction}
        ${eeatInstruction}
        ${validationInstruction}

        ---

        **UPCOMING HEADINGS (FOR CONTEXT):**
        ${upcomingHeadings.length > 0 ? upcomingHeadings.join('\n') : 'This is the last section.'}

        ---

        Now, write the body content for the current section.
    `;

    try {
        // Use streaming if callback provided
        if (onStream) {
            let fullText = '';
            const stream = callGeminiStream(
                modelName,
                prompt,
                { systemInstruction }
            );

            for await (const chunk of stream) {
                const chunkText = chunk.text || '';
                fullText += chunkText;
                onStream(chunkText);
            }

            if (!fullText) {
                throw new Error("Received an empty response from the AI for article section generation.");
            }
            return fullText;
        }

        // Non-streaming fallback with retry
        return await retryOperation(async () => {
            const response = await callGemini(
                modelName,
                prompt,
                { systemInstruction }
            );
            const text = response.text;
            if (!text) {
                throw new Error("Received an empty response from the AI for article section generation.");
            }
            return text;
        });

    } catch (error) {
        console.error("Error generating article section:", error);
        throw new Error("Failed to generate article section from Gemini API.");
    }
};

/**
 * Trims a section to target word count using AI condensation.
 * Only called if section exceeds maxWords (target * 1.2) in strict mode.
 */
export const trimSectionToWordCount = async (
    content: string,
    targetWords: number,
    language: string,
    sectionHeading: string
): Promise<string> => {
    const modelName = currentModelSettings.model;

    const prompt = `Condense the following section to approximately ${targetWords} words.

RULES:
- Preserve ALL key information and main points
- Maintain natural flow and readability
- Remove filler, redundancy, and overly wordy phrases
- Do NOT add any commentary — return ONLY the condensed text
- Write in **${language}**

SECTION HEADING: ${sectionHeading}

CONTENT TO CONDENSE:
${content}

Condensed version (approximately ${targetWords} words):`;

    try {
        return await retryOperation(async () => {
            const response = await callGemini(
                modelName,
                prompt,
                { thinkingConfig: { thinkingBudget: 1024 } }
            );
            const text = response.text;
            if (!text) throw new Error("Empty response from AI for section trimming.");
            return text.trim();
        });
    } catch (error) {
        console.error("Error trimming section:", error);
        // Return original content if trimming fails
        return content;
    }
};

// Feature 1: Extract template structure from URL content
export const extractTemplateFromContent = async (content: string, language: string): Promise<HeadingNode[]> => {
    const modelName = currentModelSettings.model;

    const prompt = `${TEMPLATE_EXTRACTION_PROMPT}

CONTENT TO ANALYZE:
${content.slice(0, 50000)}  // Limit content to prevent token overflow

Your response must be a valid JSON array.`;

    try {
        return await retryOperation(async () => {
            const response = await callGemini(
                modelName,
                prompt,
                { responseMimeType: "application/json" }
            );
            const text = response.text;
            if (!text) throw new Error("Empty response from AI for template extraction.");
            return JSON.parse(text);
        });
    } catch (error) {
        console.error("Error extracting template:", error);
        throw new Error("Failed to extract heading structure from content.");
    }
};

// Feature 1: Adapt headings to new topic
export const adaptHeadingsToTopic = async (headings: HeadingNode[], originalUrl: string, newTopic: string, language: string): Promise<HeadingNode[]> => {
    const modelName = currentModelSettings.model;

    const prompt = ADAPT_HEADINGS_PROMPT
        .replace('{originalUrl}', originalUrl)
        .replace('{newTopic}', newTopic)
        .replace('{headings}', JSON.stringify(headings, null, 2));

    try {
        return await retryOperation(async () => {
            const response = await callGemini(
                modelName,
                prompt,
                { responseMimeType: "application/json" }
            );
            const text = response.text;
            if (!text) throw new Error("Empty response from AI for heading adaptation.");
            return JSON.parse(text);
        });
    } catch (error) {
        console.error("Error adapting headings:", error);
        throw new Error("Failed to adapt heading structure to new topic.");
    }
};

// Feature 4: Regenerate a specific paragraph with enhanced context
export const regenerateParagraph = async (
    fullSection: string,
    targetParagraph: string,
    before: string,
    after: string,
    feedback: string,
    language: string,
    sectionGuidelines?: string[],
    sectionHeading?: string
): Promise<string> => {
    const modelName = currentModelSettings.model;

    // Build enhanced context
    let guidelinesContext = '';
    if (sectionGuidelines && sectionGuidelines.length > 0) {
        guidelinesContext = `
SECTION GUIDELINES (for context):
${sectionGuidelines.map(g => `- ${g}`).join('\n')}

SECTION HEADING: ${sectionHeading || 'Unknown'}
`;
    }

    const prompt = `${guidelinesContext}

${PARAGRAPH_REGENERATION_PROMPT
        .replace('{fullSection}', fullSection)
        .replace('{targetParagraph}', targetParagraph)
        .replace('{before}', before)
        .replace('{after}', after)
        .replace('{feedback}', feedback)}`;

    const systemInstruction = `You are an expert content editor. Your entire response must be in **${language}**. Return only the rewritten paragraph, nothing else. Ensure the rewritten paragraph flows naturally with the content before and after it.`;

    try {
        return await retryOperation(async () => {
            const response = await callGemini(
                modelName,
                prompt,
                { systemInstruction }
            );
            const text = response.text;
            if (!text) throw new Error("Empty response from AI for paragraph regeneration.");
            return text.trim();
        });
    } catch (error) {
        console.error("Error regenerating paragraph:", error);
        throw new Error("Failed to regenerate paragraph.");
    }
};

// Feature 5: Rewrite text selection
export const rewriteSelection = async (
    selectedText: string,
    action: RewriteAction,
    context: string,
    customInstruction?: string,
    language: string = 'English'
): Promise<string> => {
    const modelName = currentModelSettings.model;

    let promptTemplate = REWRITE_SELECTION_PROMPTS[action];
    let prompt = promptTemplate
        .replace('{text}', selectedText)
        .replace('{context}', context || 'No additional context provided.');

    if (action === 'custom' && customInstruction) {
        prompt = prompt.replace('{instruction}', customInstruction);
    }

    const systemInstruction = `You are an expert content editor. Your entire response must be in **${language}**. Return only the rewritten text, nothing else.`;

    try {
        return await retryOperation(async () => {
            const response = await callGemini(
                modelName,
                prompt,
                { systemInstruction }
            );
            const text = response.text;
            if (!text) throw new Error("Empty response from AI for text rewrite.");
            return text.trim();
        });
    } catch (error) {
        console.error("Error rewriting selection:", error);
        throw new Error("Failed to rewrite selected text.");
    }
};

// Feature N3: Validate a completed brief
export const validateBrief = async (
    brief: Partial<ContentBrief>,
    language: string
): Promise<BriefValidation> => {
    const modelName = currentModelSettings.model;

    const prompt = VALIDATION_PROMPT.replace('{briefJson}', JSON.stringify(brief, null, 2));

    const systemInstruction = `You are an expert SEO Content Strategist reviewing a content brief for quality. Your entire response must be in **${language}**. Return only valid JSON.`;

    try {
        return await retryOperation(async () => {
            const response = await callGemini(
                modelName,
                prompt,
                { systemInstruction, responseMimeType: "application/json" }
            );
            const text = response.text;
            if (!text) throw new Error("Empty response from AI for brief validation.");
            return JSON.parse(text);
        });
    } catch (error) {
        console.error("Error validating brief:", error);
        throw new Error("Failed to validate brief.");
    }
};

// Feature N4: Generate E-E-A-T signals recommendations
export const generateEEATSignals = async (
    brief: Partial<ContentBrief>,
    competitorDataJson: string,
    language: string
): Promise<EEATSignals> => {
    const modelName = currentModelSettings.model;

    const topicContext = `
Page Goal: ${brief.page_goal?.value || 'Not defined'}
Target Audience: ${brief.target_audience?.value || 'Not defined'}
Primary Keywords: ${brief.keyword_strategy?.primary_keywords?.map(k => k.keyword).join(', ') || 'None'}
`;

    const competitorInsights = brief.competitor_insights
        ? JSON.stringify(brief.competitor_insights, null, 2)
        : competitorDataJson;

    const prompt = EEAT_SIGNALS_PROMPT
        .replace('{topicContext}', topicContext)
        .replace('{competitorInsights}', competitorInsights);

    const systemInstruction = `You are an expert SEO Content Strategist specializing in E-E-A-T optimization. Your entire response must be in **${language}**. Return only valid JSON with 'experience', 'expertise', 'authority', 'trust' arrays and a 'reasoning' field.`;

    try {
        return await retryOperation(async () => {
            const response = await callGemini(
                modelName,
                prompt,
                { systemInstruction, responseMimeType: "application/json" }
            );
            const text = response.text;
            if (!text) throw new Error("Empty response from AI for E-E-A-T signals.");
            return JSON.parse(text);
        });
    } catch (error) {
        console.error("Error generating E-E-A-T signals:", error);
        throw new Error("Failed to generate E-E-A-T signals.");
    }
};

// Content Validation JSON Schema
const contentValidationSchema = {
    type: Type.OBJECT,
    properties: {
        overallScore: { type: Type.INTEGER, description: "Overall quality score from 1-100" },
        scores: {
            type: Type.OBJECT,
            properties: {
                briefAlignment: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.INTEGER, description: "Score from 1-100" },
                        explanation: { type: Type.STRING, description: "Explanation for the score" }
                    },
                    required: ["score", "explanation"]
                },
                paragraphLengths: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.INTEGER, description: "Score from 1-100" },
                        explanation: { type: Type.STRING, description: "Explanation for the score" }
                    },
                    required: ["score", "explanation"]
                },
                totalWordCount: {
                    type: Type.OBJECT,
                    properties: {
                        actual: { type: Type.INTEGER, description: "Actual word count" },
                        target: { type: Type.INTEGER, description: "Target word count" },
                        explanation: { type: Type.STRING, description: "Explanation of the word count difference" }
                    },
                    required: ["actual", "target", "explanation"]
                },
                keywordUsage: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.INTEGER, description: "Score from 1-100" },
                        explanation: { type: Type.STRING, description: "Explanation for the score" }
                    },
                    required: ["score", "explanation"]
                },
                structureAdherence: {
                    type: Type.OBJECT,
                    properties: {
                        score: { type: Type.INTEGER, description: "Score from 1-100" },
                        explanation: { type: Type.STRING, description: "Explanation for the score" }
                    },
                    required: ["score", "explanation"]
                }
            },
            required: ["briefAlignment", "paragraphLengths", "totalWordCount", "keywordUsage", "structureAdherence"]
        },
        proposedChanges: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: "Unique identifier for the change" },
                    type: {
                        type: Type.STRING,
                        description: "Type of change",
                        enum: ["alignment", "length", "paragraph_length", "missing_keyword", "structure", "tone"]
                    },
                    severity: {
                        type: Type.STRING,
                        description: "Severity level",
                        enum: ["critical", "warning", "suggestion"]
                    },
                    location: {
                        type: Type.OBJECT,
                        properties: {
                            sectionHeading: { type: Type.STRING, description: "The heading of the section where the issue is located" },
                            paragraphIndex: { type: Type.INTEGER, description: "Index of the paragraph (0-based)" }
                        }
                    },
                    description: { type: Type.STRING, description: "Brief description of the issue" },
                    currentText: { type: Type.STRING, description: "The exact current text that needs changing" },
                    proposedText: { type: Type.STRING, description: "The proposed replacement text" },
                    reasoning: { type: Type.STRING, description: "Why this change is recommended" }
                },
                required: ["id", "type", "severity", "location", "description", "reasoning"]
            },
            description: "List of proposed changes to improve the content"
        },
        summary: { type: Type.STRING, description: "Brief summary of overall content quality and recommendations" }
    },
    required: ["overallScore", "scores", "proposedChanges", "summary"]
};

// Post-Content Validation Function
export const validateGeneratedContent = async (params: {
    generatedContent: string;
    brief: Partial<ContentBrief>;
    lengthConstraints?: LengthConstraints;
    userInstructions?: string;
    previousValidation?: ContentValidationResult;
    language: string;
}): Promise<ContentValidationResult> => {
    const { generatedContent, brief, lengthConstraints, userInstructions, previousValidation, language } = params;
    const modelName = currentModelSettings.model;

    // Build the prompt based on whether this is a follow-up validation
    let prompt: string;

    if (previousValidation && userInstructions) {
        // Follow-up validation with user feedback
        prompt = CONTENT_VALIDATION_FOLLOWUP_PROMPT
            .replace('{previousValidation}', JSON.stringify(previousValidation, null, 2))
            .replace('{userInstructions}', userInstructions)
            .replace('{briefJson}', JSON.stringify(brief, null, 2))
            .replace('{generatedContent}', generatedContent);
    } else {
        // Initial validation
        const targetWordCount = lengthConstraints?.globalTarget || brief.article_structure?.word_count_target || 0;
        const strictMode = lengthConstraints?.strictMode ? 'Yes' : 'No';
        const userInstructionsSection = userInstructions
            ? `\n**USER INSTRUCTIONS:**\n${userInstructions}\n`
            : '';

        prompt = CONTENT_VALIDATION_PROMPT
            .replace('{briefJson}', JSON.stringify(brief, null, 2))
            .replace('{generatedContent}', generatedContent)
            .replace('{targetWordCount}', targetWordCount.toString())
            .replace('{strictMode}', strictMode)
            .replace('{userInstructions}', userInstructionsSection);
    }

    const systemInstruction = `${CONTENT_VALIDATION_SYSTEM_PROMPT}\n\n**IMPORTANT:** All text in your response (descriptions, explanations, proposed text changes) MUST be in **${language}**.`;

    try {
        return await retryOperation(async () => {
            const response = await callGemini(
                modelName,
                prompt,
                {
                    systemInstruction,
                    responseMimeType: "application/json",
                    responseSchema: contentValidationSchema,
                }
            );
            const text = response.text;
            if (!text) throw new Error("Empty response from AI for content validation.");
            return JSON.parse(text);
        });
    } catch (error) {
        console.error("Error validating content:", error);
        throw new Error("Failed to validate content against brief.");
    }
};

// Article Optimizer: Chat-based full article rewrite with streaming
export const optimizeArticleWithChat = async (params: {
    currentArticle: string;
    brief: Partial<ContentBrief>;
    lengthConstraints?: LengthConstraints;
    userInstruction: string;
    metricsContext: string;
    language: string;
    onStream?: (chunk: string) => void;
}): Promise<string> => {
    const { currentArticle, brief, lengthConstraints, userInstruction, metricsContext, language, onStream } = params;
    const modelName = currentModelSettings.model;

    const targetWordCount = lengthConstraints?.globalTarget || brief.article_structure?.word_count_target || 0;

    const systemInstruction = `You are an expert SEO content optimizer. You have the original content brief and the current article.
Your job is to rewrite the ENTIRE article based on the user's instruction and the metrics analysis.

RULES:
- Return ONLY the complete rewritten article in markdown format
- Include all headings (##, ###) and body content
- Start with # H1 title
- Maintain the same structure unless the instruction asks to change it
- Write in ${language}
${targetWordCount > 0 ? `- Target word count: ${targetWordCount} words (MUST be within +/-10%)` : ''}
- Integrate all keywords naturally
- Follow the content brief's guidelines for each section
- Do NOT include any commentary, explanations, or meta-text — ONLY the article`;

    const prompt = `**CONTENT BRIEF (JSON):**
${JSON.stringify(stripReasoningFromBrief(brief), null, 2)}

---

**CURRENT ARTICLE:**
${currentArticle}

---

**ARTICLE METRICS ANALYSIS:**
${metricsContext}

---

**USER INSTRUCTION:**
${userInstruction}

---

Now rewrite the ENTIRE article incorporating the user's instruction. Return ONLY the complete article in markdown format.`;

    try {
        if (onStream) {
            let fullText = '';
            const stream = callGeminiStream(modelName, prompt, { systemInstruction });

            for await (const chunk of stream) {
                const chunkText = chunk.text || '';
                fullText += chunkText;
                onStream(chunkText);
            }

            if (!fullText) {
                throw new Error("Received an empty response from the AI for article optimization.");
            }
            return fullText;
        }

        // Non-streaming fallback
        return await retryOperation(async () => {
            const response = await callGemini(modelName, prompt, { systemInstruction });
            const text = response.text;
            if (!text) throw new Error("Empty response from AI for article optimization.");
            return text;
        });
    } catch (error) {
        console.error("Error optimizing article:", error);
        throw new Error("Failed to optimize article. Please try again.");
    }
};
