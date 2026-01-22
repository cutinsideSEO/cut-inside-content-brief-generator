# Cut Inside - Content Brief Generator

## Project Overview

This is an AI-powered SEO Content Strategist application that generates comprehensive, data-driven content briefs. Built for the Cut Inside team, it provides a multi-stage wizard that analyzes competitor content, generates SEO strategies, and produces structured content briefs to guide content creation.

## Quick Start

```bash
npm install
# Add GEMINI_API_KEY to .env.local
npm run dev
# Open http://localhost:3000
```

## Tech Stack

| Layer            | Technology                                        |
| ---------------- | ------------------------------------------------- |
| Frontend         | React 19.1.1 + TypeScript                         |
| Build            | Vite 6.4.1                                        |
| Styling          | Tailwind CSS v3 (CDN)                             |
| AI               | Google Gemini 3 Flash/Pro (with 2.5 Pro fallback) |
| SEO Data         | DataForSEO API                                    |
| Document Parsing | PDF.js, Mammoth.js                                |
| Testing          | Vitest 4.0.17                                     |

## Architecture

### Application Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Initial Input  │ ──▶ │  SERP Analysis  │ ──▶ │  Context Input  │
│  (Keywords/API) │     │  (DataForSEO)   │     │  (Files/URLs)   │
│  + Model Select │     │  + Template URL │     │                 │
│  + Word Count   │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
         ┌───────────────────────────────────────────────┘
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Competitor     │ ──▶ │  7-Step Brief   │ ──▶ │    Dashboard    │
│  Visualization  │     │  Generation     │     │  Review/Refine  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                         │
         ┌───────────────────────────────────────────────┘
         ▼
