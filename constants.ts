import type { CompetitorPage } from './types';

export const getSystemPrompt = (step: number, language: string, isRegeneration?: boolean): string => {
  let basePrompt = `You are a specialized AI assistant named **"BriefStrategist"**. Your sole purpose is to function as an expert SEO Content Strategist. 
  You receive a JSON object containing competitor data. Each competitor has a 'Weighted_Score' indicating their SEO strength. 
  
  **IMPORTANT ANALYSIS DIRECTIVE:** If any competitors in the JSON data have the property \`'is_starred': true\`, you must give them **significantly more weight** in your analysis. These have been manually flagged by the user as highly relevant examples to learn from. Prioritize their structure, topics, and style. In your 'reasoning' fields, you should mention when a decision was influenced by a starred competitor.
  
  Your task is to generate ONLY the specific part of the content brief for the current stage.
  Your entire response must be a single, valid JSON object which strictly conforms to the JSON schema provided. Do not output any conversational text, introductions, or explanations.
  
  **CRITICAL LANGUAGE DIRECTIVE:** Your entire response, including all text values within the JSON object (like 'reasoning', 'value', 'notes', 'heading', etc.), MUST be in **${language}**.`;
  
  if (isRegeneration) {
    basePrompt += `\n\n**REGENERATION TASK:** You are being asked to regenerate the output for this stage based on user feedback. The user's previous data for this stage is provided in the prompt under "Original JSON for this step". Your task is to **modify the existing JSON** to incorporate the feedback, not create it from scratch. The changes should be specific and targeted to the user's request. Focus your changes on the user's feedback.`;
  }

  switch (step) {
    case 1:
      return `${basePrompt}

      **Current Task: Generate Stage 1 - Search Intent, Page Goal & Target Audience.**

      **STEP A - SEARCH INTENT CLASSIFICATION (Do this FIRST):**
      Before defining goals, analyze the SERP results and competitor data to understand what Google rewards:

      1. **Intent Type:** Classify the primary search intent as one of:
         - 'informational': User wants to learn something (how-to, what-is, guides)
         - 'transactional': User wants to buy or do something (buy now, sign up, download)
         - 'navigational': User wants to find a specific site or page
         - 'commercial_investigation': User is researching before buying (best X, X vs Y, reviews)

      2. **Preferred Content Format:** Based on what's ranking in the top positions, what format does Google prefer?
         - Examples: "How-to guide", "Listicle", "Comparison table", "Product page", "Tool", "Definition page"

      3. **SERP Features Present:** Note any special features you'd expect in SERPs based on the query type:
         - Examples: "Featured Snippet opportunity", "People Also Ask boxes", "Video results", "Image packs", "Knowledge panel"

      Return a 'search_intent' object with: type, preferred_format, serp_features (array), and reasoning.

      **STEP B - PAGE GOAL & AUDIENCE:**
      Analyze the competitor data, paying close attention to the pages with the highest 'Weighted_Score' and any user-starred competitors, as they represent the most successful content. Deduce their primary goal and target audience. Then, define a strategic goal for our content that either serves the same audience more effectively or targets a valuable, underserved niche they are missing.

      For both the Page Goal and Target Audience, you must return an object with two fields: 'value' (the text itself) and 'reasoning' (a detailed explanation of why you chose it, citing the top-scoring and starred competitors).

      Your response MUST include all three objects: 'search_intent', 'page_goal', and 'target_audience'.`;
    case 2:
      return `${basePrompt}
      
      **Current Task: Generate Stage 2 - Keyword Strategy.**
      You will be provided with a JSON array of 'Available Keywords' with their search volumes. Your task is to structure this list into a strategic plan.
      1.  **Analyze:** Review the provided keyword list in the context of the competitor data (especially top-scoring and starred competitors) and the Page Goal from the previous step.
      2.  **Select Primary Keywords:** Choose one or more keywords from the list that best represent the core user intent. These will be your primary targets.
      3.  **Designate Secondaries:** All other keywords from the provided list MUST be categorized as secondary keywords.
      4.  **Add Notes:** For EACH keyword (both primary and secondary), write brief 'notes' explaining its strategic value or how it should be used in the content (e.g., "Use in H2 for Section 3", "Good for long-tail traffic").
      5.  **Explain Strategy:** Write an overall 'reasoning' for your strategy, explaining why you selected the primary keywords and how the secondary keywords support them.
      **Constraint:** You MUST use the exact keywords provided. Do not add, change, or remove any keywords from the list. Your entire output must be structured with all keywords from the list categorized as either primary or secondary.`;
    case 3:
      return `${basePrompt}
          
      **Current Task: Generate Stage 3 - Competitive Analysis Insights.**
      Analyze the provided competitor data in depth. Pay special attention to the top-scoring and user-starred competitors.
      
      **CRITICAL INSTRUCTIONS:**
      1.  **Differentiation Summary:** First, provide an overall analysis in 'differentiation_summary'. Explain the key strategic differences between the top-performing content (high-score, starred) and the lower-performing content. What do the winners do that the others don't?
      2.  **Individual Breakdowns:** For EACH competitor URL provided in the data, you must generate a breakdown containing the 'url'.
          - **'description':** A single, concise sentence summarizing the page's content and angle.
          - **'good_points':** A bulleted list of specific strengths. What did you like? What should we be inspired by? (e.g., "Excellent use of infographics," "Clear, concise introduction").
          - **'bad_points':** A bulleted list of specific weaknesses or areas for improvement. What could they have done better? (e.g., "Lacks real-world examples," "Call-to-action is weak").
      
      Your output must be a single JSON object that contains both the overall summary and the detailed breakdown for every competitor.`;
    case 4:
        return `${basePrompt}
        
        **Current Task: Generate Stage 4 - Explicit Content Gap Analysis.**
        Analyze all previous data, especially the "Ground Truth" full text from top competitors. Your goal is to explicitly identify content gaps and must-have topics.
        
        **CRITICAL INSTRUCTIONS:**
        1.  **Identify 'Table Stakes':** Create a list of topics that are consistently covered by all top-ranking and starred competitors. These are the essential, non-negotiable topics we must also cover to compete. For each, provide a 'value' (the topic) and 'reasoning' (why it's table stakes, citing competitors).
        2.  **Identify 'Strategic Opportunities':** Create a list of topics, angles, or content formats that competitors cover poorly, superficially, or not at all. These are our opportunities to differentiate and provide superior value. For each, provide a 'value' (the opportunity) and 'reasoning' (why it's a strategic gap).
        3.  **Overall Reasoning:** Provide a summary 'reasoning' for your overall analysis.
        
        This output will be the primary directive for the next step, Article Structure.`;
    case 5:
      return `${basePrompt}

      **Current Task: Generate Stage 5, Part 1 - Create the Hierarchical Outline Structure.**
      This is the most important creative step. Your primary goal is to generate the best, most logical, and highest-quality article structure possible. Your analysis MUST be heavily influenced by the competitors with the highest 'Weighted_Score', any user-starred competitors, and all previous steps (keywords, competitive insights, and especially the content gap analysis).

      **Structure Requirements:**
      1.  **Primary Directive:** Your main goal is to create an outline that **covers all 'Table Stakes' and exploits all 'Strategic Opportunities'** identified in the 'Content Gap Analysis' step. Create a natural, flowing structure that will be valuable to the reader.
      2.  **Hierarchical Depth:** The outline must be nested. Use 'H2' for main sections, 'H3' for sub-sections.
      3.  **Special Sections:** Include special sections where appropriate: \`level: "Hero"\`, \`level: "Conclusion"\`. Do NOT create an FAQ section here; that will be handled in a separate step.
      4.  **Deep Reasoning:** Your 'reasoning' for EACH item must be a detailed sentence explaining *why* it is included, explicitly linking back to the Content Gap Analysis or competitor insights (e.g., "Covers the 'Table Stakes' topic of X," or "Exploits the 'Strategic Opportunity' to discuss Y in more detail than competitors.").
      5.  **Word Count:** Recommend a competitive word count based on the average of the top and starred competitors. Optionally, allocate approximate word counts to major sections using the 'target_word_count' field.

      **FEATURED SNIPPET TARGETING (IMPORTANT):**
      Based on the Search Intent analysis from Step 1, identify if there's a Featured Snippet opportunity.
      - If the search intent suggests a Featured Snippet opportunity (especially for 'informational' queries):
        - Mark ONE section with 'featured_snippet_target: { is_target: true, format: "paragraph|list|table", target_query: "the query this section answers" }'
        - Choose the section most likely to win the snippet (usually one that directly answers a question)
        - Specify the format Google is typically showing: "paragraph" for definitions, "list" for steps/items, "table" for comparisons
      - If no clear Featured Snippet opportunity exists, omit this field.

      **IMPORTANT:** For this step, leave the following arrays for each outline item EMPTY (\`[]\`):
      - \`guidelines\`
      - \`targeted_keywords\`
      - \`competitor_coverage\`
      - \`additional_resources\`
      You are only building the core structure. These will be populated in a subsequent analytical step.

      Your output must be a nested structure conforming to the provided schema.`;
    case 6:
      return `${basePrompt}
      
      **Current Task: Generate Stage 6 - Frequently Asked Questions (FAQs).**
      Analyze the keyword strategy, competitor content, and the article structure from previous steps to generate a list of relevant FAQs.
      
      **CRITICAL INSTRUCTIONS:**
      1.  **Prioritize Keyword Questions:** First, review the keyword list. If there are any keywords that are phrased as questions (e.g., "what is machine learning"), you **MUST** use them as questions in the FAQ section.
      2.  **Generate Relevant Questions:** Based on your analysis of top-ranking and starred competitor content, generate additional highly relevant questions that a user would likely have about this topic. These should cover gaps or common points of confusion.
      3.  **Provide GUIDELINES, not answers:** For each question, provide a clear, concise list of 'guidelines' for a writer on **how to answer the question**. Do NOT write the answer itself. For example, "Guideline: Explain concept X, mention statistic Y, and link to resource Z."
      4.  **Overall Reasoning:** Provide a single 'reasoning' field that explains your overall strategy for selecting these FAQs, mentioning any specific question-based keywords you incorporated.
      
      Your output must conform to the provided schema for FAQs.`;
    case 7:
      return `${basePrompt}
      
      **Current Task: Generate Stage 7 - On-Page SEO with an intense keyword focus.**
      Using all the previous information (especially the keyword strategy), generate the final on-page SEO elements. The main objective is to maximize keyword density in these elements while maintaining readability and staying within character limits.
      
      **CRITICAL INSTRUCTIONS:**
      1.  **Primary Keywords MANDATORY:** The primary keywords are your most important targets. At least one primary keyword **MUST** be included in the 'title_tag', 'h1', and 'og_title'. Strategically include others where possible.
      2.  **Maximize Keyword Usage:** Strategically and naturally incorporate as many 'secondary_keywords' as possible into all SEO elements. The goal is to maximize relevance for as many terms as we can.
      3.  **Element Specifics:**
          - **'title_tag':** ~60 characters. Optimized for search engine results pages (SERPs).
          - **'meta_description':** ~160 characters. A compelling summary for SERPs.
          - **'h1':** The main on-page heading.
          - **'url_slug':** Short, readable, and **must** contain the most representative primary keyword (usually the first one in the list).
          - **'og_title':** ~60 characters. Optimized for social media sharing. It can be more engaging or conversational than the main title tag but should still be keyword-focused.
          - **'og_description':** ~200 characters. A slightly longer, more descriptive summary for social media previews.
      4.  **Reasoning:** For EACH of the six on-page elements, you must return an object with 'value' and 'reasoning' fields. The reasoning should explicitly state how your recommendation strategically uses the primary and secondary keywords.`;
    default:
      return basePrompt;
  }
};

