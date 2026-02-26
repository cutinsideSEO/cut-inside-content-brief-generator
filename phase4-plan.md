# Phase 4: Competitor Analysis — Backend Migration Plan

## Overview

Move DataForSEO SERP + on-page calls from the browser to Supabase Edge Functions. After this phase, the entire generation pipeline (competitors → brief steps 1-7 → article) runs server-side. No more client-side API credentials.

**Credential Strategy:** Store DataForSEO credentials as Supabase Edge Function secrets (like `GEMINI_API_KEY`). Remove all credential UI and env vars from frontend.

---

## Workstream A: Backend (Edge Functions + Shared Modules)

### A1. Create `supabase/functions/_shared/dataforseo-client.ts` (NEW FILE)

Port the two DataForSEO API functions from `services/dataforseoService.ts` to a Deno server-side module.

**Functions to implement:**

```typescript
// Credentials from Deno.env.get('DATAFORSEO_LOGIN') / Deno.env.get('DATAFORSEO_PASSWORD')
// NOT passed as parameters — read from environment

export async function getSerpUrls(
  keyword: string, country: string, language: string
): Promise<{ urls: SerpResult[], paaQuestions: string[] }>

export async function getOnPageElements(
  url: string
): Promise<{ H1s: string[], H2s: string[], H3s: string[], Word_Count: number, Full_Text: string }>
```

**Key implementation details:**
- Auth: `Authorization: Basic ${btoa(login + ':' + password)}` — same as frontend `dataforseoService.ts` line 41
- SERP endpoint: `https://api.dataforseo.com/v3/serp/google/organic/live/regular` (POST)
  - Payload: `[{ keyword, language_name, location_name, depth: 20 }]`
  - Parse: `result.tasks[0].result[0].items` → filter `type === 'organic'` → take top 10
  - Also extract PAA: filter `type === 'people_also_ask'` → map `.title`
- On-Page endpoint: `https://api.dataforseo.com/v3/on_page/content_parsing/live` (POST)
  - Payload: `[{ url, enable_javascript: true }]`
  - Parse: `result.tasks[0].result[0].items[0]` → extract `page_content.header.h1/h2/h3`, `plain_text_word_count`, `plain_text_content`
- Wrap all calls with existing `retryOperation()` from `gemini-client.ts` (exponential backoff + jitter)
- 30-second timeout per request
- Validate response: check `status_code === 20000` and `tasks_error === 0`

**Reference files:**
- `services/dataforseoService.ts` (lines 72-163) — the exact API calls to port
- `supabase/functions/_shared/gemini-client.ts` (lines 110-140) — `retryOperation()` pattern to reuse

---

### A2. Add `processCompetitors()` to `supabase/functions/process-generation-queue/index.ts`

New handler function implementing the full competitor analysis flow. Add as a case in the job type switch (line ~718).

**Implementation:**

```
async function processCompetitors(supabase: SupabaseClient, job: GenerationJob):
  1. Extract from job.config: keywords[], country, serp_language, output_language
  2. SERP PHASE:
     - For each keyword:
       a. Call getSerpUrls(keyword, country, serp_language)
       b. Aggregate URLs by weighted score (volume × rank weight)
       c. Collect PAA questions (deduplicated)
       d. Update job progress: { phase: 'serp', completed_keywords: N, total_keywords: M }
       e. Wait 1 second between calls (rate limiting)
  3. ON-PAGE PHASE:
     - Sort aggregated URLs by weighted score descending, take top 10
     - For each URL:
       a. Call getOnPageElements(url)
       b. Build CompetitorPage object: { URL, Weighted_Score, rankings, H1s, H2s, H3s, Word_Count, Full_Text }
       c. Update job progress: { phase: 'onpage', completed_urls: N, total_urls: M, percentage }
       d. Wait 1 second between calls
  4. SAVE PHASE:
     - Upsert competitors to brief_competitors table (onConflict: 'brief_id,url')
     - Save PAA questions to briefs.paa_questions
     - Delete old competitors not in new list (cleanup)
  5. Mark job completed, clear active_job_id
```

**Weighted score calculation** (from App.tsx lines 721-730):
```typescript
const RANK_WEIGHTS: Record<number, number> = {
  1: 10, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1
};
// For each SERP result: weightedScore += volume * RANK_WEIGHTS[rank]
```

