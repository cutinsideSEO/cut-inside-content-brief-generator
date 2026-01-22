# Claude Code Implementation Plan — Brief Generator Enhancements

## Overview

This document contains tasks for Claude Code to implement and verify. Tasks are organized into:

1. **Verification Tasks** — Check if existing features are properly implemented
2. **Bug Fixes** — Fix any issues found during verification
3. **New Features** — Implement workflow improvements
4. **Quality Enhancements** — Improve brief output quality

**Priority Order:** Verification → Bug Fixes → New Features → Quality Enhancements

---

# PART 1: VERIFICATION TASKS

## Task V1: Verify Template Applied to Step 5

**Question:** Does the `extractedTemplate` state actually get used when generating the Article Structure (Step 5)?

**Files to Check:**

* `App.tsx` — Is `extractedTemplate` passed to the generation function?
* `services/geminiService.ts` — Does `generateBriefStep()` for step 5 accept and use template data?
* `components/screens/BriefingScreen.tsx` — Is template passed through to generation?

**What to Look For:**

```typescript
// In geminiService.ts or where Step 5 is generated:
// GOOD: Template is used
if (templateHeadings && step === 5) {
  prompt += `\n\nUse this heading structure as foundation:\n${JSON.stringify(templateHeadings)}`;
}

// BAD: Template is ignored
// (no mention of template in Step 5 generation)
```

**Expected Behavior:**

1. User provides template URL in InitialInputScreen
2. Template is extracted and stored in `extractedTemplate` state
3. When Step 5 generates, it receives the template headings
4. Step 5 prompt includes template structure as a reference
5. Generated outline follows template structure (adapted to new topic)

**Verification Steps:**

1. Search codebase for `extractedTemplate` usage
2. Trace the data flow from App.tsx state → generation function
3. Check if Step 5 prompt actually includes template data
4. If not connected, document what's missing

**Output Required:**

```markdown
## V1 Result: Template to Step 5
- [ ] Template extracted: YES/NO
- [ ] Template passed to generation: YES/NO  
- [ ] Step 5 prompt uses template: YES/NO
- [ ] Issues found: [list]
- [ ] Fix required: YES/NO
```

---

## Task V2: Verify Paragraph-Level Feedback UI

**Question:** Does `BriefCard.tsx` support paragraph-level feedback, or only section-level?

**Files to Check:**

* `components/BriefCard.tsx` — Main component
* `components/stages/Stage*.tsx` — How stages render content
* `types.ts` — Is `ParagraphFeedback` type used anywhere?

**What to Look For:**

```typescript
// GOOD: Paragraph-level feedback
<div onMouseEnter={() => setHoveredParagraph(index)}>
  {paragraph}
  {hoveredParagraph === index && <EditButton onClick={...} />}
</div>

// CURRENT (likely): Section-level only
<BriefCard 
  onRegenerate={(feedback) => regenerateSection(feedback)}
/>
```

**Expected Behavior (if implemented):**

1. User hovers over a paragraph within a brief section
2. Edit icon appears on that specific paragraph
3. User clicks → inline feedback input opens
4. User submits feedback → only that paragraph regenerates
5. Surrounding content remains unchanged

**Verification Steps:**

1. Check `BriefCard.tsx` for paragraph-level interaction handlers
2. Search for `ParagraphFeedback` type usage
3. Check if `PARAGRAPH_REGENERATION_PROMPT` from constants.ts is used anywhere
4. Document current state of implementation

**Output Required:**

```markdown
## V2 Result: Paragraph-Level Feedback
- [ ] BriefCard supports paragraph hover: YES/NO
- [ ] Inline paragraph edit UI exists: YES/NO
- [ ] PARAGRAPH_REGENERATION_PROMPT is used: YES/NO
- [ ] Current behavior: [describe]
- [ ] Implementation needed: [list what's missing]
```

---

## Task V3: Verify FAQ Generation Uses PAA Data

