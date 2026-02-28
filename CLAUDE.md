# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered SEO Content Strategist that generates comprehensive, data-driven content briefs. Built for the Cut Inside team with a multi-stage wizard that analyzes competitor content, generates SEO strategies, and produces structured content briefs with full article generation.

## Tech Stack

| Layer            | Technology                                       |
| ---------------- | ------------------------------------------------ |
| Frontend         | React 19.1.1 + TypeScript                        |
| Build            | Vite 6.4.1                                       |
| Styling          | Tailwind CSS v4 (`@tailwindcss/vite` plugin)     |
| AI               | Google Gemini via Supabase Edge Functions          |
| Database         | Supabase (PostgreSQL + RLS)                      |
| SEO Data         | DataForSEO API                                   |
| UI Primitives    | Radix UI (Popover, Collapsible, Accordion, etc.) |
| Document Parsing | PDF.js, Mammoth.js                               |
| Testing          | Vitest 4.0.17                                    |

## Development Commands

```bash
npm run dev           # Start dev server on port 3000
npm run build         # Production build
npm run preview       # Preview production build
npm test              # Run tests in watch mode
npm run test:unit     # Run unit tests once (same as test:run)
npm run test:e2e      # Run Playwright E2E tests
npm run test:run      # Run tests once (CI mode)
npm run test:coverage # Run tests with coverage report

# Run a specific test file
npx vitest run tests/services/dataforseoService.test.ts
```

Unit tests are in `tests/services/` (currently 45 tests across 4 files). `test:run` only collects `tests/**` and excludes Playwright specs under `e2e/`.

## Environment Variables

```env
# Supabase (required for full functionality — auth, persistence, AI proxy)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# Supabase mode: DataForSEO credentials are stored as Edge Function secrets
# (DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD)
# Standalone mode can still use optional frontend defaults:
# VITE_DATAFORSEO_LOGIN=...
# VITE_DATAFORSEO_PASSWORD=...
```

When Supabase env vars are not set, app runs in standalone mode without persistence.

**Important:** There is no client-side `GEMINI_API_KEY`. All Gemini calls go through a Supabase Edge Function (`gemini-proxy`) which holds the API key in its secrets. See `services/geminiService.ts` — both `callGemini()` and `callGeminiStream()` hit the edge function endpoint.

Vite requires `VITE_` prefix for all client-side env vars (`import.meta.env.VITE_*`). Check Supabase availability with `isSupabaseConfigured()` from `services/supabaseClient.ts`.

## Architecture

### Source Layout

All source files are at the **project root** — there is no `src/` directory.

- `App.tsx` — Main brief wizard logic, state hub with 20+ useState hooks
- `AppWrapper.tsx` — Auth flow, navigation between screens, background generation orchestration
- `constants.ts` — All Gemini system prompts, word count thresholds, thinking budget configs
- `types.ts` — Core domain types (`ContentBrief`, `CompetitorPage`, `OnPageSeo`, etc.)
- `types/appState.ts` — Full `AppState` interface, `SaveStatus` type
- `types/database.ts` — Supabase table row types
- `styles/globals.css` — Tailwind v4 `@theme` block with all design tokens

### Application Modes

The app has two modes controlled by `AppWrapper.tsx`:

1. **Standalone Mode** (no Supabase): Direct access to brief wizard, no persistence
2. **Supabase Mode**: Login → Client Select → Brief List → Brief Editor with auto-save

```
index.tsx → AppWrapper.tsx → AuthProvider
                           ↓
              ┌────────────┴────────────┐
              │                         │
        isConfigured?              standalone
              │                         │
        LoginScreen                 App (no briefId)
              ↓
        ClientSelectScreen
              ↓
        BriefListScreen
              ↓
        App (with briefId)
```

### Brief Generation Pipeline (7 Steps)

Each step is a screen in `components/stages/Stage{1-7}*.tsx` and a Gemini prompt in `constants.ts`:

