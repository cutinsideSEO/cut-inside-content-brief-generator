# Content Brief Generator - Feature Specification

## Overview

This document specifies new features for the existing Cut Inside Content Brief Generator app. The goal is to **reduce manual preparation time** by enabling template-based brief creation and granular content editing.

**Core Problem:** Currently, each brief requires building structure from scratch. Users want to create a brief once (e.g., "How to fly to Thailand") and quickly generate variants (e.g., "How to fly to Iceland") by swapping the topic while preserving structure.

---

## Key Principle: Templates Enhance, Not Replace, the Wizard

**IMPORTANT FOR IMPLEMENTATION:** Templates work WITHIN the existing wizard flow, not around it.

| What Templates DO                         | What Templates DON'T DO               |
| ----------------------------------------- | ------------------------------------- |
| Pre-populate heading structure in Step 5  | Skip the wizard steps                 |
| Provide structural reference for AI       | Replace fresh SERP data for new topic |
| Save time on outline creation             | Prevent users from editing/adding     |
| Work alongside additional context sources | Lock users into a fixed structure     |

**The user still:**

1. Enters their new topic keywords
2. Goes through SERP analysis (fresh data for new topic)
3. Can add additional context (PDFs, URLs) alongside template
4. Reviews and edits each step
5. Can modify the pre-populated structure

---

## Feature 1: Template-from-URL Import

### Description

Allow users to provide a URL of existing content as a **structural reference** (primarily heading structure). The system extracts the heading hierarchy and uses it to pre-populate the Article Structure step (Step 5), while the user still completes the full wizard with fresh SERP data for the new topic.

### What Template Captures (Primary Focus: Heading Structure)

* H1, H2, H3 heading hierarchy
* Section order and flow
* Approximate content depth per section
* Optional: tone hints, word count patterns

### Workflow Integration

```
┌─────────────────────────────────────────────────────────────────────┐
│  INITIAL INPUT (Screen 1)                                          │
│  ┌─────────────────┐  ┌─────────────────┐                          │
│  │  New Topic:     │  │  Template URL:  │  ← NEW: Optional field   │
│  │  "fly to Iceland"│  │  (Thailand article)│                       │
│  └─────────────────┘  └─────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  SERP ANALYSIS (Screen 2) — Runs for NEW topic (Iceland)           │
│  Fresh DataForSEO data, new competitors                            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  CONTEXT INPUT (Screen 3) — User can ADD more context              │
│  Template URL auto-added as context + user can add PDFs/URLs       │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│  7-STEP GENERATION — Steps pre-populated based on template         │
│                                                                     │
│  Step 5 (Article Structure): Heading structure from template       │
│  Other steps: Generated normally but AI references template        │
│               structure for consistency                             │
│                                                                     │
│  User can EDIT/ADD to any pre-populated content                    │
└─────────────────────────────────────────────────────────────────────┘
```

### User Flow

1. User enters new topic keywords (e.g., "fly to Iceland") — **required**
2. User optionally enters a template URL (e.g., existing Thailand article)
3. System extracts heading structure from template URL
4. User proceeds through normal wizard:
   * SERP analysis runs for **new topic** (Iceland)
   * Context input allows **adding** more sources alongside template
   * Step 5 (Article Structure) is **pre-populated** with template headings, adapted to new topic
   * Other steps reference template structure but generate fresh content
5. User can edit, add to, or override any pre-populated content

### Technical Requirements

#### New State in `App.tsx`

```typescript
// Add to existing state
const [templateData, setTemplateData] = useState<ExtractedTemplate | null>(null);
```

#### New Types in `types.ts`

```typescript
interface ExtractedTemplate {
  sourceUrl: string;
  headingStructure: HeadingNode[];
  extractedAt: Date;
}

interface HeadingNode {
  level: 1 | 2 | 3 | 4;
  text: string;  // Original heading text
  adaptedText?: string;  // Heading adapted to new topic (filled during generation)
  children: HeadingNode[];
  guidelines?: string;  // Optional: what this section should cover
}
```

#### New Service: `services/templateExtractionService.ts`

```typescript
export async function extractTemplateFromUrl(url: string): Promise<ExtractedTemplate> {
  // 1. Fetch URL content (reuse existing URL fetching from context input)
  // 2. Send to Gemini to extract heading structure
  // 3. Return structured template
}

export function adaptHeadingsToTopic(
  template: ExtractedTemplate, 
  newTopic: string
): HeadingNode[] {
  // Adapt heading text from "Thailand" → "Iceland"
  // Called when generating Step 5
}
```