**Question:** Does FAQ generation (Step 6) pull from "People Also Ask" data from DataForSEO?

**Files to Check:**

* `services/dataforseoService.ts` — Does it fetch PAA data?
* `App.tsx` — Is PAA data stored and passed to Step 6?
* `constants.ts` — Does Step 6 prompt reference PAA questions?

**What to Look For:**

```typescript
// In dataforseoService.ts - GOOD:
const paaQuestions = serpData.people_also_ask || [];
return { urls, paaQuestions };

// In Step 6 prompt - GOOD:
`The following "People Also Ask" questions appeared in SERPs:
${paaQuestions.join('\n')}
Prioritize these questions in your FAQ generation.`
```

**Verification Steps:**

1. Check DataForSEO service for PAA extraction
2. Check if PAA data is stored in App.tsx state
3. Check if Step 6 generation receives PAA data
4. Check Step 6 prompt for PAA reference

**Output Required:**

```markdown
## V3 Result: FAQ Uses PAA Data
- [ ] DataForSEO fetches PAA: YES/NO
- [ ] PAA stored in state: YES/NO
- [ ] Step 6 receives PAA data: YES/NO
- [ ] Step 6 prompt uses PAA: YES/NO
- [ ] Current FAQ source: [describe]
- [ ] Enhancement needed: [list]
```

---

## Task V4: Verify Gemini 3 Migration Status

**Question:** Is the codebase fully migrated to Gemini 3 API patterns?

**Files to Check:**

* `services/geminiService.ts` — Main Gemini integration

**Checklist:**

```markdown
- [ ] Model string is `gemini-3-pro-preview` or `gemini-3-flash-preview`
- [ ] No `temperature` settings below 1.0
- [ ] Uses `thinkingLevel` instead of `thinkingBudget`
- [ ] Model selector UI exists in InitialInputScreen
- [ ] Model preference saved to localStorage
```

**Output Required:**
Full migration status report with any issues found.

---

# PART 2: BUG FIXES

Based on verification results, implement fixes for any issues found.

## Fix F1: Connect Template to Step 5 (If Needed)

**If V1 found template is NOT used in Step 5:**

**Implementation:**

1. Modify `generateBriefStep` in `geminiService.ts`:

```typescript
export async function generateBriefStep(
  step: number,
  context: GenerationContext,
  templateHeadings?: HeadingNode[]  // Add parameter
): Promise<any> {
  let prompt = getSystemPrompt(step, context.language);
  
  // Add template to Step 5
  if (step === 5 && templateHeadings && templateHeadings.length > 0) {
    prompt += `\n\n**TEMPLATE STRUCTURE:**
Use the following heading structure as your foundation. Adapt the headings to the current topic while preserving the hierarchy and flow:

${JSON.stringify(templateHeadings, null, 2)}

You may add or adjust headings as needed for the current topic, but preserve the overall structure pattern.`;
  }
  
  // ... rest of function
}
```

2. Update call site in App.tsx:

```typescript
const result = await generateBriefStep(
  step,
  generationContext,
  step === 5 ? extractedTemplate?.headingStructure : undefined
);
```

---

## Fix F2: Implement Paragraph-Level Feedback (If Needed)

**If V2 found paragraph feedback is NOT implemented:**

**Implementation:**

1. Update `BriefCard.tsx`:

```typescript
interface BriefCardProps {
  // ... existing props
  enableParagraphFeedback?: boolean;
  onParagraphRegenerate?: (feedback: ParagraphFeedback) => void;
}

// Add state for hover tracking
const [hoveredParagraph, setHoveredParagraph] = useState<number | null>(null);
const [editingParagraph, setEditingParagraph] = useState<number | null>(null);
const [paragraphFeedback, setParagraphFeedback] = useState('');

// Render paragraphs with hover detection
{content.split('\n\n').map((paragraph, index) => (
  <div 
    key={index}
    className="relative group"
    onMouseEnter={() => setHoveredParagraph(index)}
    onMouseLeave={() => setHoveredParagraph(null)}
  >
    <p>{paragraph}</p>
    {hoveredParagraph === index && !editingParagraph && (
      <button 
        className="absolute right-0 top-0 opacity-0 group-hover:opacity-100"
        onClick={() => setEditingParagraph(index)}
      >
        <EditIcon />
      </button>
    )}
    {editingParagraph === index && (
      <div className="mt-2">
        <input 
          value={paragraphFeedback}
          onChange={(e) => setParagraphFeedback(e.target.value)}
          placeholder="How should this paragraph change?"
        />
        <button onClick={() => handleParagraphRegenerate(index)}>
          Regenerate
        </button>
      </div>
    )}
  </div>
))}
```

2. Add regeneration function in `geminiService.ts`:

```typescript
export async function regenerateParagraph(
  fullSection: string,
  paragraphIndex: number,
  feedback: string,
  language: string
): Promise<string> {
  const paragraphs = fullSection.split('\n\n');
  const targetParagraph = paragraphs[paragraphIndex];
  const before = paragraphs.slice(0, paragraphIndex).join('\n\n');
  const after = paragraphs.slice(paragraphIndex + 1).join('\n\n');
  
  const prompt = PARAGRAPH_REGENERATION_PROMPT
    .replace('{fullSection}', fullSection)
    .replace('{targetParagraph}', targetParagraph)
    .replace('{before}', before)
    .replace('{after}', after)
    .replace('{feedback}', feedback);
  
  // Call Gemini and return new paragraph
}
```

---

## Fix F3: Add PAA Data to FAQ Generation (If Needed)

**If V3 found PAA is NOT used:**

**Implementation:**

1. Update `dataforseoService.ts` to extract PAA:

```typescript
export async function getSerpUrls(
  keyword: string,
  // ... params
): Promise<{ urls: SerpResult[], paaQuestions: string[] }> {
  // ... existing code
  
  const paaQuestions: string[] = [];
  if (data.items?.[0]?.items) {
    for (const item of data.items[0].items) {
      if (item.type === 'people_also_ask') {
        paaQuestions.push(...(item.items?.map((q: any) => q.title) || []));
      }
    }
  }
  
  return { urls, paaQuestions };
}
```

2. Store PAA in App.tsx state:

```typescript
const [paaQuestions, setPaaQuestions] = useState<string[]>([]);

// In handleStartAnalysis, collect PAA from all keyword SERPs
```

3. Update Step 6 prompt in `constants.ts`:

```typescript
case 6:
  return `${basePrompt}
  
  **Current Task: Generate Stage 6 - Frequently Asked Questions (FAQs).**
  
  **PRIORITY: "People Also Ask" Questions from SERPs:**
  The following questions appeared in Google's "People Also Ask" boxes for our target keywords. These are PROVEN questions users are asking. Include as many of these as relevant:
  
  ${paaQuestions.length > 0 ? paaQuestions.map(q => `- ${q}`).join('\n') : 'No PAA data available.'}
  
  // ... rest of existing prompt
  `;
```

---

# PART 3: NEW FEATURES

## Feature N1: Search Intent Classification (Add to Step 1)

**Description:** Add search intent analysis to Step 1 output.

**Implementation:**

1. Update Step 1 schema in generation to include:

```typescript
interface Step1Output {
  search_intent: {
    type: 'informational' | 'transactional' | 'navigational' | 'commercial_investigation';
    preferred_format: string;  // e.g., "How-to guide", "Listicle", "Comparison"
    serp_features: string[];   // e.g., ["Featured Snippet", "PAA", "Video"]
    reasoning: string;
  };
  page_goal: ReasoningItem<string>;
  target_audience: ReasoningItem<string>;
}
```

2. Update Step 1 prompt in `constants.ts`:

```typescript
case 1:
  return `${basePrompt}
  
  **Current Task: Generate Stage 1 - Search Intent, Page Goal & Target Audience.**
  
  **STEP A - SEARCH INTENT CLASSIFICATION (Do this FIRST):**
  Before defining goals, analyze the SERP results to understand what Google rewards:
  
  1. **Intent Type:** Classify as one of:
     - Informational: User wants to learn something
     - Transactional: User wants to buy/do something
     - Navigational: User wants to find a specific site
     - Commercial Investigation: User is researching before buying
  
  2. **Preferred Content Format:** Based on what's ranking, what format does Google prefer?
     - How-to guide, Listicle, Comparison, Tool, Product page, etc.
  
  3. **SERP Features Present:** Note any special features in SERPs:
     - Featured Snippet opportunity
     - People Also Ask boxes
     - Video results
     - Image packs
  
  **STEP B - PAGE GOAL & AUDIENCE:**
  // ... existing prompt for goal and audience
  
  Your response must include 'search_intent', 'page_goal', and 'target_audience' objects.`;
```

3. Update `types.ts`:

```typescript
export interface SearchIntent {
  type: 'informational' | 'transactional' | 'navigational' | 'commercial_investigation';
  preferred_format: string;
  serp_features: string[];
  reasoning: string;
}

// Add to ContentBrief interface
export interface ContentBrief {
  search_intent?: SearchIntent;  // Add this
  page_goal: ReasoningItem<string>;
  // ... rest
}
```

4. Update markdown export to include Search Intent section.

---

## Feature N2: Featured Snippet Targeting Flags

**Description:** Mark sections that should target featured snippets.

**Implementation:**

1. Add to `OutlineItem` type:

```typescript
export interface OutlineItem {
  // ... existing fields
  featured_snippet_target?: {
    is_target: boolean;
    format: 'paragraph' | 'list' | 'table';
    target_query?: string;
  };
}
```

2. Update Step 5 prompt to identify snippet opportunities:

```typescript
// Add to case 5 in constants.ts:
**SERP FEATURE TARGETING:**
Based on the Search Intent analysis from Step 1, identify if there's a Featured Snippet opportunity.
- If yes, mark ONE section with 'featured_snippet_target: { is_target: true, format: "paragraph|list|table" }'
- Choose the section most likely to win the snippet (usually answers a direct question)
- Specify the format Google is showing (paragraph for definitions, list for steps, table for comparisons)
```

3. Update brief export to show snippet targets with 🎯 flag.

---

## Feature N3: Self-Validation Step (New Step 8)

**Description:** After all 7 steps complete, AI reviews and scores the brief.

**Implementation:**

1. Add validation prompt to `constants.ts`:

```typescript
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
```

2. Add validation function to `geminiService.ts`:

```typescript
export async function validateBrief(
  brief: ContentBrief,
  language: string
): Promise<BriefValidation> {
  const prompt = VALIDATION_PROMPT.replace('{briefJson}', JSON.stringify(brief, null, 2));
  // Call Gemini, parse response
}
```

3. Add validation type to `types.ts`:

```typescript
export interface BriefValidation {
  scores: {
    search_intent_alignment: { score: number; explanation: string };
    table_stakes_coverage: { score: number; explanation: string };
    strategic_opportunities: { score: number; explanation: string };
    keyword_integration: { score: number; explanation: string };
    competitive_advantage: { score: number; explanation: string };
  };
  overall_score: number;
  improvements: { section: string; issue: string; suggestion: string }[];
  strengths: string[];
  ready_for_writing: boolean;
}
```

4. Add UI in DashboardScreen:

* "Validate Brief" button
* Shows score card with visual indicators (green/yellow/red)
* Lists improvements as actionable items
* Option to auto-fix issues (regenerate specific steps with feedback)

---

## Feature N4: E-E-A-T Signals Section

