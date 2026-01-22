# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered SEO Content Strategist that generates comprehensive, data-driven content briefs. Built for the Cut Inside team with a multi-stage wizard that analyzes competitor content, generates SEO strategies, and produces structured content briefs.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19.1.1 + TypeScript |
| Build | Vite 6.4.1 |
| Styling | Tailwind CSS v3 (CDN) |
| AI | Google Gemini 3 Flash/Pro (with 2.5 Pro fallback) |
| Database | Supabase (PostgreSQL + Auth) |
| SEO Data | DataForSEO API |
| Document Parsing | PDF.js, Mammoth.js |
| Testing | Vitest 4.0.17 |

## Development Commands

```bash
npm run dev           # Start dev server on port 3000
npm run build         # Production build
npm run preview       # Preview production build
npm test              # Run tests in watch mode
npm run test:run      # Run tests once (CI mode)
npm run test:coverage # Run tests with coverage report
```

## Environment Variables

```env
# Required
GEMINI_API_KEY=your_gemini_api_key

# Supabase (optional - enables persistence & auth)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# DataForSEO (optional - auto-fills credentials in UI)
VITE_DATAFORSEO_LOGIN=your-dataforseo-login
VITE_DATAFORSEO_PASSWORD=your-dataforseo-password
```

When Supabase env vars are not set, app runs in standalone mode without persistence.

## Architecture

### Application Modes

The app has two modes controlled by `AppWrapper.tsx`:

1. **Standalone Mode** (no Supabase): Direct access to brief wizard, no persistence
2. **Supabase Mode**: Login → Client Select → Brief List → Brief Editor with auto-save

### Entry Point Flow

```
index.tsx → AppWrapper.tsx → AuthProvider
                           ↓
              ┌────────────┴────────────┐
              │                         │
        isConfigured?              standalone
              │                         │
        LoginScreen                 OriginalApp
              ↓
        ClientSelectScreen
              ↓
        BriefListScreen
              ↓
        OriginalApp (with briefId)
```

### Brief Generation Pipeline (7 Steps)

1. **Page Goal & Audience** - Purpose, target readers, search intent classification
2. **Keyword Strategy** - Primary/secondary keyword mapping
3. **Competitor Analysis** - Breakdown of top competitors
4. **Content Gap Analysis** - Table stakes vs opportunities
5. **Article Structure** - Hierarchical outline, featured snippet targeting
6. **FAQ Generation** - Questions from PAA data
7. **On-Page SEO** - Title, meta, H1, slug, OG tags

### Key Directories

```
├── components/
│   ├── screens/        # Full-page views (Login, ClientSelect, BriefList, etc.)
│   ├── stages/         # Brief step components (Stage1-8)
│   ├── briefs/         # Brief-related components (BriefListCard, BriefStatusBadge)
│   └── clients/        # Client-related components (ClientCard)
├── contexts/
│   ├── AuthContext.tsx # Access code authentication state
│   └── AppContext.tsx  # Global app state (unused currently)
├── hooks/
│   ├── useAutoSave.ts  # Debounced auto-save to Supabase
│   └── useBriefLoader.ts # Load brief data from Supabase
├── services/
│   ├── supabaseClient.ts    # Supabase client + isSupabaseConfigured()
│   ├── authService.ts       # Access code login/logout
│   ├── briefService.ts      # Brief CRUD operations
│   ├── clientService.ts     # Client/folder management
│   ├── competitorService.ts # Save/load competitor data
│   ├── contextService.ts    # Context files/URLs
│   ├── articleService.ts    # Generated articles
│   ├── geminiService.ts     # Google Gemini API
│   ├── dataforseoService.ts # SERP & on-page analysis
│   └── markdownService.ts   # Brief export/import
├── types/
│   ├── database.ts     # Supabase table types
│   └── appState.ts     # App state types
├── supabase/
│   └── schema.sql      # Database schema (7 tables)
├── App.tsx             # Main brief wizard logic (state hub)
├── AppWrapper.tsx      # Auth + navigation wrapper
└── types.ts            # Legacy types (ContentBrief, etc.)
```

### Database Schema (Supabase)

7 tables with RLS enabled:
- `access_codes` - Authentication via unique codes
- `clients` - Folders/workspaces for organizing briefs
- `briefs` - Main entity with all brief data as JSONB
- `brief_competitors` - Competitor analysis data
- `brief_context_files` - Uploaded file metadata
- `brief_context_urls` - Scraped URL content
- `brief_articles` - Generated article versions

### State Management

`App.tsx` manages 20+ useState hooks. Key state:
- `currentView` - Which screen is displayed
- `briefingStep` - Current step (1-7) in brief wizard
- `briefData` - The ContentBrief object being built
- `competitorData` - SERP analysis results
- `staleSteps` - Set of steps needing regeneration

Auto-save is handled by `useAutoSave` hook which debounces updates to Supabase.

## Key Patterns

### Authentication Flow

Uses custom access code auth (not Supabase Auth):
1. User enters access code
2. `authService.loginWithAccessCode()` validates against `access_codes` table
3. Session stored in localStorage
4. `AuthContext` provides `isAuthenticated`, `userId`, `isAdmin`

### Brief Persistence

When in Supabase mode:
1. Creating brief: `briefService.createBrief(clientId, name)`
2. Auto-save: `useAutoSave` hook saves on state changes (500ms debounce)
3. Loading: `useBriefLoader` restores full state from database

### API Services

All external APIs are in `/services`:
- `geminiService.ts` - Handles model selection, thinking levels, JSON parsing
- `dataforseoService.ts` - SERP queries, on-page analysis, PAA extraction

### Environment Variable Access

Vite requires `VITE_` prefix for client-side env vars:
```typescript
const url = import.meta.env.VITE_SUPABASE_URL;
```

Check if configured:
```typescript
import { isSupabaseConfigured } from './services/supabaseClient';
if (isSupabaseConfigured()) { /* use Supabase */ }
```

## Testing

Tests are in `/tests/services/`:
- `dataforseoService.test.ts` - 13 tests
- `markdownParserService.test.ts` - 14 tests
- `templateExtractionService.test.ts` - 12 tests

Run with: `npm test` or `npm run test:run`

## Deployment

Deployed to Vercel. Environment variables must be set in Vercel dashboard.
Push to `master` triggers auto-deploy.