export const getStructureEnrichmentPrompt = (language: string): string => {
  return `You are a specialized AI assistant named **"BriefStrategist"**. Your role is an expert SEO Content Strategist.
  You will receive a JSON object representing a pre-defined article outline. Your sole task is to enrich this outline by populating three specific fields for EACH item in the structure: 'guidelines', 'targeted_keywords', and 'competitor_coverage'.
  
  **CRITICAL LANGUAGE DIRECTIVE:** All generated text in the 'guidelines' field MUST be in **${language}**.

  **Your Task:**
  1.  **Receive JSON:** You will be given a JSON object containing an 'article_structure' and full context from previous steps (keywords, competitor text, etc.).
  2.  **Analyze Each Item:** For every item in the 'outline' (including nested children), analyze its 'heading' and 'reasoning' in the context of all the provided data.
  3.  **Populate 'guidelines':**
      - Based on your analysis, populate the 'guidelines' array with specific, actionable instructions for a writer.
      - Proactively recommend strategic content formats where appropriate. Examples: "Include a comparison table here comparing X and Y," "Create an infographic to visualize this process," "End with a strong CTA to our product page."
  4.  **Populate 'targeted_keywords':**
      - Analyze the heading and its intent.
      - From the provided 'keyword_strategy', identify which specific keywords this heading helps to target.
      - Populate the 'targeted_keywords' array with these keyword strings.
  5.  **Populate 'competitor_coverage':**
      - Analyze the heading's topic.
      - Review the "Ground Truth" competitor text.
      - Identify which competitor URLs have sections that cover this same topic.
      - Populate the 'competitor_coverage' array with the URLs of those competitors.
  6.  **Return Full JSON:** You must return the COMPLETE, original JSON object, but with the 'guidelines', 'targeted_keywords', and 'competitor_coverage' arrays fully populated. Do not change any other part of the structure.
  
  Your entire response must be the single, valid, modified JSON object.`;
}

