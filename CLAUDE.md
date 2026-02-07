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
| AI               | Google Gemini via Supabase Edge Function proxy    |
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
npm run test:run      # Run tests once (CI mode)
npm run test:coverage # Run tests with coverage report

# Run a specific test file
npx vitest run tests/services/dataforseoService.test.ts
```

Tests are in `tests/services/` (39 tests across 3 files). Test environment is `node` (not jsdom).

## Environment Variables

```env
# Supabase (required for full functionality — auth, persistence, AI proxy)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# DataForSEO (optional — auto-fills credentials in UI)
VITE_DATAFORSEO_LOGIN=your-dataforseo-login
VITE_DATAFORSEO_PASSWORD=your-dataforseo-password
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

### Gemini AI Integration

All AI calls route through `services/geminiService.ts` → Supabase Edge Function `gemini-proxy`:

- `callGemini()` — Non-streaming, returns full response
- `callGeminiStream()` — SSE streaming via fetch, yields chunks
- `generateBriefStep()` — Brief pipeline (steps 1-7), uses structured JSON output with schemas
- `generateArticleSection()` — Article content generation with streaming
- System prompts and JSON schemas live in `constants.ts` (`getSystemPrompt()`, `getContentGenerationPrompt()`, etc.)

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
├── briefs/      # Brief list cards, status badges
└── clients/     # Client selection cards
```

### State Management

`App.tsx` manages 20+ useState hooks (no external state library). Key state:

- `currentView: AppView` — Which screen is displayed (`'initial_input' | 'context_input' | 'visualization' | 'briefing' | 'dashboard' | 'content_generation' | 'article_view' | 'brief_upload'`)
- `briefingStep` — Current step (1-7) in brief wizard
- `briefData: Partial<ContentBrief>` — The brief object being built
- `competitorData: CompetitorPage[]` — SERP analysis results
- `staleSteps: Set<number>` — Steps needing regeneration after edits

Auto-save: `useAutoSave` hook debounces state changes (500ms) and persists to Supabase.

### Parallel Background Generation

`AppWrapper.tsx` tracks multiple simultaneous brief generations via `generatingBriefs: Record<string, GeneratingBrief>`. Hidden `<App>` instances render off-screen to maintain React state while the user navigates elsewhere. A floating panel shows progress with "View" buttons.

### Database Schema (Supabase)

7 tables with RLS enabled (schema in `supabase/schema.sql`):

- `access_codes` — Custom auth (not Supabase Auth), codes validated against this table
- `clients` — Folders/workspaces for organizing briefs
- `briefs` — Main entity, brief data stored as JSONB
- `brief_competitors` — Competitor analysis data per brief
- `brief_context_files` — Uploaded file metadata (files in Supabase Storage)
- `brief_context_urls` — Scraped URL content
- `brief_articles` — Generated article versions with `is_current` flag

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

### Path Alias

The `@/` alias maps to project root: `import { Card } from '@/components/ui'`

## Gotchas

- **Variable ordering in components:** `const` declarations used in `useCallback`/`useMemo` dependency arrays must be declared BEFORE the hooks that reference them. The dependency array is evaluated eagerly — referencing a later `const` causes a TDZ (Temporal Dead Zone) crash in production builds that is invisible in dev mode.
- **`SaveStatus` type:** `'saved' | 'saving' | 'unsaved' | 'error'` — there is no `'idle'` state.
- **App.tsx prop renaming:** When `App` receives `saveStatus` and `lastSavedAt` as props, they're renamed internally: `saveStatus: externalSaveStatus`, `lastSavedAt: externalLastSavedAt`.
- **Build warning:** Production build produces a single ~980KB chunk. This is expected — the chunk size warning is pre-existing and not a regression.

## Deployment

Deployed to Vercel. Environment variables set in Vercel dashboard. Push to `master` triggers auto-deploy.