1. **Page Goal & Audience** — Search intent classification, target readers
2. **Keyword Strategy** — Primary/secondary keyword mapping
3. **Competitor Analysis** — Per-competitor breakdown with strengths/weaknesses
4. **Content Gap Analysis** — Table stakes vs strategic opportunities
5. **Article Structure** — Hierarchical outline, featured snippet targeting
6. **FAQ Generation** — Questions from People Also Ask data
7. **On-Page SEO** — Title tag, meta description, H1, slug, OG tags

### Gemini AI Integration (Dual Mode)

The app supports two generation paths: **frontend** (legacy, still used in standalone mode) and **backend** (Supabase mode, actively being migrated to):

**Frontend path** (`services/geminiService.ts` → `gemini-proxy` Edge Function):
- `callGemini()` / `callGeminiStream()` — Proxied Gemini API calls
- `generateBriefStep()` — Brief steps 1-7 with structured JSON output
- `generateArticleSection()` — Article content with streaming
- System prompts and JSON schemas in `constants.ts`

**Backend path** (job queue → Edge Functions → direct Gemini REST API):
- `create-generation-job` Edge Function — Creates jobs, snapshots brief config
- `process-generation-queue` Edge Function — Worker processing pending jobs via pg_cron
- `_shared/` modules — Server-side ports of generation logic (types, prompts, schemas, gemini-client, step-executor, article-generator, brief-context, generation-config)
- Frontend subscribes via Supabase Realtime for live progress updates

**In Supabase mode**, the backend handles all job types (`competitors`, `brief_step`, `full_brief`, `regenerate`, `article`). The frontend delegates via `services/generationJobService.ts` → `createGenerationJob()`.

**DataForSEO dual mode:** `services/dataforseoService.ts` is kept for standalone mode (no Supabase). In Supabase mode, competitor analysis runs server-side via the `competitors` job type using `_shared/dataforseo-client.ts`.

### Key Component Layers

```
components/
├── screens/     # Full-page views (11 screens: Login, ClientSelect, BriefList,
│                #   InitialInput, ContextInput, CompetitionViz, Briefing,
│                #   Dashboard, ContentGeneration, Article, BriefUpload)
├── stages/      # Brief step editors (Stage1Goal through Stage7Seo)
├── ui/          # Reusable component library — custom + Radix primitives
│   ├── *.tsx          # Custom components (Card, Badge, Input, Modal, etc.)
│   ├── primitives/    # Radix UI wrappers (accordion, popover, tooltip, etc.)
│   └── index.ts       # Barrel export — import everything from '../ui'
├── briefs/      # Brief list cards, status badges, workflow select, publish modal,
│                #   BulkGenerationModal (keyword/existing-brief batch creation),
│                #   BatchProgressPanel (floating panel for active batch progress)
├── articles/    # Article list cards, article status badges
└── clients/     # Client selection cards, client profile sections
```

### State Management

`App.tsx` manages 20+ useState hooks (no external state library). Key state:

- `currentView: AppView` — Which screen is displayed (`'initial_input' | 'context_input' | 'visualization' | 'briefing' | 'dashboard' | 'content_generation' | 'article_view' | 'brief_upload'`)
- `briefingStep` — Current step (1-7) in brief wizard
- `briefData: Partial<ContentBrief>` — The brief object being built
- `competitorData: CompetitorPage[]` — SERP analysis results
- `staleSteps: Set<number>` — Steps needing regeneration after edits

Auto-save: `useAutoSave` hook debounces state changes (500ms) and persists to Supabase. Accepts `currentDbStatus` option to guard against overwriting workflow statuses.

### Parallel Background Generation

`AppWrapper.tsx` tracks multiple simultaneous brief generations via `generatingBriefs: Record<string, GeneratingBrief>`. Hidden `<App>` instances render off-screen to maintain React state while the user navigates elsewhere. A floating panel shows progress with "View" buttons.

### Backend Generation Architecture (Job Queue)

Server-side generation uses a job queue pattern with Supabase Edge Functions:

```
Frontend POST → create-generation-job → generation_jobs table (pending)
                                              ↓
pg_cron (every 10-30s) → process-generation-queue Edge Function
                                              ↓
                         Claims job → Calls Gemini API directly → Saves results to DB
                                              ↓
                         Supabase Realtime → Frontend updates live
```