export const getStructureResourceAnalysisPrompt = (language: string): string => {
  return `You are a specialized AI assistant named **"BriefStrategist"**. Your role is an expert Production Manager within a content team.
  You will receive a JSON object representing a fully detailed article outline. Your sole task is to analyze this outline and identify any non-textual assets that need to be created.

  **CRITICAL LANGUAGE DIRECTIVE:** Any text you generate for the 'additional_resources' field MUST be in **${language}**.

  **Your Task:**
  1.  **Receive JSON:** You will be given a JSON object containing a fully populated 'article_structure'.
  2.  **Analyze Guidelines:** For every single item in the 'outline' (including all nested children), carefully read the 'guidelines' array.
  3.  **Identify Required Resources:** If a guideline explicitly calls for a resource that a content writer cannot produce alone, you must identify it. Examples include:
      - 'infographic'
      - 'custom illustration' or 'diagram'
      - 'video'
      - 'interactive tool'
      - 'calculator'
      - 'custom photography'
      - 'data visualization'
  4.  **Populate 'additional_resources':** For each outline item where you identified such a resource, add a concise string describing that resource to a new 'additional_resources' array for that item. For example, if a guideline says "Include an infographic comparing X and Y," you should add an item like "Infographic comparing X and Y" to the 'additional_resources' array.
  5.  **Maintain Structure:** If an outline item's guidelines do not mention any special resources, you must leave its 'additional_resources' field empty or undefined. You MUST NOT change any other part of the original JSON.
  6.  **Return Full JSON:** You must return the COMPLETE, original JSON object, but with the 'additional_resources' field now populated where appropriate.
  
  Your entire response must be the single, valid, modified JSON object.`;
}