#### Gemini Prompt Addition (add to `constants.ts`)

```typescript
export const TEMPLATE_EXTRACTION_PROMPT = `
Analyze this content and extract the HEADING STRUCTURE only.

Return a JSON array of headings with their hierarchy:
- level: 1 for H1, 2 for H2, etc.
- text: the exact heading text
- children: nested subheadings

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

Return the same JSON structure with adapted heading text.
`;
```

#### Modification to `components/screens/Screen1InitialInput.tsx`

Add optional "Template URL" field below keyword input:

```typescript
// Add to component state
const [templateUrl, setTemplateUrl] = useState<string>('');
const [isExtractingTemplate, setIsExtractingTemplate] = useState(false);

// Add to UI (collapsible section)
<CollapsibleSection title="Use existing content as template (optional)">
  <input 
    placeholder="Paste URL of similar content to use as structure template"
    value={templateUrl}
    onChange={(e) => setTemplateUrl(e.target.value)}
  />
  <p className="text-sm text-gray-500">
    We'll extract the heading structure and use it to pre-populate your brief outline.
  </p>
</CollapsibleSection>
```

#### Modification to Step 5 (Article Structure) Generation

In `geminiService.ts`, modify the Step 5 generation to accept optional template:

```typescript
export async function generateArticleStructure(
  context: GenerationContext,
  templateHeadings?: HeadingNode[]  // NEW: optional template
): Promise<ArticleStructure> {
  const prompt = templateHeadings
    ? `${BASE_STEP5_PROMPT}\n\nIMPORTANT: Use this heading structure as your foundation, adapting it to the current topic:\n${JSON.stringify(templateHeadings)}\n\nYou may add or adjust headings as needed, but preserve the overall structure.`
    : BASE_STEP5_PROMPT;
  
  // ... rest of generation
}
```

---

## Feature 2: Brief-as-Template Import

### Description

Allow users to upload a previously completed brief (markdown) as a structural template. Extracts heading structure from the brief's Article Structure section and pre-populates Step 5 for a new topic.

### Workflow Integration

Same as Feature 1 — user still goes through full wizard with fresh SERP data. The brief's Article Structure section provides the heading template.

### User Flow

1. User clicks "Import Brief as Template" in Initial Input screen
2. User uploads markdown file or pastes brief content
3. System parses the Article Structure section to extract headings
4. User enters new topic keywords
5. User proceeds through normal wizard (SERP → Context → Generation)
6. Step 5 is pre-populated with extracted heading structure

### Technical Requirements

#### Extend existing `markdownParserService.ts`

```typescript
export function extractHeadingsFromBrief(briefMarkdown: string): HeadingNode[] {
  // 1. Parse markdown to find "## Article Structure" or "## 5." section
  // 2. Extract heading hierarchy from that section
  // 3. Return HeadingNode[] (same format as URL template)
}
```

#### UI Addition to Screen 1

Add alongside the template URL field:

```typescript
<div className="flex gap-2 items-center">
  <span className="text-gray-500">or</span>
  <button onClick={handleBriefUpload}>
    Upload previous brief as template
  </button>
</div>
```

#### Reuse Same Template State

Both URL templates and brief templates populate the same `templateData` state — they just have different extraction methods.

---

## Feature 3: Word Count / Length Constraints

### Description

Allow users to specify target word count or length constraints for the entire brief or specific sections. The system should generate content that respects these limits.

### User Flow

1. User sets global word count target (e.g., "1500 words")
2. Optionally, user sets per-section limits
3. All generation steps respect these constraints
4. Visual indicator shows current vs target word count

### Technical Requirements

#### New State in `App.tsx` (or new hook)

```typescript
interface LengthConstraints {
  globalTarget: number | null; // total word count
  sectionTargets: Record<string, number>; // section-specific limits
  strictMode: boolean; // hard limit vs soft guideline
}

const [lengthConstraints, setLengthConstraints] = useState<LengthConstraints>({
  globalTarget: null,
  sectionTargets: {},
  strictMode: false
});
```

#### Modify Generation Prompts

Update all step generation prompts in `constants.ts` to include length constraints:

```typescript
// Add to each STEP_X_PROMPT
${lengthConstraints.globalTarget 
  ? `IMPORTANT: Target total content length is ${lengthConstraints.globalTarget} words. Allocate appropriately across sections.` 
  : ''}
${lengthConstraints.sectionTargets[currentSection]
  ? `This section should be approximately ${lengthConstraints.sectionTargets[currentSection]} words.`
  : ''}
```

#### New Component: `LengthSettings.tsx`

```typescript
interface LengthSettingsProps {
  constraints: LengthConstraints;
  onChange: (constraints: LengthConstraints) => void;
  currentWordCount?: number; // for display
}
```

#### UI Location

* Add collapsible "Length Settings" panel in the Initial Input screen
* Add word count display in Brief Dashboard showing current vs target
* Add per-section word count in Stage components

---

## Feature 4: Section-Level Feedback & Regeneration

### Description

Enable users to provide specific feedback on individual paragraphs or sections and regenerate just that portion without affecting the rest of the brief.

### User Flow

1. User views generated brief section
2. User clicks on a specific paragraph/subsection
3. User enters feedback/notes for that specific element
4. System regenerates only that element while preserving context

### Technical Requirements

#### Extend `BriefCard.tsx` Component

Current: Feedback applies to entire section
New: Enable paragraph-level feedback

```typescript
interface ParagraphFeedback {
  paragraphIndex: number;
  paragraphContent: string;
  userFeedback: string;
}

interface BriefCardProps {
  // ... existing props
  enableParagraphFeedback?: boolean;
  onParagraphRegenerate?: (feedback: ParagraphFeedback) => void;
}
```

#### New Service Function in `geminiService.ts`

```typescript
export async function regenerateParagraph(
  fullSectionContext: string,
  paragraphToRegenerate: string,
  userFeedback: string,
  surroundingContent: {
    before: string;
    after: string;
  }
): Promise<string> {
  // Generate new paragraph that fits context
}
```

#### Gemini Prompt Addition

```typescript
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
```

#### UI Behavior

* Hovering over a paragraph shows subtle edit icon
* Clicking opens inline feedback input
* "Regenerate" button triggers paragraph-only regeneration
* Show loading state only on that paragraph
* Highlight regenerated paragraph briefly after completion

---

## Feature 5: Content Rewrite/Edit Mode

### Description

Allow users to select and rewrite specific content within the generated brief, with AI assistance for maintaining consistency.

### User Flow

1. User selects text in any brief section
2. User chooses: "Rewrite", "Expand", "Shorten", or "Custom instruction"
3. System rewrites selection while maintaining context

### Technical Requirements

#### New Component: `InlineEditor.tsx`

```typescript
interface InlineEditorProps {
  selectedText: string;
  fullContext: string;
  onRewrite: (newText: string) => void;
  onCancel: () => void;
}

type RewriteAction = 'rewrite' | 'expand' | 'shorten' | 'custom';
```

#### Service Function

```typescript
export async function rewriteSelection(
  selectedText: string,
  action: RewriteAction,
  customInstruction?: string,
  context?: string
): Promise<string>
```

#### UI Implementation

* Enable text selection in brief preview areas
* Show floating toolbar on selection with action buttons
* Replace selected text with rewritten version
* Track changes for potential undo

---

## Feature 6: Model Selector + Gemini 3 Migration

### Description

Allow users to select which Gemini model to use for generation, balancing quality vs speed/cost. Also upgrade the codebase to support Gemini 3.

### Available Models

| Model                    | String                     | Best For                           | Cost                   |
| ------------------------ | -------------------------- | ---------------------------------- | ---------------------- |
| **Gemini 3 Pro**   | `gemini-3-pro-preview`   | Complex reasoning, highest quality | $2/$12 per 1M tokens   |
| **Gemini 3 Flash** | `gemini-3-flash-preview` | Fast, cost-effective, good quality | $0.50/$3 per 1M tokens |
| Gemini 2.5 Pro           | `gemini-2.5-pro`         | Legacy fallback                    | —                     |

### User Flow

1. User sees model selector dropdown in settings or generation screen
2. User chooses model based on their needs:
   * "Quality" → Gemini 3 Pro
   * "Speed" → Gemini 3 Flash
3. All subsequent generations use selected model
4. Model choice persists in localStorage

### Technical Requirements

#### New State