**Description:** Add E-E-A-T planning to the brief for YMYL-adjacent content.

**Implementation:**

1. Add to Step 1 or as new Step 1.5:

```typescript
export interface EEATSignals {
  experience: string[];   // How to show first-hand experience
  expertise: string[];    // Author credentials, technical depth
  authority: string[];    // Sources to cite, data to reference
  trust: string[];        // Trust signals to include
  reasoning: string;
}
```

2. Add prompt:

```typescript
export const EEAT_SIGNALS_PROMPT = `
Based on the topic and competitive analysis, recommend E-E-A-T signals to include:

**Experience:** How can the content demonstrate first-hand experience?
- Original screenshots, personal anecdotes, real-world testing, etc.

**Expertise:** What expertise should the author demonstrate?
- Technical credentials, industry experience, specialized knowledge

**Authority:** What authoritative sources should be cited?
- Official documentation, research papers, industry leaders

**Trust:** What trust signals should be included?
- Last updated date, methodology transparency, clear disclosures

Return a JSON object with arrays of specific recommendations for each.
`;
```

3. Include in brief export under "Strategy and Goals" section.

---

## Feature N5: Per-Section Word Count Allocation

**Description:** Auto-allocate word count targets per section based on total target.

**Implementation:**

1. Add to Step 5 generation or as post-processing:

```typescript
function allocateWordCounts(
  outline: OutlineItem[],
  totalTarget: number
): OutlineItem[] {
  // Calculate weights based on section importance
  // H2 sections get more weight than H3
  // Intro and Conclusion get fixed allocations
  // Distribute remaining words proportionally
}
```

2. Update `OutlineItem` type:

```typescript
export interface OutlineItem {
  // ... existing
  target_word_count?: number;
}
```

3. Display in brief export:

```markdown
## **H2: Section Title** (Target: ~350 words)
```

---

# PART 4: IMPLEMENTATION ORDER

## Phase 1: Verification (Do First)

1. [ ] V1: Check template → Step 5 connection
2. [ ] V2: Check paragraph feedback implementation
3. [ ] V3: Check PAA → FAQ connection
4. [ ] V4: Check Gemini 3 migration status

## Phase 2: Bug Fixes (Based on V1-V4 Results)

5. [ ] F1: Fix template connection (if needed)
6. [ ] F2: Implement paragraph feedback (if needed)
7. [ ] F3: Add PAA to FAQ (if needed)
8. [ ] F4: Complete Gemini 3 migration (if needed)

## Phase 3: New Features (Quality Improvements)

9. [ ] N1: Search Intent Classification
1. [ ] N2: Featured Snippet Targeting
1. [ ] N3: Self-Validation Step
1. [ ] N4: E-E-A-T Signals
1. [ ] N5: Per-Section Word Count

---

# TESTING CHECKLIST

After implementation, verify:

## Template Flow

* [ ] Enter template URL → heading structure extracted
* [ ] Proceed to Step 5 → headings pre-populated from template
* [ ] Headings adapted to new topic (not copy of original)
* [ ] Can edit pre-populated structure

## Paragraph Feedback

* [ ] Hover over paragraph → edit icon appears
* [ ] Click edit → feedback input opens
* [ ] Submit feedback → only that paragraph regenerates
* [ ] Surrounding paragraphs unchanged

## PAA → FAQ

* [ ] SERP analysis captures PAA questions
* [ ] Step 6 receives PAA data
* [ ] Generated FAQs include PAA questions
* [ ] FAQ reasoning mentions PAA source

## Search Intent

* [ ] Step 1 outputs search_intent object
* [ ] Intent type classified correctly
* [ ] Preferred format identified
* [ ] SERP features noted

## Self-Validation

* [ ] "Validate Brief" button works
* [ ] Scores displayed with explanations
* [ ] Improvements listed as actionable items
* [ ] Can regenerate sections based on suggestions

---

*Implementation Plan for Claude Code — January 2026*