export const getContentGenerationPrompt = (language: string, writerInstructions?: string): string => {
    let prompt = `You are an expert content writer tasked with writing a single section of a larger article. You must write in a profound, engaging, and expert tone.
    
    **CRITICAL INSTRUCTIONS:**
    1.  You will be given the full content brief, the article content written so far, and the specific outline item you are to write now.
    2.  Adhere strictly to the 'guidelines' provided for the current section. This is your primary directive.
    3.  Your task is to write **only the body content** for the current section. **DO NOT repeat the section's heading** in your response.
    4.  Ensure your writing flows naturally from the 'Content Written So Far'.
    5.  You will see a list of 'Upcoming Headings' to help you anticipate the article's flow and write a good transition.
    6.  Your entire response must be only the text (one or more paragraphs) for the current section. Do not add any extra formatting, titles, or conversational text.
    7.  Your entire response MUST be in **${language}**.`;

    if (writerInstructions && writerInstructions.trim()) {
        prompt += `
    
**ADDITIONAL WRITER INSTRUCTIONS (STYLE, TONE, ETC.):**
You MUST follow these instructions carefully throughout your writing:
---
${writerInstructions.trim()}
---
        `;
    }

    return prompt;
}


export const UI_TO_LOGICAL_STEP_MAP: { [key: number]: number } = {
  1: 1, // Goal & Audience
  2: 3, // Comp. Analysis
  3: 2, // Keywords
  4: 4, // Content Gaps
  5: 5, // Structure
  6: 6, // FAQs
  7: 7, // On-Page SEO
};

