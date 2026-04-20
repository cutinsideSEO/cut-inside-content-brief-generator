import { Type } from "@google/genai";
import { TEMPLATE_EXTRACTION_PROMPT, ADAPT_HEADINGS_PROMPT, PARAGRAPH_REGENERATION_PROMPT, REWRITE_SELECTION_PROMPTS, VALIDATION_PROMPT, EEAT_SIGNALS_PROMPT, CONTENT_VALIDATION_PROMPT, CONTENT_VALIDATION_FOLLOWUP_PROMPT, getParagraphRegenerationSystemPrompt, getRewriteSelectionSystemPrompt, getBriefValidationSystemPrompt, getEEATSignalsSystemPrompt, getContentValidationSystemPrompt, getArticleOptimizerSystemPrompt, getOptimizerRouterSystemPrompt, ARTICLE_OPTIMIZER_THINKING_BUDGET, VALIDATION_CHUNK_THRESHOLD } from '../constants';
import type { ContentBrief, ModelSettings, HeadingNode, RewriteAction, LengthConstraints, BriefValidation, EEATSignals, ContentValidationResult, OptimizerRouterResponse } from "../types";
import { stripReasoningFromBrief, countWords, checkTokenBudget } from './briefContextService';
import { supabase } from './supabaseClient';

// Supabase project URL for edge function calls
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Call the Gemini proxy edge function (non-streaming).
 */