**Edge Functions** (in `supabase/functions/`):
- `create-generation-job/index.ts` — Validates input, snapshots config, inserts job (verify_jwt: true)
- `create-generation-batch/index.ts` — Creates bulk generation batches with N briefs + chained jobs (verify_jwt: true)
- `process-generation-queue/index.ts` — Worker processing pending jobs, updates batch counters, chains full_brief after competitors (verify_jwt: false, called by pg_cron)

**Shared modules** (`supabase/functions/_shared/`):
- `types.ts` — Server-side type definitions (ContentBrief, CompetitorPage, StepExecutionParams, etc.)
- `gemini-client.ts` — Direct Gemini REST API client (`callGeminiDirect()`, `retryOperation()` with exponential backoff + jitter)
- `prompts.ts` — All system prompts for steps 1-7 and article generation
- `schemas.ts` — JSON response schemas for Gemini structured output
- `step-executor.ts` — Main step execution logic including 3-phase Step 5 (skeleton → enrichment → resources)
- `article-generator.ts` — Full article generation with word count enforcement (expand/trim cycles)
- `brief-context.ts` — Brand context building, token budget management, competitor text truncation
- `generation-config.ts` — Thinking budgets, model config builders
- `dataforseo-client.ts` — Direct DataForSEO REST API client (SERP analysis + on-page content parsing)
- `generation-guards.ts` — Shared guard helpers for client ownership and cancellation/chaining control flow
- `cors.ts` — CORS headers configuration for Edge Functions

**Batch generation flow** (`create-generation-batch` → `process-generation-queue`):
- User provides keyword groups (each group = one brief with multiple keywords) or selects existing briefs
- `create-generation-batch` creates a `generation_batches` row + N brief rows + N competitor jobs (for `full_pipeline`) or N full_brief/article jobs
- `process-generation-queue` processes jobs, updates batch counters atomically via `increment_batch_counter()` RPC, and chains `full_brief` jobs after `competitors` jobs complete
- `generation_batches` table has Realtime enabled for live progress updates to `BatchProgressPanel`

**Frontend hooks for backend generation:**
- `hooks/useGenerationSubscription.ts` — Realtime subscription to `generation_jobs` table changes
- `hooks/useBriefRealtimeSync.ts` — Realtime subscription to `briefs` table for step completion updates
- `hooks/useBatchSubscription.ts` — Realtime subscription to `generation_batches` table for batch progress
- `services/generationJobService.ts` — CRUD for generation jobs (create, cancel, get active)
- `services/batchService.ts` — Batch operations (createGenerationBatch, cancelBatch, getBatchesForClient, getJobsForBatch)

**All job types implemented:** `competitors`, `brief_step`, `full_brief`, `regenerate`, `article`

**Deployment:** Use `mcp__supabase__deploy_edge_function` MCP tool. Import paths in deployed bundles must use `./_shared/` (not `../_shared/`). All `_shared/*.ts` files must be included in the deployment `files` array. Project ID: `iwzaikvwiwrgyliykqah`. Three Edge Functions to deploy: `create-generation-job` (verify_jwt: true), `create-generation-batch` (verify_jwt: true), `process-generation-queue` (verify_jwt: false).

### Database Schema (Supabase)

10 tables with RLS enabled (base schema in `supabase/schema.sql`, generation tables in `supabase/migrations/003_add_generation_jobs.sql`, batch infrastructure in `supabase/migrations/004_batch_generation.sql`):

- `access_codes` — Custom auth (not Supabase Auth), codes validated against this table
- `clients` — Folders/workspaces for organizing briefs
- `briefs` — Main entity, brief data stored as JSONB, `active_job_id` links to running generation
- `brief_competitors` — Competitor analysis data per brief
- `brief_context_files` — Uploaded file metadata (files in Supabase Storage)
- `brief_context_urls` — Scraped URL content
- `brief_articles` — Generated article versions with `is_current` flag and workflow status
- `generation_jobs` — Job queue for server-side generation (brief steps, full briefs, articles, regeneration)
- `generation_batches` — Groups related jobs for bulk generation operations (Realtime enabled, `increment_batch_counter()` RPC for atomic updates)

### Workflow Status System

Briefs and articles have a two-phase status lifecycle:

**Phase 1 — Generation (auto-computed):** `draft → in_progress → complete`
**Phase 2 — Workflow (manual):** `complete → sent_to_client → approved → in_writing → published` (briefs can also go through `changes_requested`)

Key types in `types/database.ts`:
- `BriefStatus` — 9 values covering both phases + `archived`
- `ArticleStatus` — 4 values: `draft | sent_to_client | approved | published`
- `WORKFLOW_STATUSES` array and `isWorkflowStatus()` helper distinguish manual from auto-computed statuses

**Critical: Auto-save guard.** The auto-save system (`useAutoSave.ts`) and background generation (`AppWrapper.tsx`) must NOT overwrite manual workflow statuses with computed ones. Both use `isWorkflowStatus()` checks before setting status. When modifying anything related to brief status writes, always check whether the current status is a workflow status first.

Transition rules are defined in `WorkflowStatusSelect.tsx` (`BRIEF_TRANSITIONS` and `ARTICLE_TRANSITIONS` maps). The `PublishedUrlModal` handles URL input when setting status to "Published".

**Important:** `briefData` (type `Partial<ContentBrief>`) does NOT have workflow fields like `published_url`. Those live on the DB `Brief` type. Don't try to access `briefData.published_url` — use the DB brief object or a separate state variable.

### Authentication

Uses custom access code auth (not Supabase Auth):

1. User enters access code → `authService.loginWithAccessCode()` validates against `access_codes` table
2. Session stored in localStorage
3. `AuthContext` provides `isAuthenticated`, `userId`, `isAdmin`

## UI Design System

**Prefer shadcn/ui components and patterns whenever possible.** The project is configured for shadcn (new-york style, `components.json` at root). When adding new UI elements, check if a shadcn component exists first (`npx shadcn@latest add <component>`) before building custom. Existing primitives in `components/ui/primitives/` are shadcn-generated. Use the `cn()` utility from `lib/utils.ts` for conditional class merging.

### Styling: Tailwind CSS v4

Tailwind v4 uses the `@tailwindcss/vite` plugin (not CDN). All design tokens are defined as CSS custom properties in `styles/globals.css` using `@theme {}` blocks — not a `tailwind.config.ts` file.

### Design Tokens