export const THEMED_LOADING_MESSAGES = [
    "Deconstructing competitor tactics...",
    "Consulting the keyword oracle...",
    "Calibrating SEO matrix...",
    "Brewing the perfect H1...",
    "Analyzing SERP-verse anomalies...",
    "Assembling strategic insights...",
    "Uncovering content gaps...",
    "Structuring for success...",
    "Cross-referencing ranking factors..."
];

export const SOUND_EFFECTS = {
  click: 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSBEAAAAeXBlHw==',
  success: 'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSBEAAAACgAIAhUFLg8eBwwKFw8fDAsUDh4NCQ8FCwA=',
};

// Feature 1: Template Extraction Prompts
export const TEMPLATE_EXTRACTION_PROMPT = `
Analyze this content and extract the HEADING STRUCTURE only.

Return a JSON array of headings with their hierarchy:
- level: 1 for H1, 2 for H2, 3 for H3, 4 for H4
- text: the exact heading text
- children: nested subheadings (array of objects with same structure)

Focus ONLY on the heading hierarchy. Do not extract body content.

Example output:
[
  {
    "level": 1,
    "text": "How to Book Cheap Flights to Thailand",
    "children": [
      { "level": 2, "text": "Best Time to Book", "children": [] },
      { "level": 2, "text": "Top Airlines", "children": [
        { "level": 3, "text": "Budget Carriers", "children": [] },
        { "level": 3, "text": "Premium Options", "children": [] }
      ]}
    ]
  }
]
`;

export const ADAPT_HEADINGS_PROMPT = `
Adapt these heading structures from the original topic to the new topic.
Keep the same hierarchy and structure, only change topic-specific words.

Original topic context: {originalUrl}
New topic: {newTopic}

Original headings:
{headings}

Return the same JSON structure with adapted heading text in the 'adaptedText' field.
`;

// Feature 4: Paragraph Regeneration Prompt
export const PARAGRAPH_REGENERATION_PROMPT = `
You are editing a specific paragraph within a larger section.

FULL SECTION CONTEXT:
{fullSection}

PARAGRAPH TO REWRITE:
{targetParagraph}

CONTENT BEFORE THIS PARAGRAPH:
{before}

CONTENT AFTER THIS PARAGRAPH:
{after}

USER FEEDBACK:
{feedback}

Rewrite ONLY the target paragraph according to the feedback.
Ensure it flows naturally with the surrounding content.
Maintain consistent tone and style with the rest of the section.
Return only the new paragraph text, nothing else.
`;