┌─────────────────┐     ┌─────────────────┐
│    Content      │ ──▶ │  Export/Share   │
│   Generation    │     │  (Markdown)     │
│  + Inline Edit  │     │                 │
└─────────────────┘     └─────────────────┘
```

### Brief Generation Pipeline (7 Steps)

1. **Page Goal & Audience** - Define purpose, target readers, + Search Intent Classification
2. **Keyword Strategy** - Primary/secondary keyword mapping
3. **Competitor Analysis** - Breakdown of top competitors
4. **Content Gap Analysis** - Table stakes vs opportunities
5. **Article Structure** - Hierarchical outline with guidelines, featured snippet targeting, per-section word counts
6. **FAQ Generation** - Questions with answer guidelines (integrates PAA from SERPs)
7. **On-Page SEO** - Title, meta, H1, slug, OG tags

## Directory Structure

```
├── components/
│   ├── screens/          # Full-page views (7 screens)
│   ├── stages/           # Brief section components (Stage1-8)
│   ├── Button.tsx        # Reusable button with variants
│   ├── BriefCard.tsx     # Section card with feedback
│   ├── Header.tsx        # App header + sound toggle
│   ├── Icon.tsx          # SVG icon library (25+ icons)
│   ├── Spinner.tsx       # Loading animation
│   ├── Stepper.tsx       # Progress indicator
│   ├── ModelSelector.tsx # AI model selection (Gemini 3 Flash/Pro/2.5)
│   ├── LengthSettings.tsx # Word count targeting
│   ├── ParagraphFeedback.tsx # Section-level paragraph feedback
│   └── InlineEditor.tsx  # Text selection rewrite toolbar
├── services/
│   ├── geminiService.ts      # Google Gemini API (3.x + 2.5 support)
│   ├── dataforseoService.ts  # SERP & on-page analysis + PAA extraction
│   ├── markdownService.ts    # Brief → Markdown export
│   ├── markdownParserService.ts  # Markdown → Brief import + template extraction
│   └── templateExtractionService.ts  # URL/Brief → Heading template
├── tests/
│   ├── setup.ts                          # Test setup (fetch mocks, btoa polyfill)
│   └── services/
│       ├── dataforseoService.test.ts     # 13 tests for SERP/On-Page APIs
│       ├── markdownParserService.test.ts # 14 tests for markdown parsing
│       └── templateExtractionService.test.ts # 12 tests for template extraction
├── App.tsx               # Main application logic (state hub)
├── types.ts              # TypeScript interfaces
├── constants.ts          # System prompts & config
└── index.tsx             # React entry point
```

## Key Features

### Core Features

- **Multi-source Context** - Combine PDFs, DOCX, URLs, manual input
- **Starred Competitors** - Mark sources as "ground truth" for priority
- **"I'm Feeling Lucky"** - Auto-generate all 7 steps sequentially
- **Stale Step Tracking** - Visual indicators when steps need refresh
- **Brief Import/Export** - Full markdown serialization
- **Real-time Generation** - Progressive article generation with live progress
- **Multi-language** - Supports 11 languages for output
- **Regeneration with Feedback** - Refine individual steps with notes

### New Features (January 2026)

#### AI Model Selection

- **Gemini 3 Flash** - Fast & cost-effective for most tasks
- **Gemini 3 Pro** - Highest quality for complex briefs
- **Gemini 2.5 Pro** - Legacy fallback option
- **Thinking Level Control** - High/Medium/Low/Minimal for Gemini 3 models

#### Template-from-URL Import

- Extract heading structure from any URL
- AI adapts template headings to your new topic
- Pre-populate Step 5 (Article Structure) with proven layouts

#### Brief-as-Template Import

- Use existing briefs as structural templates
- Extract heading hierarchy from markdown briefs
- Clone successful brief structures for new topics

#### Word Count Constraints

- Preset targets: Short (800), Medium (1500), Long (2500), Comprehensive (4000)
- Custom word count input
- Strict mode toggle for hard limits
- Length context passed to all generation steps

#### Section-Level Feedback

- Click any paragraph to provide targeted feedback
- Regenerate individual paragraphs with context awareness
- Maintains flow with surrounding content

#### Content Rewrite Mode

- Select any text in generated content
- Floating toolbar with actions: Rewrite, Expand, Shorten, Custom
- Custom instruction input for specific changes
- Context-aware rewrites that match surrounding tone

#### Search Intent Classification (Step 1)

- Automatic classification: informational, transactional, navigational, commercial_investigation
- Preferred content format recommendation
- SERP features analysis
- Reasoning for classification

#### Featured Snippet Targeting (Step 5)

- Per-section featured snippet optimization
- Format suggestions: paragraph, list, table
- Target query specification

#### PAA Integration (Step 6)

- People Also Ask questions extracted from SERP
- PAA questions prioritized in FAQ generation
- Direct integration from DataForSEO API

#### Brief Validation & E-E-A-T

- `validateBrief()` - Scores brief across 5 dimensions with improvement suggestions
- `generateEEATSignals()` - Experience, Expertise, Authority, Trust recommendations

#### Testing Infrastructure

- Vitest 4.0.17 for unit testing
- 39 tests across 3 service test files
- Mock-based API testing
- Manual testing checklist (TESTING_CHECKLIST.md)

## Environment Variables

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

## Type Definitions

### New Types (types.ts)

```typescript
// AI Model Configuration
type GeminiModel = 'gemini-3-pro-preview' | 'gemini-3-flash-preview' | 'gemini-2.5-pro';
type ThinkingLevel = 'high' | 'medium' | 'low' | 'minimal';

interface ModelSettings {
  model: GeminiModel;
  thinkingLevel: ThinkingLevel;
}

// Template Types
interface HeadingNode {
  level: 1 | 2 | 3 | 4;
  text: string;
  adaptedText?: string;
  children: HeadingNode[];
  guidelines?: string;
}

interface ExtractedTemplate {
  sourceUrl: string;
  headingStructure: HeadingNode[];
  extractedAt: Date;
}

// Length Constraints
interface LengthConstraints {
  globalTarget: number | null;
  sectionTargets: Record<string, number>;
  strictMode: boolean;
}

// Rewrite Actions
type RewriteAction = 'rewrite' | 'expand' | 'shorten' | 'custom';

// Search Intent (Step 1)
type SearchIntentType = 'informational' | 'transactional' | 'navigational' | 'commercial_investigation';

interface SearchIntent {
  type: SearchIntentType;
  preferred_format: string;
  serp_features: string[];
  reasoning: string;
}

// Featured Snippet Targeting (Step 5)
interface FeaturedSnippetTarget {
  format: 'paragraph' | 'list' | 'table';
  target_query: string;
}

// Brief Validation
interface ValidationScore {
  category: string;
  score: number;
  max_score: number;
  improvements: string[];
}

interface BriefValidation {
  overall_score: number;
  max_score: number;
  scores: ValidationScore[];
  priority_improvements: string[];
}