```typescript
// Add to App.tsx or create useModelSettings hook
type GeminiModel = 'gemini-3-pro-preview' | 'gemini-3-flash-preview' | 'gemini-2.5-pro';

interface ModelSettings {
  model: GeminiModel;
  thinkingLevel: 'high' | 'medium' | 'low' | 'minimal'; // minimal only for Flash
}

const [modelSettings, setModelSettings] = useState<ModelSettings>({
  model: 'gemini-3-flash-preview',  // Default to Flash for cost
  thinkingLevel: 'high'
});
```

#### New Component: `ModelSelector.tsx`

```typescript
interface ModelSelectorProps {
  settings: ModelSettings;
  onChange: (settings: ModelSettings) => void;
}

// UI: Dropdown or toggle buttons
// Show brief description of each model's strengths
```

#### UI Location

* Add to Initial Input screen (collapsible "Advanced Settings")
* Or add to app header as a persistent dropdown

---

## CRITICAL: Gemini 2.5 → Gemini 3 Migration Changes

### Changes Required in `geminiService.ts`

#### 1. Update Model Initialization

```typescript
// BEFORE (current code likely has):
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

// AFTER:
const model = genAI.getGenerativeModel({ 
  model: modelSettings.model,  // Dynamic based on user selection
  generationConfig: {
    // REMOVE any temperature settings below 1.0
    // Gemini 3 is optimized for temperature 1.0 (default)
  
    // NEW: Use thinkingConfig instead of thinkingBudget
    thinkingConfig: {
      thinkingLevel: modelSettings.thinkingLevel  // 'high' | 'low' | 'minimal'
    }
  }
});
```

#### 2. Remove/Update Temperature Settings

```typescript
// REMOVE any code like this:
generationConfig: {
  temperature: 0.7,  // DELETE - causes issues with Gemini 3
}

// Gemini 3 works best at default temperature (1.0)
// Only set temperature if you have a very specific reason
```

#### 3. Replace `thinkingBudget` with `thinkingLevel`

```typescript
// BEFORE (Gemini 2.5 style):
thinkingConfig: {
  thinkingBudget: 1024  // Token count
}

// AFTER (Gemini 3 style):
thinkingConfig: {
  thinkingLevel: 'high'  // 'high' | 'low' | 'minimal' (Flash only)
}
```

#### 4. Thought Signatures (SDK Handles Automatically)

**Good news:** If you're using the official Google Gen AI SDK (which you are, since you built in AI Studio), thought signatures are handled automatically when using the chat feature.

**No code changes needed** as long as you:

* Use the SDK's chat methods
* Don't manually manipulate conversation history

If you DO manually manage history, you must preserve `thoughtSignature` fields in function call responses.

#### 5. PDF Token Usage May Increase

Gemini 3 has higher default PDF resolution. If you hit context limits:

```typescript
// Add mediaResolution to reduce token usage for PDFs
const result = await model.generateContent({
  contents: [...],
  generationConfig: {
    // If PDF token usage is too high:
    mediaResolution: 'medium'  // or 'low' for video
  }
});
```

### Migration Checklist for Claude Code

```markdown
## Gemini 3 Migration Checklist

- [ ] Update model string from `gemini-2.5-pro` to `gemini-3-pro-preview` or `gemini-3-flash-preview`
- [ ] Search codebase for `temperature` settings — remove any values below 1.0
- [ ] Search codebase for `thinkingBudget` — replace with `thinkingLevel`
- [ ] Verify SDK version is up to date: `npm update @google/generative-ai`
- [ ] Test PDF processing — check if token limits are exceeded with new defaults
- [ ] Add model selector UI component
- [ ] Store model preference in localStorage
- [ ] Test all 7 generation steps with both Pro and Flash models
```

### Thinking Level Recommendations by Task

| Task                    | Recommended Level    | Why                           |
| ----------------------- | -------------------- | ----------------------------- |
| Step 1-4 (Analysis)     | `high`             | Benefits from deep reasoning  |
| Step 5 (Structure)      | `high`             | Complex outline generation    |
| Step 6 (FAQ)            | `medium`or `low` | Simpler task                  |
| Step 7 (SEO)            | `low`              | Straightforward optimization  |
| Paragraph rewrite       | `low`              | Quick, focused task           |
| Full content generation | `high`             | Needs comprehensive reasoning |

---

## Implementation Priority

### Phase 0 (Do First - Foundation)

1. **Feature 6: Gemini 3 Migration** — Required foundation before other features
   * Update model strings
   * Remove temperature settings
   * Replace thinkingBudget with thinkingLevel
   * Add model selector UI