- **Surfaces:** `bg-background` (#F9FAFB), `bg-card` (#FFFFFF), `bg-secondary` (#F3F4F6)
- **Text:** `text-foreground` (#111827), `text-muted-foreground` (#6B7280)
- **Borders:** `border-border` (#E5E7EB)
- **Brand:** `text-primary`/`bg-primary` (#0D9488), `text-teal`/`bg-teal` (#0D9488)
- **Status:** `text-status-complete`, `text-status-error`, `text-status-generating`, `text-status-draft`
- **Fonts:** `font-sans` (Inter), `font-heading` (Familjen Grotesk)

### Component Patterns

- **Barrel exports:** Import UI components from `'../ui'` (e.g., `import { Card, Badge, Alert } from '../ui'`)
- **Radix primitives:** Wrapped in `components/ui/primitives/` — Accordion, Collapsible, Popover, Tooltip, DropdownMenu, ScrollArea, etc.
- **`AIReasoningIcon`:** Sparkle icon + Popover showing AI reasoning text. Replaces older `Callout variant="ai"` pattern.
- **`EditableText`:** Click-to-edit text display. Replaces scroll-box Textareas for brief content.
- **`PreWizardHeader`:** Shared header for pre-wizard screens (Login, ClientSelect, BriefList).
- **`Sidebar`:** Has two view modes — brief editor mode and `brief_list` mode (with `clientName`, `onBackToClients`, `briefCounts` props).
- **`WorkflowStatusSelect`:** Reusable dropdown for changing brief/article workflow status. Uses `entityType` prop (`'brief'` or `'article'`) to select the correct transition map.
- **`PublishedUrlModal`:** Modal for entering a published URL when setting status to "Published". Used in BriefListCard, ArticleListCard, and DashboardScreen.

### Path Alias

The `@/` alias maps to project root: `import { Card } from '@/components/ui'`

## Gotchas

- **Variable ordering in components:** `const` declarations used in `useCallback`/`useMemo` dependency arrays must be declared BEFORE the hooks that reference them. The dependency array is evaluated eagerly — referencing a later `const` causes a TDZ (Temporal Dead Zone) crash in production builds that is invisible in dev mode.
- **`SaveStatus` type:** `'saved' | 'saving' | 'unsaved' | 'error'` — there is no `'idle'` state.
- **App.tsx prop renaming:** When `App` receives `saveStatus` and `lastSavedAt` as props, they're renamed internally: `saveStatus: externalSaveStatus`, `lastSavedAt: externalLastSavedAt`.
- **Build warning:** Production build produces a single ~1,064KB chunk. This is expected — the chunk size warning is pre-existing and not a regression.
- **`ContentBrief` vs `Brief` types:** `Partial<ContentBrief>` (from `types.ts`) is the in-memory brief data for the 7-step pipeline. `Brief` (from `types/database.ts`) is the DB row with metadata like `status`, `published_url`, `published_at`. Don't confuse them — DB-only fields are NOT on `ContentBrief`.
- **Auto-save status regression:** If you add any code path that writes `status` to the `briefs` table (e.g., setting `'in_progress'` or `'complete'`), you MUST guard it with `isWorkflowStatus()` to avoid overwriting manually-set workflow statuses. This applies to `saveBriefState()`, `updateBriefProgress()`, and all generation callbacks in `AppWrapper.tsx`.
- **Supabase migration DDL:** When adding columns with `ADD COLUMN IF NOT EXISTS` combined with inline `CHECK` constraints, PostgreSQL may not support the inline syntax. Separate the `ADD COLUMN` and `ADD CONSTRAINT` into distinct statements (use a `DO $$ ... $$` block to conditionally add the constraint).
- **Color consistency across views:** When a status appears in multiple places (card borders, section headings, sidebar counts), keep the indicator color consistent. For example, "Published" uses emerald (`bg-emerald-500`, `border-l-emerald-500`) everywhere — not blue in some places and emerald in others.
- **Edge Function deployment:** When deploying via MCP `deploy_edge_function`, ALL `_shared/*.ts` files must be included in the `files` array (10 files total). Import paths must be `./_shared/` not `../_shared/`. Missing even one file causes "Module not found" errors. The `process-generation-queue` uses `verify_jwt: false` (called by pg_cron); `create-generation-job` and `create-generation-batch` use `verify_jwt: true`.
- **`LengthConstraints` type:** Uses `globalTarget` (not `totalWordCount`). The property `briefData.article_structure?.word_count_target` is the fallback when `globalTarget` is null.
- **`GenerationJobProgress` type sync:** The `GenerationJobProgress` interface in `types/database.ts` must match the JSONB shape written by edge functions. Backend writes `total_sections`, `percentage`, `word_count` — keep the interface in sync when adding new progress fields.
- **Article thinking budget:** `buildArticleGenerationConfig()` uses a fixed `ARTICLE_THINKING_BUDGET` (8192) regardless of user's thinking level preference. This is intentional — do not wire `thinkingLevel` through for articles.
- **`cancelGenerationJob()` clears `active_job_id`:** After cancelling a job, the service also clears `briefs.active_job_id` to prevent stale pointers. This is best-effort (warns on failure, doesn't throw).
- **Regenerate Realtime race:** When a regenerate job completes, `App.tsx` does a one-time `getBrief()` fetch to catch brief data that may have been dropped by the Realtime subscription guard. This is necessary because the job status event can arrive before the brief data event.
- **Resumable article generation:** Articles with 20+ sections survive EF timeouts via checkpoint-based resume. After each section, `contentParts[]` and `completed_section_index` are saved to `job.progress` JSONB. Critical: the `onProgress` callback must always carry forward the last checkpoint state (`lastCheckpointContent`/`lastCheckpointIndex`), because `updateJobProgress` replaces the entire JSONB — non-checkpoint progress calls (e.g., trim notifications) would otherwise wipe checkpoint data. Stale job timeout is 4 minutes.

## Deployment

Deployed to Vercel. Environment variables set in Vercel dashboard. Push to `master` triggers auto-deploy.
