// Article generation logic for Edge Functions
// Ported from frontend geminiService.ts generateArticleSection() + App.tsx handleStartContentGeneration()
//
// Key differences from frontend:
// - No streaming (backend generates section, saves to DB, Realtime pushes updates)
// - No AbortController — uses Edge Function timeout
// - Progress updates via callback (caller updates generation_jobs.progress)
// - Uses callGeminiDirect instead of callGemini/callGeminiStream

import type {
  ContentBrief,
  CompetitorPage,
  OutlineItem,
  FAQs,
  GeminiModel,
  ThinkingLevel,
  LengthConstraints,
  ArticleSectionParams,
} from './types.ts';

import { getContentGenerationPrompt } from './prompts.ts';
import {
  WC_PROMPT_MIN,
  WC_PROMPT_MAX,
  WC_STRICT_MIN,
  WC_STRICT_MAX,
  WC_EXPAND_THRESHOLD,
  WC_TRIM_STRICT,
  WC_TRIM_NONSTRICT,
} from './prompts.ts';
import { buildArticleGenerationConfig, TEMP_DETERMINISTIC } from './generation-config.ts';
import { callGeminiDirect, retryOperation } from './gemini-client.ts';
import { stripReasoningFromBrief, countWords, checkTokenBudget, estimateTokens } from './brief-context.ts';

const ARTICLE_SECTION_CALL_TIMEOUT_MS = 60_000;
const ARTICLE_SECTION_CALL_RETRIES = 2;
const ARTICLE_SECTION_RETRY_DELAY_MS = 1_500;
const ARTICLE_TRIM_CALL_TIMEOUT_MS = 45_000;
const ARTICLE_TRIM_CALL_RETRIES = 1;
const ARTICLE_TRIM_RETRY_DELAY_MS = 800;
const ARTICLE_TRIM_MODEL: GeminiModel = 'gemini-3-flash-preview';
const MAX_FINAL_TRIM_SECTIONS = 2;

// --- Competitor grounding (per-section excerpts) ---
// Excerpts ground each section in what ranking pages actually said so the writer
// can be more specific / take a clearer stance. Kept deliberately small to bound tokens.
/** Max number of competitor excerpts injected per section. */
const MAX_COMPETITORS_PER_SECTION = 3;
/** Max characters of body text per competitor excerpt. */
const COMPETITOR_EXCERPT_MAX_CHARS = 550;
/**
 * If the section prompt is already large (brief JSON + brand + lots of guidelines),
 * shrink the competitor block so we never blow up the per-section token budget.
 * Estimated in tokens (≈ chars / 4). Above this we drop to a single, shorter excerpt.
 */
const SECTION_PROMPT_TOKEN_SOFTCAP = 60000;
/** Total character ceiling for the combined competitor block in one section. */
const COMPETITOR_BLOCK_MAX_CHARS = MAX_COMPETITORS_PER_SECTION * COMPETITOR_EXCERPT_MAX_CHARS;

// ============================================
// Types
// ============================================

/** Progress callback for the article generation orchestrator */
export type ArticleProgressCallback = (progress: {
  currentSection: string;
  currentIndex: number;
  total: number;
  /** Partial article content so far */
  contentSoFar?: string;
  /** Set after a section is committed — triggers checkpoint write */
  completedSectionIndex?: number;
  /** Snapshot of contentParts array for resume */
  contentPartsSnapshot?: string[];
}) => Promise<void>;

/** Configuration for article generation job */
export interface ArticleJobConfig {
  brief: Partial<ContentBrief>;
  language: string;
  writerInstructions?: string;
  brandContext?: string;
  model: GeminiModel;
  thinkingLevel: ThinkingLevel;
  globalWordTarget: number | null;
  strictMode: boolean;
  /**
   * Optional competitor pages (with Full_Text/headings) used to ground each section
   * in what ranking pages actually said. Selected per section by
   * `competitor_coverage` URL match, with top-ranked fallback. Safe to omit —
   * when absent or empty, article generation behaves exactly as before.
   */
  competitors?: CompetitorPage[];
}