// E-E-A-T Signals
interface EEATSignals {
  experience: string[];
  expertise: string[];
  authority: string[];
  trust: string[];
}
```

---

# Improvement Analysis

## Code Improvements

### 1. State Management Overhaul

**Current Issue:** `App.tsx` is 900+ lines with 20+ `useState` hooks, making it difficult to maintain and debug.

**Recommendation:**

- Migrate to `useReducer` with a centralized state object, or
- Adopt Zustand for lightweight global state with slices
- Extract state into custom hooks: `useBriefGeneration`, `useCompetitorData`, `useContextFiles`

```typescript
// Example: useBriefGeneration.ts
export function useBriefGeneration() {
  const [briefData, setBriefData] = useState<ContentBrief | null>(null);
  const [step, setStep] = useState(1);
  const [staleSteps, setStaleSteps] = useState<Set<number>>(new Set());
  // ... related logic
  return { briefData, step, staleSteps, generateStep, regenerateStep };
}
```

### 2. Remove Dead Code

**Current Issue:** Empty placeholder files exist (`InputPanel.tsx`, `OutputPanel.tsx`, `WizardPanel.tsx`).

**Recommendation:** Delete unused files or implement them. Clean codebase = faster onboarding.

### 3. Add Testing Infrastructure

**Status: IMPLEMENTED**

Now includes:

- Vitest 4.0.17 for unit/integration testing
- 39 tests across 3 service test files
- `dataforseoService.test.ts` - 13 tests for SERP, On-Page, PAA, error handling
- `markdownParserService.test.ts` - 14 tests for parsing and validation
- `templateExtractionService.test.ts` - 12 tests for template extraction
- Mock-based API testing with fetch mocks
- Manual testing checklist (TESTING_CHECKLIST.md)

**Remaining:**

- Add Playwright or Cypress for E2E testing
- Add geminiService.ts tests (mock API, schema validation)

### 4. TypeScript Strictness

**Current Issue:** `strict: true` is enabled but `any` types leak through API responses.

**Recommendation:**

- Add Zod for runtime validation of API responses
- Create branded types for IDs (KeywordId, CompetitorId)
- Enable `noUncheckedIndexedAccess` for safer array access

### 5. Error Handling & Resilience

**Current Issue:** Errors are caught and displayed but recovery options are limited.

**Recommendation:**

- Add error boundaries around each screen
- Implement retry UI for failed API calls
- Add offline detection with queued operations
- Structured error types with user-friendly messages

### 6. API Response Caching

**Current Issue:** Each SERP query and Gemini call is made fresh, even for identical inputs.

**Recommendation:**

- Add localStorage or IndexedDB caching for SERP results
- Cache Gemini responses keyed by input hash
- Add cache invalidation with TTL (e.g., 24h for SERP data)

### 7. Component Decomposition

**Current Issue:** Stage components (Stage1-Stage8) have similar patterns but aren't abstracted.

**Recommendation:**

- Create a generic `StageRenderer` component that takes schema + data
- Use composition pattern to reduce ~800 lines of stage code

### 8. Secrets Management

**Current Issue:** API credentials entered in UI, no secure storage.

**Recommendation:**

- Store DataForSEO credentials in environment variables
- Consider adding a simple backend proxy for API calls
- At minimum, use `sessionStorage` instead of component state

### 9. Externalize Prompts

**Current Issue:** Large prompt strings embedded in `constants.ts`.

**Recommendation:**

- Move prompts to separate `.txt` or `.md` files
- Load at build time via Vite's raw import
- Enables easier prompt iteration without code changes

---

## Application Improvements

### 1. Brief History & Persistence

**Current:** Briefs are lost on page refresh.

**Recommendation:**

- Add IndexedDB storage for brief history
- Auto-save drafts during generation
- List view of past briefs with search/filter
- "Continue where you left off" functionality

### 2. User Authentication

**Current:** No user accounts, single-user experience.

**Recommendation:**

- Add simple auth (email/password or Google OAuth)
- Enable brief sharing via unique URLs
- Team workspaces with shared briefs

### 3. Brief Templates

**Status: IMPLEMENTED**

- ~~Pre-built templates for common content types (blog, landing page, product)~~
- ~~Save custom templates from completed briefs~~
- ~~"Clone this brief" functionality~~

Now supports:

- Template extraction from any URL
- Brief-as-template import
- AI-powered heading adaptation to new topics

### 4. Brief Comparison View

**Current:** Can only view one brief at a time.

**Recommendation:**

- Side-by-side brief comparison
- Diff view showing changes between versions
- A/B testing support for brief variations

### 5. Enhanced Data Sources

**Current:** Only DataForSEO for competitor data.

**Recommendation:**

- Integrate Ahrefs/SEMrush as alternative data sources
- Add Google Search Console integration for performance data
- Pull in social signals (shares, engagement)

### 6. Collaborative Features

**Current:** Single-user workflow.

**Recommendation:**

- Real-time collaborative editing (like Google Docs)
- Comment threads on brief sections
- Approval workflows (Writer → Editor → Publish)
- @mentions and notifications

### 7. Analytics Dashboard

**Current:** No tracking of brief effectiveness.

**Recommendation:**

- Track published content performance
- Compare brief predictions vs actual rankings
- ROI metrics per brief
- Content calendar integration

### 8. CMS Integration

**Current:** Export only to Markdown.

**Recommendation:**

- Direct publish to WordPress, Contentful, Webflow
- Sync brief structure to CMS draft
- Two-way sync for content updates

### 9. AI Model Options

**Status: IMPLEMENTED**

- ~~Add model selector (GPT-4, Claude, etc.)~~
- ~~Allow custom fine-tuned models~~
- ~~A/B test different models for quality~~

Now supports:

- Gemini 3 Flash (fast, cost-effective)
- Gemini 3 Pro (highest quality)
- Gemini 2.5 Pro (legacy fallback)
- Thinking level control for Gemini 3 models

### 10. Keyboard Shortcuts

**Current:** Mouse-driven interface only.

**Recommendation:**

- Add power-user shortcuts (Cmd+Enter to generate, Cmd+S to save)
- Vim-style navigation for brief sections
- Quick switcher (Cmd+K) for jumping between screens

---

## Priority Roadmap

### Phase 1: Stability (Next Sprint)

- [X] ~~Add Vitest + initial test coverage for services~~ (39 tests implemented)
- [ ] Implement brief auto-save to IndexedDB
- [ ] Add error boundaries to all screens
- [ ] Remove dead code files

### Phase 2: Developer Experience (Month 1)

- [ ] Extract state into custom hooks
- [ ] Add Zod validation for API responses
- [ ] Externalize prompts to separate files
- [ ] Set up CI/CD with automated tests

### Phase 3: User Experience (Month 2)

- [ ] Brief history sidebar
- [X] ~~Template library~~ (Implemented: URL + Brief templates)
- [ ] Keyboard shortcuts
- [ ] Improved loading states

### Phase 4: Team Features (Month 3)

- [ ] User authentication
- [ ] Brief sharing
- [ ] Comment threads
- [ ] Team workspaces

---

## Development Commands

```bash
npm run dev           # Start dev server on port 3000
npm run build         # Production build
npm run preview       # Preview production build
npm test              # Run tests in watch mode
npm run test:run      # Run tests once (CI mode)
npm run test:coverage # Run tests with coverage report
```

## Contributing

1. Create feature branch from `main`
2. Follow existing code patterns
3. Run `npm run test:run` to ensure all tests pass
4. Add tests for new service functions
5. Test locally before PR
6. Keep PRs focused and small

---

## Changelog

### January 2026 - Testing & Enhanced Features Update

**Testing Infrastructure**

- Added Vitest 4.0.17 for unit testing
- Created 39 tests across 3 service test files
- Added TESTING_CHECKLIST.md for manual QA

**New AI Features**

- Search Intent Classification in Step 1 (informational, transactional, navigational, commercial_investigation)
- Featured Snippet Targeting in Step 5 (paragraph, list, table formats)
- PAA (People Also Ask) integration from SERP to FAQ generation
- Brief Validation with scoring across 5 dimensions
- E-E-A-T Signals generation (Experience, Expertise, Authority, Trust)
- Per-section word count targets in Article Structure

**DataForSEO Enhancements**

- Added PAA question extraction from SERP results
- PAA data flows through to Step 6 FAQ generation

### January 2026 - Initial Feature Update

- Added Gemini 3 model support with thinking level control
- Added template-from-URL extraction feature
- Added brief-as-template import capability
- Added word count constraints with presets
- Added section-level paragraph feedback
- Added inline content rewrite mode (select text to rewrite/expand/shorten)
- New components: ModelSelector, LengthSettings, ParagraphFeedback, InlineEditor
- New service: templateExtractionService.ts
- Extended types.ts with ModelSettings, HeadingNode, LengthConstraints, RewriteAction

---

*Generated by Claude Code analysis - Last updated: January 20, 2026*