**Error handling:**
- If a single on-page scrape fails, log warning and continue with remaining URLs (don't fail whole job)
- If SERP call fails after retries, fail the job
- On transient errors, return job to 'pending' for retry (existing pattern)

**Reference files:**
- `App.tsx` lines 633-783 — the full `handleStartAnalysis` logic to replicate
- `services/competitorService.ts` lines 38-119 — the upsert pattern for `brief_competitors`
- `process-generation-queue/index.ts` — existing handler patterns (processBriefStep, processArticle, etc.)

---

### A3. Update `supabase/functions/create-generation-job/index.ts`

**Changes needed:**

1. **Line ~29:** Add `'competitors'` to `validJobTypes` array:
   ```typescript
   const validJobTypes = ['competitors', 'brief_step', 'full_brief', 'regenerate', 'article'];
   ```

2. **Config snapshot for competitors** (add new branch around line ~102):
   ```typescript
   if (job_type === 'competitors') {
     // Competitors job needs keywords + location, NOT brief_data/brand context
     config = {
       keywords: body.keywords || brief.keywords || [],
       keyword_volumes: body.keyword_volumes || {},  // { keyword: volume }
       country: body.country || 'United States',
       serp_language: body.serp_language || 'English',
       output_language: body.output_language || 'English',
     };
   }
   ```

3. **Initial progress** (line ~156):
   ```typescript
   job_type === 'competitors'
     ? { phase: 'serp', completed_keywords: 0, total_keywords: (config.keywords?.length || 0), completed_urls: 0, total_urls: 0, percentage: 0 }
   ```

**Reference:** Existing config snapshot pattern at lines 102-137.

---

## Workstream B: Frontend Changes

### B1. Update `types/database.ts` — GenerationJobProgress

Add competitor-specific progress fields:

```typescript
export interface GenerationJobProgress {
  // Existing fields (keep all)
  current_step?: number;
  total_steps?: number;
  step_name?: string;
  percentage?: number;
  current_section?: string;
  current_index?: number;
  total_sections?: number;
  word_count?: number;

  // NEW: Competitor analysis progress
  phase?: string;              // 'serp' | 'onpage'
  completed_keywords?: number;
  total_keywords?: number;
  completed_urls?: number;
  total_urls?: number;
  current_domain?: string;     // e.g. "example.com" being scraped
}
```

---

### B2. Update `services/generationJobService.ts`

Add competitor-specific options to `createGenerationJob`:

```typescript
export async function createGenerationJob(
  briefId: string,
  jobType: GenerationJobType,
  options?: {
    stepNumber?: number;
    userFeedback?: string;
    writerInstructions?: string;
    // NEW: Competitor analysis options
    keywords?: string[];
    keywordVolumes?: Record<string, number>;
    country?: string;
    serpLanguage?: string;
    outputLanguage?: string;
  }
): Promise<{ jobId: string }> {
  const { data, error } = await supabase.functions.invoke('create-generation-job', {
    body: {
      brief_id: briefId,
      job_type: jobType,
      step_number: options?.stepNumber,
      user_feedback: options?.userFeedback,
      writer_instructions: options?.writerInstructions,
      // NEW fields
      keywords: options?.keywords,
      keyword_volumes: options?.keywordVolumes,
      country: options?.country,
      serp_language: options?.serpLanguage,
      output_language: options?.outputLanguage,
    },
  });
  // ... rest unchanged
}
```

---

### B3. Update `App.tsx` — Replace `handleStartAnalysis`

**REMOVE** the current `handleStartAnalysis` internals (lines 633-783, ~150 lines of DataForSEO loops).

**REPLACE** with backend job creation (~30 lines):

```typescript
const handleStartAnalysis = useCallback(async (
  keywords: string[],
  country: string,
  serpLanguage: string,
  outputLanguage: string,
  keywordVolumes: Record<string, number>,
  templateUrl?: string,
  lengthConstraints?: LengthConstraints,
  // REMOVED: login, password parameters
) => {
  try {
    setError(null);
    setAnalysisLogs([]);
    setCurrentView('context_input');

    // Save initial brief metadata
    setSerpCountry(country);
    setSerpLanguage(serpLanguage);
    setOutputLanguage(outputLanguage);

    // Store keywords + settings on brief (for auto-save to persist)
    // ... existing keyword/language state updates ...

    if (isSupabaseMode && briefId) {
      // Backend mode: create competitors job
      const { jobId } = await createGenerationJob(briefId, 'competitors', {
        keywords,
        keywordVolumes,
        country,
        serpLanguage,
        outputLanguage,
      });
      console.log('Started backend competitor analysis job:', jobId);
      await refreshJob();
      if (onGenerationStart) onGenerationStart('competitors', briefId);
    } else {
      // Standalone mode: keep existing frontend DataForSEO calls
      // (existing code stays for standalone/no-Supabase mode)
    }
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Analysis failed');
  }
}, [briefId, isSupabaseMode, refreshJob, onGenerationStart]);
```

**ALSO REMOVE:**
- `apiLogin` / `apiPassword` state (lines 192-193)
- Any references to `apiLogin` / `apiPassword` throughout App.tsx

**KEEP** the standalone mode fallback — users without Supabase can still use frontend DataForSEO.

**ADD** completion handler for competitors job (extend existing useEffect at ~line 448):
```typescript
// When competitors job completes:
if (activeJob?.job_type === 'competitors' && activeJob?.status === 'completed') {
  // Reload competitors from DB
  const competitors = await getCompetitorsForBrief(briefId);
  setCompetitorData(toCompetitorPages(competitors));
  // Load PAA questions
  const brief = await getBrief(briefId);
  setPaaQuestions(brief.paa_questions || []);
}
```

---

### B4. Update `components/screens/InitialInputScreen.tsx`

**REMOVE** (when Supabase mode):
- DataForSEO login/password input fields (lines 442-463)
- `hasDfsEnvCredentials` logic (lines 53-56)
- `login` / `password` state variables (lines 92-93)
- Credential validation in `handleSubmit()` (lines 165-166)

**UPDATE** `onStartAnalysis` prop signature — remove `login` and `password` parameters.

**KEEP** credential UI only for standalone mode (if `!isSupabaseConfigured()`).

---

### B5. Update `components/screens/ContextInputScreen.tsx`

**REPLACE** frontend analysis logs with Realtime progress display.

Currently shows `analysisLogs: string[]` from frontend. Change to read from `generationProgress`:

```typescript
// Instead of mapping analysisLogs strings:
if (generationProgress?.phase === 'serp') {
  show: `Analyzing keywords... (${generationProgress.completed_keywords}/${generationProgress.total_keywords})`
}
if (generationProgress?.phase === 'onpage') {
  show: `Scraping competitor pages... (${generationProgress.completed_urls}/${generationProgress.total_urls})`
  if (generationProgress.current_domain) {
    show: `Currently analyzing: ${generationProgress.current_domain}`
  }
}
```

The `generationProgress` comes from `useGenerationSubscription` hook already wired in App.tsx.

---

### B6. Clean up env vars

**Remove from `vite-env.d.ts`:**
```typescript
// DELETE these lines:
readonly VITE_DATAFORSEO_LOGIN?: string;
readonly VITE_DATAFORSEO_PASSWORD?: string;
```

**Remove from `.env` / `.env.example`** (if they exist):
```
VITE_DATAFORSEO_LOGIN=...
VITE_DATAFORSEO_PASSWORD=...
```

**Remove from CLAUDE.md** Environment Variables section — delete the DataForSEO env var lines.

**Remove from Vercel dashboard** — delete `VITE_DATAFORSEO_LOGIN` and `VITE_DATAFORSEO_PASSWORD`.

---

## Workstream C: Infrastructure & Documentation

### C1. Set Supabase Secrets (Manual)

```bash
supabase secrets set DATAFORSEO_LOGIN=<your-login>
supabase secrets set DATAFORSEO_PASSWORD=<your-password>
```

### C2. Deploy Edge Functions

Deploy both updated functions with ALL shared files (now **10 files** including new `dataforseo-client.ts`):

Shared files array for deployment:
```
supabase/functions/_shared/types.ts
supabase/functions/_shared/cors.ts
supabase/functions/_shared/gemini-client.ts
supabase/functions/_shared/brief-context.ts
supabase/functions/_shared/prompts.ts
supabase/functions/_shared/schemas.ts
supabase/functions/_shared/generation-config.ts
supabase/functions/_shared/step-executor.ts
supabase/functions/_shared/article-generator.ts
supabase/functions/_shared/dataforseo-client.ts    ← NEW
```

Deploy:
- `create-generation-job` → v4
- `process-generation-queue` → v7

### C3. Update Documentation

**CLAUDE.md updates:**
- Shared modules list: add `dataforseo-client.ts` description
- Shared modules count: 9 → 10
- Deployment gotcha: update file count to 10
- Environment Variables section: remove DataForSEO env vars, add note about Supabase secrets
- Mark competitors job type as implemented
- Add any new gotchas discovered during implementation

**MEMORY.md updates:**
- Update Phase 4 status to COMPLETE
- Add `dataforseo-client.ts` to shared modules list
- Document any new patterns or gotchas

**backend migration.md updates:**
- Mark Phase 4 as ✅ COMPLETE with bullet points of what was done
- Update "Progress" section and "Key wins" section

---

## Parallel Execution Strategy

Three independent workstreams can run in parallel:

```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│   WORKSTREAM A      │  │   WORKSTREAM B      │  │   WORKSTREAM C      │
│   Backend           │  │   Frontend          │  │   Docs + Infra      │
├─────────────────────┤  ├─────────────────────┤  ├─────────────────────┤
│ A1. dataforseo-     │  │ B1. types/database  │  │ C3. Update CLAUDE.md│
│     client.ts       │  │     .ts (progress)  │  │     MEMORY.md       │
│                     │  │                     │  │     migration.md    │
│ A2. process-gen-    │  │ B2. generationJob   │  │                     │
│     queue update    │  │     Service.ts      │  │                     │
│                     │  │                     │  │                     │
│ A3. create-gen-     │  │ B3. App.tsx         │  │                     │
│     job update      │  │                     │  │                     │
│                     │  │ B4. InitialInput    │  │                     │
│                     │  │     Screen.tsx      │  │                     │
│                     │  │                     │  │                     │
│                     │  │ B5. ContextInput    │  │                     │
│                     │  │     Screen.tsx      │  │                     │
│                     │  │                     │  │                     │
│                     │  │ B6. Env var cleanup │  │                     │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

**Dependencies:**
- B3 (App.tsx) depends on B1 + B2 being done
- A2 (process-queue) depends on A1 (dataforseo-client)
- C2 (deploy) depends on A1 + A2 + A3 all being done
- C3 (docs) can run anytime

**Agent assignment for parallel execution:**
- **Agent 1 (Backend):** A1 → A2 → A3 (sequential, each builds on previous)
- **Agent 2 (Frontend):** B1 + B2 (parallel) → B3 → B4 + B5 + B6 (parallel)
- **Agent 3 (Docs):** C3 (runs independently, updates after code changes)

---

## What Stays Unchanged

- `services/dataforseoService.ts` — Keep for standalone mode (Phase 6 removes if desired)
- `services/competitorService.ts` — Still used for loading competitors from DB + star toggle
- `CompetitionVizScreen` — Pure display, reads from `competitorData` state
- `Stage3CompetitorAnalysis` — Pure display component
- All brief generation / article generation code — untouched
- `useAutoSave` — unchanged
- Database schema — no new tables needed (`brief_competitors` already exists)

---

## Verification Checklist

After implementation, verify:

- [ ] `npm run build` passes
- [ ] `npm run test:run` — all 39 tests pass
- [ ] Backend: Create a competitors job via Edge Function → verify it processes and saves to DB
- [ ] Frontend (Supabase mode): Click "Analyze" → job created → progress shown → competitors loaded
- [ ] Frontend (Standalone mode): Click "Analyze" → still works with browser-side DataForSEO (if kept)
- [ ] No `VITE_DATAFORSEO_*` references remain in frontend code
- [ ] Credentials only exist as Supabase secrets
- [ ] Full pipeline test: competitors → full_brief → article — all server-side
- [ ] Realtime progress updates work in ContextInputScreen
- [ ] CompetitionVizScreen shows results correctly after backend analysis
- [ ] Star toggle still works on CompetitionVizScreen
- [ ] CLAUDE.md, MEMORY.md, backend migration.md all updated