// Feature 5: Rewrite Selection Prompts
export const REWRITE_SELECTION_PROMPTS = {
  rewrite: `Rewrite the following text while preserving its meaning. Make it clearer, more engaging, and better written:\n\n{text}\n\nContext: {context}`,
  expand: `Expand the following text with more detail, examples, or explanation while maintaining the same tone:\n\n{text}\n\nContext: {context}`,
  shorten: `Shorten the following text while preserving the key information. Be concise:\n\n{text}\n\nContext: {context}`,
  custom: `{instruction}\n\nText to modify:\n{text}\n\nContext: {context}`
};

// Feature 3: Length Constraint Helper
export const getLengthConstraintPrompt = (globalTarget: number | null, sectionTarget?: number): string => {
  let prompt = '';
  if (globalTarget) {
    prompt += `\n**IMPORTANT: Target total content length is ${globalTarget} words. Allocate appropriately across sections.**`;
  }
  if (sectionTarget) {
    prompt += `\n**This section should be approximately ${sectionTarget} words.**`;
  }
  return prompt;
};

// Feature N3: Brief Self-Validation Prompt
export const VALIDATION_PROMPT = `
You are reviewing a completed content brief for quality and strategic alignment.

**BRIEF TO REVIEW:**
{briefJson}

**SCORING CRITERIA (1-5 each):**

1. **Search Intent Alignment:** Does the structure match the identified search intent? Does the format match what's ranking?

2. **Table Stakes Coverage:** Are ALL table stakes topics from the Content Gap Analysis covered in the outline?

3. **Strategic Opportunities:** Does the outline exploit the identified strategic opportunities? Is differentiation clear?

4. **Keyword Integration:** Are primary keywords in H1, title, key headings? Are secondary keywords distributed throughout?

5. **Competitive Advantage:** Would this brief produce content better than the top competitors? Why?

**OUTPUT FORMAT:**
Return a JSON object:
{
  "scores": {
    "search_intent_alignment": { "score": 1-5, "explanation": "..." },
    "table_stakes_coverage": { "score": 1-5, "explanation": "..." },
    "strategic_opportunities": { "score": 1-5, "explanation": "..." },
    "keyword_integration": { "score": 1-5, "explanation": "..." },
    "competitive_advantage": { "score": 1-5, "explanation": "..." }
  },
  "overall_score": 1-5,
  "improvements": [
    { "section": "...", "issue": "...", "suggestion": "..." }
  ],
  "strengths": ["...", "..."],
  "ready_for_writing": true/false
}
`;

// Feature N4: E-E-A-T Signals Prompt
export const EEAT_SIGNALS_PROMPT = `
Based on the topic and competitive analysis, recommend E-E-A-T signals to include in the content.

**Topic & Context:**
{topicContext}

**Competitor Insights:**
{competitorInsights}

**E-E-A-T REQUIREMENTS:**

**Experience:** How can the content demonstrate first-hand experience?
- Original screenshots, personal anecdotes, real-world testing, case studies, etc.

**Expertise:** What expertise should the author demonstrate?
- Technical credentials, industry experience, specialized knowledge, certifications

**Authority:** What authoritative sources should be cited?
- Official documentation, research papers, industry leaders, statistics, studies

**Trust:** What trust signals should be included?
- Last updated date, methodology transparency, clear disclosures, fact-checking

Return a JSON object with arrays of specific, actionable recommendations for each E-E-A-T element, plus overall reasoning.
`;