### Phase 1 (High Priority - Immediate Time Savings)

2. **Feature 1: Template-from-URL Import** — Biggest time saver for variant creation
3. **Feature 3: Word Count Constraints** — Common requirement, straightforward implementation

### Phase 2 (Medium Priority)

4. **Feature 2: Brief-as-Template Import** — Extends template capability
5. **Feature 4: Section-Level Feedback** — Improves iteration workflow

### Phase 3 (Enhancement)

6. **Feature 5: Content Rewrite Mode** — Power user feature

---

## Files to Modify

| File                                           | Changes                                                                                                         |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `App.tsx`                                    | Add `templateData`state,`lengthConstraints`state,`modelSettings`state, pass to generation                 |
| `types.ts`                                   | Add `ExtractedTemplate`,`HeadingNode`,`LengthConstraints`,`ModelSettings`,`GeminiModel`               |
| `constants.ts`                               | Add `TEMPLATE_EXTRACTION_PROMPT`,`ADAPT_HEADINGS_PROMPT`,`PARAGRAPH_REGENERATION_PROMPT`                  |
| `geminiService.ts`                           | **CRITICAL:**Update model init, remove temperature, use `thinkingLevel`, add model parameter to all functions |
| `markdownParserService.ts`                   | Add `extractHeadingsFromBrief()`function                                                                      |
| `components/screens/Screen1InitialInput.tsx` | Add template URL field, brief upload button, length settings, model selector                                    |
| `components/stages/Stage5.tsx`               | Show "Using template structure" indicator when template is active                                               |
| `components/BriefCard.tsx`                   | Add paragraph-level feedback capability (hover → edit icon → inline feedback)                                 |

## New Files to Create

| File                                      | Purpose                                                  |
| ----------------------------------------- | -------------------------------------------------------- |
| `services/templateExtractionService.ts` | `extractTemplateFromUrl()`,`adaptHeadingsToTopic()`  |
| `components/LengthSettings.tsx`         | Word count constraint controls (collapsible panel)       |
| `components/ModelSelector.tsx`          | Gemini model selection dropdown with descriptions        |
| `components/InlineEditor.tsx`           | Text selection rewrite toolbar (Feature 5)               |
| `hooks/useTemplateData.ts`              | Optional: Extract template state management from App.tsx |
| `hooks/useModelSettings.ts`             | Model selection state + localStorage persistence         |

---

## Testing Scenarios

### Gemini 3 Migration (Test First!)

1. Update model string → verify API calls succeed with `gemini-3-flash-preview`
2. Generate Step 1 → verify output quality is similar or better than 2.5
3. Test all 7 steps sequentially → verify no errors
4. Test "I'm Feeling Lucky" auto-generation → verify completes without issues
5. Switch between Pro and Flash → verify both work
6. Check token usage on PDF uploads → verify doesn't exceed context window

### Template Import (URL)

1. Enter new topic + template URL → verify heading structure extracted
2. Proceed through wizard → verify SERP runs for NEW topic (not template topic)
3. Reach Step 5 → verify headings are pre-populated from template, adapted to new topic
4. Edit pre-populated headings → verify changes are preserved
5. Add context URLs alongside template → verify both are used

### Template Import (Brief)

1. Upload previous brief markdown → verify heading structure extracted from Article Structure section
2. Same flow as URL template — SERP for new topic, Step 5 pre-populated

### Length Constraints

* Set 1500 word limit → generate full brief → verify total word count guidance appears in prompts
* Set section-specific limits → verify each section prompt includes its limit
* Display shows current estimate vs target throughout generation

### Paragraph Regeneration

1. Generate a section → hover over paragraph 2 → click edit icon
2. Enter feedback "make this more concise" → click regenerate
3. Verify only paragraph 2 changes, paragraphs 1, 3+ remain identical
4. Verify regenerated paragraph flows naturally with surrounding content

### Context Combination

1. Add template URL + 2 additional competitor URLs + 1 PDF
2. Verify all sources appear in Context Input screen
3. Verify generation considers all sources (template for structure, others for content)

### Model Selector

1. Select Gemini 3 Pro → generate → verify higher quality output
2. Select Gemini 3 Flash → generate → verify faster response
3. Refresh page → verify model selection persists (localStorage)
4. Compare output quality between models on same prompt

---

*Specification created for Claude Code implementation - January 2026*