const callGemini = async (model: string, contents: string, config: any, signal?: AbortSignal): Promise<{ text: string }> => {
  // Check if already aborted before making the call
  if (signal?.aborted) {
    throw new DOMException('The operation was aborted.', 'AbortError');
  }

  const invokePromise = supabase.functions.invoke('gemini-proxy', {
    body: { model, contents, config },
  });

  // If signal provided, race against abort
  let result: { data: any; error: any };
  if (signal) {
    result = await Promise.race([
      invokePromise,
      new Promise<never>((_, reject) => {
        const onAbort = () => reject(new DOMException('The operation was aborted.', 'AbortError'));
        if (signal.aborted) { onAbort(); return; }
        signal.addEventListener('abort', onAbort, { once: true });
      }),
    ]);
  } else {
    result = await invokePromise;
  }

  const { data, error } = result;

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
const callGeminiStream = async function* (model: string, contents: string, config: any, signal?: AbortSignal): AsyncGenerator<{ text: string }> {
  const url = `${supabaseUrl}/functions/v1/gemini-proxy`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({ model, contents, config, stream: true }),
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini proxy stream error: ${response.status} ${errorBody}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      // Check abort signal before each read
      if (signal?.aborted) {
        await reader.cancel();
        throw new DOMException('The operation was aborted.', 'AbortError');
      }

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
  } finally {
    // Ensure reader is released if we exit early (e.g., abort)
    try { reader.releaseLock(); } catch { /* already released */ }
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

// Retry utility to handle transient errors or occasional schema validation hiccups
const retryOperation = async <T>(operation: () => Promise<T>, retries = 3, delay = 2000, timeoutMs = 120000): Promise<T> => {
    let lastError: any;
    for (let i = 0; i < retries; i++) {
        try {
            // Race the operation against a per-attempt timeout
            const result = await Promise.race([
                operation(),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
                ),
            ]);
            return result;
        } catch (error) {
            // Don't retry on abort — propagate immediately
            if (error instanceof DOMException && error.name === 'AbortError') {
                throw error;
            }
            console.warn(`Attempt ${i + 1} failed. Retrying...`, error);
            lastError = error;
            if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    throw lastError;
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

    const systemInstruction = getParagraphRegenerationSystemPrompt(language);

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

    const systemInstruction = getRewriteSelectionSystemPrompt(language);

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

    const systemInstruction = getBriefValidationSystemPrompt(language);

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

    const systemInstruction = getEEATSignalsSystemPrompt(language);

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
    const wordCount = countWords(generatedContent);

    checkTokenBudget('validateGeneratedContent', generatedContent + JSON.stringify(brief));

    const systemInstruction = getContentValidationSystemPrompt(language);

    if (wordCount > VALIDATION_CHUNK_THRESHOLD) {
        // Chunked validation for long articles
        const sections = generatedContent.split(/(?=^## )/m).filter(s => s.trim());
        const chunkResults: ContentValidationResult[] = [];

        for (const section of sections) {
            const headingMatch = section.match(/^##\s+(.+)/m);
            const sectionHeading = headingMatch?.[1] || '';

            const chunkPrompt = CONTENT_VALIDATION_PROMPT
                .replace('{briefJson}', JSON.stringify(brief, null, 2))
                .replace('{generatedContent}', section)
                .replace('{targetWordCount}', (lengthConstraints?.globalTarget || brief.article_structure?.word_count_target || 0).toString())
                .replace('{strictMode}', lengthConstraints?.strictMode ? 'Yes' : 'No')
                .replace('{userInstructions}', userInstructions ? `\n**USER INSTRUCTIONS:**\n${userInstructions}\n` : '');

            checkTokenBudget(`validateChunk-${sectionHeading}`, chunkPrompt);

            const chunkResult = await retryOperation(async () => {
                const response = await callGemini(
                    modelName,
                    chunkPrompt,
                    {
                        systemInstruction,
                        responseMimeType: "application/json",
                        responseSchema: contentValidationSchema,
                    }
                );
                const text = response.text;
                if (!text) throw new Error("Empty response from AI for chunk validation.");
                return JSON.parse(text) as ContentValidationResult;
            });

            chunkResults.push(chunkResult);
        }

        // Merge chunked results
        const mergedChanges = chunkResults.flatMap(r => r.proposedChanges);
        const avgScore = Math.round(chunkResults.reduce((sum, r) => sum + r.overallScore, 0) / chunkResults.length);
        const mergedSummary = chunkResults.map(r => r.summary).join(' ');

        const avgCategoryScore = (getter: (r: ContentValidationResult) => { score: number; explanation: string }) => {
            const scores = chunkResults.map(r => getter(r));
            return {
                score: Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length),
                explanation: scores.map(s => s.explanation).join(' '),
            };
        };

        return {
            overallScore: avgScore,
            scores: {
                briefAlignment: avgCategoryScore(r => r.scores.briefAlignment),
                paragraphLengths: avgCategoryScore(r => r.scores.paragraphLengths),
                totalWordCount: {
                    actual: countWords(generatedContent),
                    target: lengthConstraints?.globalTarget || brief.article_structure?.word_count_target || 0,
                    explanation: chunkResults.map(r => r.scores.totalWordCount.explanation).join(' '),
                },
                keywordUsage: avgCategoryScore(r => r.scores.keywordUsage),
                structureAdherence: avgCategoryScore(r => r.scores.structureAdherence),
            },
            proposedChanges: mergedChanges,
            summary: mergedSummary,
        };
    } else {
        // Standard validation for shorter articles
        let prompt: string;

        if (previousValidation && userInstructions) {
            prompt = CONTENT_VALIDATION_FOLLOWUP_PROMPT
                .replace('{previousValidation}', JSON.stringify(previousValidation, null, 2))
                .replace('{userInstructions}', userInstructions)
                .replace('{briefJson}', JSON.stringify(brief, null, 2))
                .replace('{generatedContent}', generatedContent);
        } else {
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
    }
};

// Optimizer Router: Classify user intent (chat vs rewrite vs SEO edit)
export const routeOptimizerMessage = async (params: {
    userMessage: string;
    conversationHistory: { role: 'user' | 'assistant'; content: string }[];
    currentArticleSummary: string;
    seoMetadata: string;
    metricsContext: string;
    briefContext: string;
    language: string;
}): Promise<OptimizerRouterResponse> => {
    const { userMessage, conversationHistory, currentArticleSummary, seoMetadata, metricsContext, briefContext, language } = params;
    const modelName = currentModelSettings.model;

    const systemInstruction = getOptimizerRouterSystemPrompt(language);

    // Build conversation context (last 10 messages)
    const recentHistory = conversationHistory.slice(-10);
    const historyText = recentHistory.length > 0
        ? recentHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n')
        : 'No previous conversation.';

    const prompt = `**CONVERSATION HISTORY:**
${historyText}

---

**CONTENT BRIEF SUMMARY:**
${briefContext}

---

**CURRENT ARTICLE SUMMARY (first 500 chars):**
${currentArticleSummary}

---

**CURRENT ON-PAGE SEO METADATA:**
${seoMetadata}

---

**ARTICLE METRICS:**
${metricsContext}

---

**USER'S NEW MESSAGE:**
${userMessage}

---

Classify the user's intent and respond with valid JSON.`;

    try {
        return await retryOperation(async () => {
            const response = await callGemini(modelName, prompt, {
                systemInstruction,
                responseMimeType: "application/json",
                ...(currentModelSettings.model.includes('gemini-3') ? { thinkingConfig: { thinkingBudget: 2048 } } : {}),
            });
            const text = response.text;
            if (!text) throw new Error("Empty response from AI for optimizer routing.");
            return JSON.parse(text) as OptimizerRouterResponse;
        }, 2, 1000);
    } catch (error) {
        console.error("Error routing optimizer message:", error);
        // Fallback: treat as rewrite request
        return { action: 'rewrite_article', message: 'Processing your request...' };
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
    brandContext?: string;
    conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
    onStream?: (chunk: string) => void;
}): Promise<string> => {
    const { currentArticle, brief, lengthConstraints, userInstruction, metricsContext, language, brandContext, conversationHistory, onStream } = params;
    const modelName = currentModelSettings.model;

    const targetWordCount = lengthConstraints?.globalTarget || brief.article_structure?.word_count_target || 0;

    const systemInstruction = getArticleOptimizerSystemPrompt(language, targetWordCount);

    // Build conversation context for the rewrite
    const recentHistory = conversationHistory?.slice(-8) || [];
    const historySection = recentHistory.length > 0
        ? `**RECENT CONVERSATION CONTEXT:**\n${recentHistory.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n')}\n\n---\n\n`
        : '';

    const brandSection = brandContext
        ? `\n---\n\n**BRAND VOICE & GUIDELINES:**\n${brandContext}\n`
        : '';

    const prompt = `**CONTENT BRIEF (JSON):**
${JSON.stringify(stripReasoningFromBrief(brief), null, 2)}

---

**CURRENT ARTICLE:**
${currentArticle}
${brandSection}
---

**ARTICLE METRICS ANALYSIS:**
${metricsContext}

---

${historySection}**USER INSTRUCTION:**
${userInstruction}

---

Now rewrite the ENTIRE article incorporating the user's instruction. Return ONLY the complete article in markdown format.`;

    try {
        if (onStream) {
            let fullText = '';
            const stream = callGeminiStream(modelName, prompt, {
                systemInstruction,
                ...(currentModelSettings.model.includes('gemini-3') ? { thinkingConfig: { thinkingBudget: ARTICLE_OPTIMIZER_THINKING_BUDGET } } : {}),
            });

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
            const response = await callGemini(modelName, prompt, {
                systemInstruction,
                ...(currentModelSettings.model.includes('gemini-3') ? { thinkingConfig: { thinkingBudget: ARTICLE_OPTIMIZER_THINKING_BUDGET } } : {}),
            });
            const text = response.text;
            if (!text) throw new Error("Empty response from AI for article optimization.");
            return text;
        });
    } catch (error) {
        console.error("Error optimizing article:", error);
        throw new Error("Failed to optimize article. Please try again.");
    }
};