/** Result of article generation */
export interface ArticleResult {
  title: string;
  content: string;
  wordCount: number;
}

/** Resume state for continuing article generation after EF timeout */
export interface ArticleResumeState {
  partial_content: string[];
  completed_section_index: number;
}

// ============================================
// Helpers
// ============================================

/**
 * Flattens a nested outline into a single array (depth-first).
 * Mirrors App.tsx flattenOutline().
 */
export function flattenOutline(items: OutlineItem[]): OutlineItem[] {
  const flatList: OutlineItem[] = [];
  const recurse = (item: OutlineItem) => {
    flatList.push(item);
    if (item.children) {
      item.children.forEach(recurse);
    }
  };
  items.forEach(recurse);
  return flatList;
}

// ============================================
// Competitor grounding helpers
// ============================================

/** Normalizes a URL for loose matching (strip scheme, www, trailing slash, lowercase). */
function normalizeUrl(url: string): string {
  return (url || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

/** Collapses whitespace and trims a competitor body excerpt to a hard char cap. */
function makeExcerpt(text: string, maxChars: number): string {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim();
  if (cleaned.length <= maxChars) return cleaned;
  // Cut on a word boundary near the cap so we don't end mid-word.
  const slice = cleaned.slice(0, maxChars);
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > maxChars * 0.6 ? slice.slice(0, lastSpace) : slice) + '…';
}

/**
 * Selects up to {@link MAX_COMPETITORS_PER_SECTION} competitor pages relevant to a
 * section. Prefers the competitors named in `competitor_coverage` (matched by URL);
 * if coverage is empty or yields no matches, falls back to the highest Weighted_Score
 * competitors so every section still gets grounding. Only returns pages that have body
 * text to excerpt.
 */
function selectCompetitorsForSection(
  section: OutlineItem,
  competitors: CompetitorPage[],
): CompetitorPage[] {
  const withText = competitors.filter((c) => c.Full_Text && c.Full_Text.trim().length > 0);
  if (withText.length === 0) return [];

  const coverage = (section.competitor_coverage || [])
    .map(normalizeUrl)
    .filter(Boolean);

  const selected: CompetitorPage[] = [];
  const seen = new Set<string>();

  // 1) Competitors explicitly listed as covering this section.
  if (coverage.length > 0) {
    for (const c of withText) {
      const key = normalizeUrl(c.URL);
      if (!key || seen.has(key)) continue;
      if (coverage.some((cov) => cov === key || cov.includes(key) || key.includes(cov))) {
        selected.push(c);
        seen.add(key);
        if (selected.length >= MAX_COMPETITORS_PER_SECTION) return selected;
      }
    }
  }

  // 2) Fallback / top-up with highest-scored competitors so the section is still grounded.
  if (selected.length < MAX_COMPETITORS_PER_SECTION) {
    const ranked = [...withText].sort((a, b) => (b.Weighted_Score || 0) - (a.Weighted_Score || 0));
    for (const c of ranked) {
      const key = normalizeUrl(c.URL);
      if (!key || seen.has(key)) continue;
      selected.push(c);
      seen.add(key);
      if (selected.length >= MAX_COMPETITORS_PER_SECTION) break;
    }
  }

  return selected;
}

/**
 * Builds the per-section competitor-grounding prompt block. Returns '' when there is
 * nothing useful to add (graceful no-op). Token-bounded: the number and size of
 * excerpts shrink when the rest of the section prompt is already large.
 *
 * @param baseTokenEstimate rough token count of the section prompt built so far,
 *   used to decide how aggressively to shrink the competitor block.
 */
function buildCompetitorExcerptInstruction(
  section: OutlineItem,
  competitors: CompetitorPage[] | undefined,
  baseTokenEstimate: number,
): string {
  if (!competitors || competitors.length === 0) return '';

  const selected = selectCompetitorsForSection(section, competitors);
  if (selected.length === 0) return '';

  // When the section prompt is already heavy, keep grounding minimal: one shorter excerpt.
  const heavyPrompt = baseTokenEstimate > SECTION_PROMPT_TOKEN_SOFTCAP;
  const perCompetitorCap = heavyPrompt
    ? Math.round(COMPETITOR_EXCERPT_MAX_CHARS / 2)
    : COMPETITOR_EXCERPT_MAX_CHARS;
  const maxCompetitors = heavyPrompt ? 1 : MAX_COMPETITORS_PER_SECTION;

  let budgetRemaining = COMPETITOR_BLOCK_MAX_CHARS;
  const entries: string[] = [];
  for (const c of selected.slice(0, maxCompetitors)) {
    if (budgetRemaining <= 0) break;
    const cap = Math.min(perCompetitorCap, budgetRemaining);
    const excerpt = makeExcerpt(c.Full_Text, cap);
    if (!excerpt) continue;
    budgetRemaining -= excerpt.length;
    entries.push(`- **${c.URL}:** "${excerpt}"`);
  }

  if (entries.length === 0) return '';

  return `
---

**HOW RANKING PAGES CURRENTLY HANDLE THIS SECTION (competitor excerpts):**
These are short excerpts from pages currently ranking for this topic. Use them only as a baseline to beat — be MORE specific, take a CLEARER stance, and fill the gaps they leave. Do NOT copy their phrasing, repeat their structure, or mention them. The section angle and guidelines above remain the primary instruction.
${entries.join('\n')}
`;
}

// ============================================
// Section Generation (server-side)
// ============================================

/**
 * Generates a single article section.
 * Server-side port of geminiService.ts generateArticleSection().
 * No streaming — returns the full section text.
 */
async function generateSectionContent(
  params: ArticleSectionParams
): Promise<string> {
  const {
    brief,
    contentSoFar,
    sectionToWrite,
    upcomingHeadings,
    language,
    writerInstructions,
    brandContext,
    competitors,
    model,
    globalWordTarget,
    wordsWrittenSoFar,
    totalSections,
    currentSectionIndex,
    strictMode,
  } = params;

  const systemInstruction = getContentGenerationPrompt(language, writerInstructions, brief.search_intent?.type);

  // Editorial angle (article-wide thesis, Phase 2)
  let editorialAngleInstruction = '';
  if (brief.editorial_angle?.value) {
    editorialAngleInstruction = `
---

**EDITORIAL ANGLE (the thesis this article champions):**
${brief.editorial_angle.value}

Keep the article consistent with this angle. If a section guideline would pull against the angle, follow the angle.
`;
  }

  // Differentiation directive (Phase 2) - recurring competitor weaknesses
  let differentiationInstruction = '';
  const badPointBuckets = brief.competitor_insights?.competitor_breakdown
    ?.flatMap((c) => c.bad_points || [])
    .map((p) => p.trim())
    .filter(Boolean) || [];
  if (badPointBuckets.length > 0) {
    const seen = new Set<string>();
    const topBadPoints: string[] = [];
    for (const point of badPointBuckets) {
      const key = point.toLowerCase().replace(/\s+/g, ' ').slice(0, 120);
      if (seen.has(key)) continue;
      seen.add(key);
      topBadPoints.push(point);
      if (topBadPoints.length >= 5) break;
    }
    if (topBadPoints.length > 0) {
      differentiationInstruction = `
---

**DIFFERENTIATION DIRECTIVE - what competitors get wrong:**
These are the recurring weaknesses in the competing content. Where this section covers the same topic, close these gaps explicitly. Do not list them as complaints about competitors - just write better on these points:
${topBadPoints.map((p) => `- ${p}`).join('\n')}
`;
    }
  }

  // Section angle (per-section thesis, Phase 2)
  let sectionAngleInstruction = '';
  if (sectionToWrite.section_angle && sectionToWrite.section_angle.trim()) {
    sectionAngleInstruction = `
---

**SECTION ANGLE (the specific claim this section stakes out):**
${sectionToWrite.section_angle.trim()}

Write toward this claim. The guidelines below are tactical; the section angle is the argument they serve.
`;
  }

  // Featured snippet instruction
  let featuredSnippetInstruction = '';
  if (sectionToWrite.featured_snippet_target?.is_target) {
    const format = sectionToWrite.featured_snippet_target.format;
    const targetQuery = sectionToWrite.featured_snippet_target.target_query;
    featuredSnippetInstruction = `
---

**FEATURED SNIPPET TARGET:**
This section should be optimized to win a featured snippet for the query: "${targetQuery || sectionToWrite.heading}"

Format your answer as a **${format.toUpperCase()}**:
${format === 'paragraph' ? '- Write a concise, direct answer in 40-60 words that directly answers the query in the first 1-2 sentences.' : ''}
${format === 'list' ? '- Structure the content as a numbered or bulleted list with 5-8 clear, actionable items.' : ''}
${format === 'table' ? '- Present the information in a clear markdown table format with appropriate headers.' : ''}
`;
  }

  // Word count instruction
  let wordCountInstruction = '';
  const sectionHasTarget = sectionToWrite.target_word_count && sectionToWrite.target_word_count > 0;

  if (globalWordTarget && globalWordTarget > 0) {
    const wordsRemaining = Math.max(0, globalWordTarget - (wordsWrittenSoFar || 0));
    const sectionsRemaining = Math.max(1, (totalSections || 1) - (currentSectionIndex || 0));
    const suggestedWords = Math.round(wordsRemaining / sectionsRemaining);
    const effectiveTarget = sectionHasTarget ? sectionToWrite.target_word_count! : suggestedWords;

    if (strictMode) {
      wordCountInstruction = `
---

**STRICT WORD COUNT LIMIT — THIS IS MANDATORY:**
- Total article target: ${globalWordTarget} words
- Words written so far: ${wordsWrittenSoFar || 0}
- Words remaining in budget: ${wordsRemaining}
- **YOU MUST write EXACTLY between ${Math.round(effectiveTarget * WC_STRICT_MIN)} and ${Math.round(effectiveTarget * WC_STRICT_MAX)} words for this section. Do NOT go outside this range.**
- Going over budget will make the article too long. Be concise and focused.
`;
    } else {
      wordCountInstruction = `
---

**WORD COUNT REQUIREMENT:**
- Total article target: ${globalWordTarget} words
- Words written so far: ${wordsWrittenSoFar || 0}
- Words remaining in budget: ${wordsRemaining}
- You MUST write between **${Math.round(effectiveTarget * WC_PROMPT_MIN)} and ${Math.round(effectiveTarget * WC_PROMPT_MAX)} words** for this section (target: ${effectiveTarget}).
`;
    }
  } else if (sectionHasTarget) {
    wordCountInstruction = `
---

**WORD COUNT REQUIREMENT:**
You MUST write between **${Math.round(sectionToWrite.target_word_count! * WC_PROMPT_MIN)} and ${Math.round(sectionToWrite.target_word_count! * WC_PROMPT_MAX)} words** for this section (target: ${sectionToWrite.target_word_count}).
`;
  }

  // E-E-A-T signals
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

**E-E-A-T SIGNALS — WEAVE THESE INTO YOUR WRITING:**
Where naturally relevant to this section, incorporate the following credibility signals:
${bullets.map(b => `- ${b}`).join('\n')}

Do NOT force every signal into every section. Only include signals that fit organically with this section's topic.
`;
    }
  }

  // Validation improvements
  let validationInstruction = '';
  if (brief.validation?.improvements && brief.validation.improvements.length > 0) {
    const relevantImprovements = brief.validation.improvements.filter(imp => {
      const sectionLower = sectionToWrite.heading.toLowerCase();
      const impSectionLower = imp.section.toLowerCase();
      return impSectionLower === 'general' ||
             impSectionLower === 'overall' ||
             sectionLower.includes(impSectionLower) ||
             impSectionLower.includes(sectionLower.split(':')[0].trim());
    });

    const improvementsToShow = (currentSectionIndex === 0)
      ? brief.validation.improvements
      : relevantImprovements;

    if (improvementsToShow.length > 0) {
      validationInstruction = `
---

**BRIEF QUALITY ISSUES — COMPENSATE IN YOUR WRITING:**
A validation pass identified these gaps in the brief. Address them in your writing where relevant:
${improvementsToShow.map(imp => `- **${imp.section}:** ${imp.issue} → ${imp.suggestion}`).join('\n')}
`;
    }
  }

  // Additional resources
  let resourcesInstruction = '';
  if (sectionToWrite.additional_resources && sectionToWrite.additional_resources.length > 0) {
    resourcesInstruction = `
---

**MEDIA PLACEHOLDERS TO INSERT:**
After writing the text, include these placeholder comments where appropriate:
${sectionToWrite.additional_resources.map(r => `<!-- [RESOURCE: ${r}] -->`).join('\n')}

Place each placeholder at a logical position within the section where that resource would enhance the content.
`;
  }

  // Brand context
  let brandInstruction = '';
  if (brandContext) {
    brandInstruction = `
---

**BRAND VOICE & GUIDELINES (match this tone and style):**
${brandContext}
`;
  }

  // Competitor grounding (per-section excerpts from ranking pages).
  // Bounded against the heaviest prompt contributors (brief JSON + brand + content so far)
  // so a large section context shrinks the competitor block instead of overflowing.
  const briefJson = JSON.stringify(stripReasoningFromBrief(brief), null, 2);
  const baseTokenEstimate = estimateTokens(briefJson + brandInstruction + contentSoFar);
  const competitorExcerptInstruction = buildCompetitorExcerptInstruction(
    sectionToWrite,
    competitors,
    baseTokenEstimate,
  );

  const prompt = `
**FULL CONTENT BRIEF (JSON, reasoning fields stripped for brevity):**
${briefJson}
${editorialAngleInstruction}
${differentiationInstruction}

---

**CONTENT WRITTEN SO FAR:**
${contentSoFar.slice(-16000)}
${brandInstruction}

---

**CURRENT SECTION TO WRITE:**
- **Heading:** ${sectionToWrite.heading}
- **Keywords to include:** ${sectionToWrite.targeted_keywords?.join(', ') || 'None specified'}
${sectionAngleInstruction}
- **Guidelines:**
${sectionToWrite.guidelines.map(g => `  - ${g}`).join('\n')}
${featuredSnippetInstruction}
${wordCountInstruction}
${resourcesInstruction}
${eeatInstruction}
${validationInstruction}
${competitorExcerptInstruction}

---

**UPCOMING HEADINGS (FOR CONTEXT):**
${upcomingHeadings.length > 0 ? upcomingHeadings.join('\n') : 'This is the last section.'}

---

Now, write the body content for the current section.
`;

  checkTokenBudget('generateArticleSection', prompt);

  const genConfig = buildArticleGenerationConfig(model);

  return await retryOperation(async () => {
    const response = await callGeminiDirect(model, prompt, {
      systemInstruction,
      ...(genConfig.thinkingConfig ? { thinkingConfig: genConfig.thinkingConfig as { thinkingBudget: number } } : {}),
      ...(typeof genConfig.temperature === 'number' ? { temperature: genConfig.temperature } : {}),
    });
    const text = response.text;
    if (!text) throw new Error('Received an empty response from the AI for article section generation.');
    return text;
  }, ARTICLE_SECTION_CALL_RETRIES, ARTICLE_SECTION_RETRY_DELAY_MS, ARTICLE_SECTION_CALL_TIMEOUT_MS);
}

// ============================================
// Trim Section
// ============================================

/**
 * Trims a section to target word count using AI condensation.
 * Server-side port of geminiService.ts trimSectionToWordCount().
 */
async function trimSectionToWordCount(
  content: string,
  targetWords: number,
  language: string,
  sectionHeading: string,
): Promise<string> {
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
      const response = await callGeminiDirect(ARTICLE_TRIM_MODEL, prompt, {
        thinkingConfig: { thinkingBudget: 512 },
        // Condensing is a deterministic task — keep temperature low.
        temperature: TEMP_DETERMINISTIC,
      });
      const text = response.text;
      if (!text) throw new Error('Empty response from AI for section trimming.');
      return text.trim();
    }, ARTICLE_TRIM_CALL_RETRIES, ARTICLE_TRIM_RETRY_DELAY_MS, ARTICLE_TRIM_CALL_TIMEOUT_MS);
  } catch (error) {
    console.warn('Error trimming section, returning original content:', error);
    return content;
  }
}

// ============================================
// Main Article Generation Orchestrator
// ============================================

/**
 * Generates a full article from a content brief.
 * Server-side port of App.tsx handleStartContentGeneration().
 *
 * Processes sections sequentially:
 * 1. Generate each section with word count enforcement
 * 2. Post-generation expand (if under 70% target)
 * 3. Post-generation trim (if over 120%/150% target)
 * 4. Generate FAQ sections
 * 5. Final global trim pass
 *
 * @param config - Article generation configuration
 * @param onProgress - Optional callback for progress updates
 * @returns The complete article with title and content
 */
export async function generateFullArticle(
  config: ArticleJobConfig,
  onProgress?: ArticleProgressCallback,
  resumeState?: ArticleResumeState,
): Promise<ArticleResult> {
  const {
    brief,
    language,
    writerInstructions,
    brandContext,
    competitors,
    model,
    globalWordTarget,
    strictMode,
  } = config;

  if (!brief.article_structure) {
    throw new Error('Cannot generate article without an article structure in the brief.');
  }

  const allSections = flattenOutline(brief.article_structure.outline);

  // Initialize with H1
  const initialTitle = brief.on_page_seo?.h1?.value
    || brief.keyword_strategy?.primary_keywords?.[0]?.keyword
    || 'Untitled Article';

  // Resume support: restore contentParts from previous partial run
  const contentParts: string[] = resumeState?.partial_content
    ? [...resumeState.partial_content]
    : [`# ${initialTitle}\n\n`];
  const resumeFromIndex = resumeState?.completed_section_index ?? -1;

  if (resumeState) {
    console.log(`Resuming article generation from section index ${resumeFromIndex} (${contentParts.length} content parts saved)`);
  }

  const totalSectionsWithFaqs = allSections.length + (brief.faqs?.questions?.length || 0);

  // ==========================================
  // PHASE 1: Generate main sections
  // ==========================================
  for (let i = 0; i < allSections.length; i++) {
    // Skip sections already completed in a previous invocation
    if (i <= resumeFromIndex) continue;

    const section = allSections[i];
    const fullContent = contentParts.join('');

    if (onProgress) {
      await onProgress({
        currentSection: section.heading,
        currentIndex: i + 1,
        total: totalSectionsWithFaqs,
        contentSoFar: fullContent,
      });
    }

    const upcomingHeadings = allSections.slice(i + 1, i + 4).map(s =>
      `${'#'.repeat(s.level.startsWith('H') ? parseInt(s.level.substring(1), 10) : 2)} ${s.heading}`
    );

    const headingLevel = section.level.startsWith('H') ? parseInt(section.level.substring(1), 10) : 2;
    const heading = `${'#'.repeat(headingLevel)} ${section.heading}\n\n`;

    // Generate section content
    let sectionBody = await generateSectionContent({
      brief,
      contentSoFar: fullContent + heading,
      sectionToWrite: section,
      upcomingHeadings,
      language,
      writerInstructions,
      brandContext,
      competitors,
      model,
      thinkingLevel: config.thinkingLevel,
      globalWordTarget,
      wordsWrittenSoFar: countWords(fullContent),
      totalSections: allSections.length,
      currentSectionIndex: i,
      strictMode,
    });

    // Post-generation expand: if under 70% of target, regenerate once
    const sectionTarget = section.target_word_count || 0;
    if (sectionTarget > 0) {
      const sectionWords = countWords(sectionBody);
      if (sectionWords < sectionTarget * WC_EXPAND_THRESHOLD) {
        console.log(`Expanding "${section.heading}": ${sectionWords} words < 70% of ${sectionTarget} target`);

        if (onProgress) {
          await onProgress({
            currentSection: `Expanding: ${section.heading}`,
            currentIndex: i + 1,
            total: totalSectionsWithFaqs,
          });
        }

        sectionBody = await generateSectionContent({
          brief,
          contentSoFar: fullContent + heading,
          sectionToWrite: {
            ...section,
            guidelines: [
              ...section.guidelines,
              `CRITICAL: Your previous attempt was only ${sectionWords} words. You MUST write at least ${Math.round(sectionTarget * 0.85)} words for this section. Expand with more detail, examples, and depth.`,
            ],
          },
          upcomingHeadings,
          language,
          writerInstructions,
          brandContext,
          competitors,
          model,
          thinkingLevel: config.thinkingLevel,
          globalWordTarget,
          wordsWrittenSoFar: countWords(fullContent),
          totalSections: allSections.length,
          currentSectionIndex: i,
          strictMode,
        });
      }
    }

    // Post-generation trim: if over threshold, trim
    if (sectionTarget > 0) {
      const sectionWords = countWords(sectionBody);
      const shouldTrim = strictMode
        ? sectionWords > sectionTarget * WC_TRIM_STRICT
        : sectionWords > sectionTarget * WC_TRIM_NONSTRICT;

      if (shouldTrim) {
        console.log(`Trimming "${section.heading}": ${sectionWords} → ~${sectionTarget} words`);

        if (onProgress) {
          await onProgress({
            currentSection: `Trimming: ${section.heading}`,
            currentIndex: i + 1,
            total: totalSectionsWithFaqs,
          });
        }

        sectionBody = await trimSectionToWordCount(sectionBody, sectionTarget, language, section.heading);
      }
    }

    contentParts.push(heading + sectionBody);
    contentParts.push('\n\n');

    // Checkpoint: save partial state for resume after EF timeout
    if (onProgress) {
      await onProgress({
        currentSection: section.heading,
        currentIndex: i + 1,
        total: totalSectionsWithFaqs,
        contentSoFar: contentParts.join(''),
        completedSectionIndex: i,
        contentPartsSnapshot: [...contentParts],
      });
    }
  }

  // ==========================================
  // PHASE 2: Generate FAQ sections
  // ==========================================
  if (brief.faqs?.questions?.length && brief.faqs.questions.length > 0) {
    const faqHeading = `## Frequently Asked Questions\n\n`;
    // Only push FAQ heading if we haven't already (on resume, it's in partial_content)
    if (resumeFromIndex < allSections.length) {
      contentParts.push(faqHeading);
    }

    const fullContentBeforeFaqs = contentParts.join('');
    const wordsBeforeFaqs = countWords(fullContentBeforeFaqs);
    const faqCount = brief.faqs.questions.length;
    const faqBudget = globalWordTarget ? Math.max(0, globalWordTarget - wordsBeforeFaqs) : 0;
    const perFaqBudget = faqBudget > 0 ? Math.round(faqBudget / faqCount) : 80;

    for (let i = 0; i < brief.faqs.questions.length; i++) {
      // Skip FAQs already completed in a previous invocation
      const flatIndex = allSections.length + i;
      if (flatIndex <= resumeFromIndex) continue;

      const faq = brief.faqs.questions[i];
      const fullContent = contentParts.join('');

      if (onProgress) {
        await onProgress({
          currentSection: `FAQ: ${faq.question}`,
          currentIndex: allSections.length + 1 + i,
          total: totalSectionsWithFaqs,
          contentSoFar: fullContent,
        });
      }

      const faqHeadingText = `### ${faq.question}\n\n`;
      const faqGuidelines = [...faq.guidelines, `Target approximately ${perFaqBudget} words for this FAQ answer.`];

      let faqBody = await generateSectionContent({
        brief,
        contentSoFar: fullContent + faqHeadingText,
        sectionToWrite: {
          heading: `Answer the question: ${faq.question}`,
          guidelines: faqGuidelines,
          level: 'H3',
          reasoning: 'Answering a user FAQ',
          target_word_count: perFaqBudget,
          children: [],
          targeted_keywords: [],
          competitor_coverage: [],
        },
        upcomingHeadings: [],
        language,
        writerInstructions,
        brandContext,
        model,
        thinkingLevel: config.thinkingLevel,
        globalWordTarget,
        wordsWrittenSoFar: countWords(fullContent),
        totalSections: allSections.length + faqCount,
        currentSectionIndex: allSections.length + i,
        strictMode,
      });

      // Auto-trim over-budget FAQs
      if (perFaqBudget > 0) {
        const faqWords = countWords(faqBody);
        const faqTrimThreshold = strictMode ? WC_TRIM_STRICT : WC_TRIM_NONSTRICT;
        if (faqWords > perFaqBudget * faqTrimThreshold) {
          console.log(`Trimming FAQ "${faq.question}": ${faqWords} → ~${perFaqBudget} words`);

          if (onProgress) {
            await onProgress({
              currentSection: `Trimming FAQ: ${faq.question}`,
              currentIndex: allSections.length + 1 + i,
              total: totalSectionsWithFaqs,
            });
          }

          faqBody = await trimSectionToWordCount(faqBody, perFaqBudget, language, faq.question);
        }
      }

      contentParts.push(faqHeadingText + faqBody);
      contentParts.push('\n\n');

      // Checkpoint: save partial state for resume after EF timeout
      if (onProgress) {
        await onProgress({
          currentSection: `FAQ: ${faq.question}`,
          currentIndex: allSections.length + 1 + i,
          total: totalSectionsWithFaqs,
          contentSoFar: contentParts.join(''),
          completedSectionIndex: flatIndex,
          contentPartsSnapshot: [...contentParts],
        });
      }
    }
  }

  // ==========================================
  // PHASE 3: Final global trim
  // ==========================================
  if (globalWordTarget && globalWordTarget > 0) {
    let fullContent = contentParts.join('');
    const totalWords = countWords(fullContent);
    const maxAllowed = Math.round(globalWordTarget * WC_PROMPT_MAX);

    if (totalWords > maxAllowed) {
      console.log(`Final trim: ${totalWords} words > ${maxAllowed} max (target ${globalWordTarget})`);

      if (onProgress) {
        await onProgress({
          currentSection: 'Trimming article to target word count...',
          currentIndex: totalSectionsWithFaqs,
          total: totalSectionsWithFaqs,
        });
      }

      // Find the most over-budget sections to trim
      const sectionOverages: { index: number; heading: string; overage: number; body: string; target: number }[] = [];
      for (let idx = 0; idx < contentParts.length; idx++) {
        const part = contentParts[idx];
        if (!part || part.trim().length < 20) continue;
        const lines = part.split('\n');
        const headingLine = lines.find(l => l.startsWith('#'));
        if (!headingLine) continue;
        const bodyText = lines.filter(l => !l.startsWith('#')).join('\n').trim();
        if (!bodyText) continue;
        const bodyWords = countWords(bodyText);
        const matchedSection = allSections.find(s => headingLine.includes(s.heading));
        const sTarget = matchedSection?.target_word_count || 0;
        if (sTarget > 0 && bodyWords > sTarget) {
          sectionOverages.push({ index: idx, heading: matchedSection!.heading, overage: bodyWords - sTarget, body: bodyText, target: sTarget });
        }
      }

      // Sort by overage (worst first) and trim a small bounded set to stay within EF time budgets.
      sectionOverages.sort((a, b) => b.overage - a.overage);
      const sectionsToTrim = sectionOverages.slice(0, MAX_FINAL_TRIM_SECTIONS);

      for (let trimIndex = 0; trimIndex < sectionsToTrim.length; trimIndex++) {
        const sec = sectionsToTrim[trimIndex];
        if (onProgress) {
          await onProgress({
            currentSection: `Final trim (${trimIndex + 1}/${sectionsToTrim.length}): ${sec.heading}`,
            currentIndex: totalSectionsWithFaqs,
            total: totalSectionsWithFaqs,
          });
        }
        const trimmedContent = await trimSectionToWordCount(sec.body, sec.target, language, sec.heading);
        const headingLine = contentParts[sec.index].split('\n').find(l => l.startsWith('#')) || '';
        contentParts[sec.index] = headingLine + '\n\n' + trimmedContent;
      }

      if (sectionsToTrim.length > 0) {
        fullContent = contentParts.join('');
        console.log(`After final trim: ${countWords(fullContent)} words`);
      }
    }
  }

  const finalContent = contentParts.join('');

  return {
    title: initialTitle,
    content: finalContent,
    wordCount: countWords(finalContent),
  };
}
