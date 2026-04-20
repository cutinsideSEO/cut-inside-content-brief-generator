// Shared JSON schemas for Gemini structured output
// Ported from frontend services/geminiService.ts
//
// Uses plain string type identifiers instead of @google/genai Type enum
// since Edge Functions call the REST API directly.

// ============================================
// Schema Type Constants (matching Gemini API)
// ============================================

const Type = {
  STRING: 'STRING',
  INTEGER: 'INTEGER',
  NUMBER: 'NUMBER',
  BOOLEAN: 'BOOLEAN',
  ARRAY: 'ARRAY',
  OBJECT: 'OBJECT',
} as const;

// ============================================
// Shared Schema Helpers
// ============================================

const reasoningItemSchema = (description: string) => ({
  type: Type.OBJECT,
  properties: {
    value: { type: Type.STRING, description },
    reasoning: { type: Type.STRING, description: "The reasoning behind this recommendation, referencing competitor data." }
  },
  required: ["value", "reasoning"]
});

// ============================================
// Step 1: Page Goal & Audience
// ============================================

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

const goalSchema = {
  type: Type.OBJECT,
  properties: {
    search_intent: searchIntentSchema,
    page_goal: reasoningItemSchema("A concise statement defining the primary purpose of the article."),
    target_audience: reasoningItemSchema("A description of the ideal reader for this content."),
    editorial_angle: reasoningItemSchema("A 1-2 sentence thesis the article champions. The specific position, framework, or argument that differentiates this article from SERP-average coverage. Derived from competitor gaps and the chosen audience.")
  },
  required: ["search_intent", "page_goal", "target_audience", "editorial_angle"]
};

// ============================================
// Step 2: Keyword Strategy
// ============================================

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

// ============================================
// Step 3: Competitor Insights
// ============================================

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

// ============================================
// Step 4: Content Gap Analysis
// ============================================

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

// ============================================
// Step 5: Article Structure (3-level hierarchy)
// ============================================

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
  section_angle: { type: Type.STRING, description: "One sentence stating the specific claim or angle this section stakes out. Not a topic restatement - the position the writer should write toward." },
  reasoning: { type: Type.STRING, description: "Why this heading is included." },
  targeted_keywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific keywords targeted by this heading." },
  competitor_coverage: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Competitor URLs covering this topic." },
  additional_resources: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of non-text resources needed." },
  featured_snippet_target: featuredSnippetTargetSchema,
  target_word_count: { type: Type.INTEGER, description: "Approximate word count target for this section." }
};

// Leaf node (Level 3, e.g. H4) - No children
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
  required: ["level", "heading", "guidelines", "reasoning", "targeted_keywords", "competitor_coverage"]
};

// Root node (Level 1, e.g. H2) - Can have Middle children
const outlineItemSchemaL1 = {
  type: Type.OBJECT,
  properties: {
    ...outlineBaseProperties,
    children: { type: Type.ARRAY, items: outlineItemSchemaL2, description: "Nested sub-sections." }
  },
  required: ["level", "heading", "guidelines", "reasoning", "targeted_keywords", "competitor_coverage"]
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
          items: outlineItemSchemaL1
        }
      },
      required: ["word_count_target", "outline", "reasoning"]
    }
  },
  required: ["article_structure"]
};

// ============================================
// Step 6: FAQs
// ============================================

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

// ============================================
// Step 7: On-Page SEO
// ============================================

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

// ============================================
// Schema Lookup
// ============================================

/**
 * Returns the Gemini JSON response schema for a given brief step.
 * @param step - The logical step number (1-7)
 * @returns The schema object for Gemini's responseSchema config
 */
export const getSchemaForStep = (step: number): object => {
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

// Export individual schemas for direct access if needed
export {
  goalSchema,
  keywordSchema,
  competitorInsightsSchema,
  contentGapSchema,
  structureSchema,
  faqSchema,
  seoSchema,
};