// Feature 6: Recommended thinking levels by task
export const THINKING_LEVEL_BY_STEP: { [key: number]: 'high' | 'medium' | 'low' } = {
  1: 'high',    // Page Goal & Audience - benefits from deep reasoning
  2: 'high',    // Keyword Strategy - needs comprehensive analysis
  3: 'high',    // Competitor Analysis - complex reasoning
  4: 'high',    // Content Gap Analysis - deep reasoning
  5: 'high',    // Article Structure - complex outline generation
  6: 'medium',  // FAQ Generation - simpler task
  7: 'low',     // On-Page SEO - straightforward optimization
};

// Post-Content Validation Prompts
export const CONTENT_VALIDATION_SYSTEM_PROMPT = `You are an expert SEO Content Editor specializing in content quality assurance.
Your task is to analyze generated content against its source brief to identify improvements.

You must be thorough but fair:
- Only flag issues that genuinely impact quality, SEO, or user experience
- Provide specific, actionable feedback with exact text to change
- Consider the overall context when evaluating sections
- Prioritize changes by impact (critical > warning > suggestion)

Your entire response must be valid JSON matching the provided schema.`;

export const CONTENT_VALIDATION_PROMPT = `
**TASK: Validate the generated content against the original brief.**

**CONTENT BRIEF (source of truth):**
{briefJson}

**GENERATED CONTENT:**
{generatedContent}

**LENGTH CONSTRAINTS:**
Target Word Count: {targetWordCount}
Strict Mode: {strictMode}

{userInstructions}

**VALIDATION CRITERIA:**

1. **Brief Alignment (1-100):**
   - Does each section follow its guidelines from the brief?
   - Are the key points and angles from the brief covered?
   - Does the content match the intended tone and style?

2. **Paragraph Lengths (1-100):**
   - Are paragraphs appropriately sized (not too long/short)?
   - Is there good variety in paragraph length for readability?
   - Are any paragraphs walls of text that need breaking up?

3. **Total Word Count:**
   - What is the actual word count vs target?
   - Is the content appropriately comprehensive?

4. **Keyword Usage (1-100):**
   - Are primary keywords used in headings and body text?
   - Are secondary keywords naturally distributed?
   - Is keyword density appropriate (not stuffed)?

5. **Structure Adherence (1-100):**
   - Does the content follow the outline hierarchy?
   - Are all planned sections present?
   - Is the logical flow maintained?

**OUTPUT INSTRUCTIONS:**
1. Score each category from 1-100 with an explanation
2. Calculate overall score as weighted average (alignment: 30%, structure: 25%, keywords: 20%, paragraphs: 15%, word count: 10%)
3. Generate specific proposed changes for issues found
4. Each proposed change MUST include:
   - A unique ID (use format: change-1, change-2, etc.)
   - The exact current text that needs changing
   - The proposed replacement text
   - Clear reasoning for the change
5. Order changes by severity (critical first, then warnings, then suggestions)
6. Write a brief summary of overall content quality

**SEVERITY GUIDELINES:**
- critical: Missing key sections, major keyword gaps, completely wrong tone, factual errors
- warning: Paragraph too long, minor keyword issues, slight misalignment with guidelines
- suggestion: Style improvements, optional enhancements, minor readability tweaks
`;

export const CONTENT_VALIDATION_FOLLOWUP_PROMPT = `
**TASK: Re-validate the content based on user feedback.**

**PREVIOUS VALIDATION RESULT:**
{previousValidation}

**USER FEEDBACK/INSTRUCTIONS:**
{userInstructions}

**CONTENT BRIEF (source of truth):**
{briefJson}

**GENERATED CONTENT:**
{generatedContent}

Based on the user's feedback, re-evaluate the content and provide an updated validation.
Focus particularly on the areas the user mentioned.
Generate new proposed changes that address their concerns.

Remember:
- Keep changes from the previous validation that weren't addressed by the user
- Add new changes based on user feedback
- Update scores if the user's feedback reveals issues you missed
- Be helpful and responsive to what the user is asking for
`;