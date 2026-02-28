 ---                                                                                                                                                                                                                                           Backend Generation Migration Plan — Full Synthesis
    Executive Summary
    Move all AI generation (brief steps 1-7, article generation, competitor analysis) from browser-side React state to server-side Supabase infrastructure. Users will be able to trigger generation, close their browser, and find results when   they return. Bulk generation of 10-50 briefs simultaneously will be supported.                                                                                                                                                                                                                                                                                                                                                                                                             ---                                                                                                                                                                                                                                           Recommended Architecture: Supabase Queues + Edge Functions + Cron

  Why: Zero new vendors, zero additional monthly cost (all included in existing Supabase Pro), natural fit with existing stack, per-step execution avoids timeout limits.

  ┌─────────────┐     INSERT job      ┌──────────────────┐
  │   Browser    │ ──────────────────► │  generation_jobs  │ (Supabase table/queue)
  │  (React UI)  │                     │    (pgmq queue)   │
  │             │ ◄─────────────────── └────────┬─────────┘
  │  Realtime   │   Supabase Realtime           │
  │  subscription│   (briefs table changes)      │ pg_cron (every 10-30s)
  └─────────────┘                               ▼
                                      ┌──────────────────┐
                                      │  process-jobs     │ (Edge Function)
                                      │  Edge Function    │
                                      │                  │
                                      │  1. Read pending  │
                                      │  2. Call Gemini   │
                                      │  3. Save to DB    │
                                      │  4. Queue next    │
                                      │  5. Update status │
                                      └──────┬───────────┘
                                             │
                                ┌────────────┼────────────┐
                                ▼            ▼            ▼
                           gemini-proxy  briefs table  generation_jobs
                          (existing EF)  (brief_data)  (next step)

  Fallback Path

  If Edge Function limits become problematic (article generation > 400s, memory issues), migrate the processing layer only to Trigger.dev ($10-50/mo). The queue and DB stay in Supabase — only the worker changes.

---

  Current State (What Exists Today)

  Frontend (runs in browser — ALL of this moves to backend)
  ┌───────────────────────────────┬──────────────────────────────────────────────────────────────────────┬───────────────┐
  │           Component           │                             What It Does                             │ Lines of Code │
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────┼───────────────┤
  │ App.tsx generation handlers   │ Orchestrates 7-step brief pipeline, article generation, regeneration │ ~600 lines    │
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────┼───────────────┤
  │ AppWrapper.tsx background gen │ Hidden `<App>` instances for parallel brief generation                 │ ~150 lines    │
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────┼───────────────┤
  │ geminiService.ts              │ All Gemini API calls (brief steps, article sections, validation)     │ ~900 lines    │
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────┼───────────────┤
  │ dataforseoService.ts          │ SERP analysis + on-page scraping (runs from browser!)                │ ~200 lines    │
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────┼───────────────┤
  │ constants.ts                  │ System prompts, JSON schemas, thinking budgets                       │ ~800 lines    │
  ├───────────────────────────────┼──────────────────────────────────────────────────────────────────────┼───────────────┤
  │ useAutoSave.ts                │ Debounced save with retry + beacon fallback                          │ ~200 lines    │
  └───────────────────────────────┴──────────────────────────────────────────────────────────────────────┴───────────────┘
  Backend (what exists on Supabase today)

- 9 database tables with RLS (all USING(true) — wide open)
- 1 Edge Function: gemini-proxy (simple Gemini API proxy)
- Supabase Storage: 2 buckets for context files
- No job queue, no background processing, no server-side generation

---

  Database Schema Changes

  New Table: generation_jobs

  CREATE TABLE generation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brief_id UUID NOT NULL REFERENCES briefs(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id),
    created_by UUID NOT NULL REFERENCES access_codes(id),

    -- Job type
    job_type TEXT NOT NULL CHECK (job_type IN (
      'competitors',    -- SERP analysis + scraping
      'brief_step',     -- Single step (1-7)
      'full_brief',     -- All 7 steps sequentially
      'article',        -- Full article generation
      'regenerate'      -- Regenerate specific step + cascade
    )),

    -- Configuration (frozen at job creation time)
    step_number INTEGER,                -- Current/target step (1-7)
    config JSONB NOT NULL DEFAULT '{}', -- All generation params snapshot

    -- Status & Progress
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
      'pending', 'running', 'completed', 'failed', 'cancelled'
    )),
    progress JSONB DEFAULT '{}',
    -- Brief: { current_step: 3, total_steps: 7, step_name: "Competitor Analysis" }
    -- Article: { current_section: "H2: ...", current_index: 5, total: 12 }
    -- Competitors: { analyzed: 4, total: 10 }

    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,

    -- Batch support
    batch_id UUID,  -- Groups related jobs (bulk generation)

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
  );

  CREATE INDEX idx_gen_jobs_status ON generation_jobs(status)
    WHERE status IN ('pending', 'running');
  CREATE INDEX idx_gen_jobs_brief ON generation_jobs(brief_id);
  CREATE INDEX idx_gen_jobs_batch ON generation_jobs(batch_id)
    WHERE batch_id IS NOT NULL;

  New Table: generation_batches (for bulk operations)

  CREATE TABLE generation_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id),
    created_by UUID NOT NULL REFERENCES access_codes(id),
    name TEXT,                          -- "Bulk: 10 WD briefs"
    total_jobs INTEGER NOT NULL,
    completed_jobs INTEGER DEFAULT 0,
    failed_jobs INTEGER DEFAULT 0,
    status TEXT DEFAULT 'running' CHECK (status IN (
      'running', 'completed', 'partially_failed', 'cancelled'
    )),
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
  );

  Modify briefs table

  ALTER TABLE briefs ADD COLUMN active_job_id UUID REFERENCES generation_jobs(id);

---

  New Edge Functions Needed

1. create-generation-job — Job Dispatcher

  Triggered by: Frontend POST request
  Does:

- Validates input (brief exists, user has access)
- Snapshots all generation config into config JSONB
- Inserts row into generation_jobs
- For full_brief: creates single job starting at step 1
- For competitors: creates competitor analysis job
- For article: creates article generation job
- Returns job ID immediately (user can close browser)

2. process-generation-queue — The Worker

  Triggered by: pg_cron every 10-30 seconds
  Does:

- Reads N pending jobs (oldest first, with concurrency limit)
- For each job:
  - Sets status to running
  - Based on job_type:
    - competitors: Call DataForSEO SERP + on-page APIs, save to brief_competitors
    - brief_step: Call Gemini via existing gemini-proxy, save result to briefs.brief_data
    - full_brief: Process current step, queue next step (self-chaining)
    - article: Generate section by section, save to brief_articles
    - regenerate: Regenerate step, compute stale dependents, optionally cascade
  - Updates progress JSONB on the job row (triggers Realtime)
  - Updates briefs table with results (triggers Realtime)
  - On success: mark completed, queue next step if applicable
  - On failure: increment retry_count, re-queue or mark failed

3. cancel-generation-job — Cancellation

  Triggered by: Frontend request
  Does: Sets job status to cancelled, any in-flight step completes but no next step is queued

Key Logic That Moves from Frontend to Edge Functions
  ┌────────────────────────────────────────────────────┬───────────────────────────────────────────────────────────┐
  │                Currently in App.tsx                │                  Moves to Edge Function                   │
  ├────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
  │ handleStartAnalysis() — competitor fetching loop   │ process-generation-queue (competitors job type)           │
  ├────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
  │ handleProceedToBriefing() — step 1 generation      │ process-generation-queue (brief_step/full_brief)          │
  ├────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
  │ handleNextStep() — step N+1 generation             │ Self-chaining: job for step N completes → queues step N+1 │
  ├────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
  │ handleRegenerateStep() — regeneration + stale deps │ process-generation-queue (regenerate job type)            │
  ├────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
  │ handleStartContentGeneration() — article loop      │ process-generation-queue (article job type)               │
  ├────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
  │ isFeelingLuckyFlow useEffect auto-advance          │ full_brief job type handles sequential steps              │
  ├────────────────────────────────────────────────────┼───────────────────────────────────────────────────────────┤
  │ Word count enforcement (expand/trim)               │ Inside article processing in Edge Function                │
  └────────────────────────────────────────────────────┴───────────────────────────────────────────────────────────┘
--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  Frontend Changes

  What Gets Removed (~40% of App.tsx)

- handleStartAnalysis() internals → replaced by job creation call
- handleProceedToBriefing() generation logic → replaced by job creation
- handleNextStep() Gemini calls → replaced by job creation
- handleStartContentGeneration() article loop → replaced by job creation
- isFeelingLuckyFlow useEffect → no longer needed (backend handles sequencing)
- AppWrapper.tsx hidden `<App>` instances → no longer needed

  What Gets Added

1. services/generationJobService.ts — CRUD for generation_jobs
   - createBriefGenerationJob(briefId, type, config)
   - createArticleGenerationJob(briefId, config)
   - createBulkGenerationBatch(clientId, briefConfigs[])
   - cancelJob(jobId)
   - getActiveJobsForBrief(briefId)
   - getBatchProgress(batchId)
2. hooks/useGenerationSubscription.ts — Supabase Realtime hook
   // Subscribes to generation_jobs changes for a brief
   // Returns: { activeJob, progress, status, error }
   const { activeJob, progress } = useGenerationSubscription(briefId);
3. hooks/useBriefRealtimeSync.ts — Watches briefs table for step completions
   // When backend saves step N result to brief_data, client sees it immediately
   const { briefData, staleSteps } = useBriefRealtimeSync(briefId);
4. Updated progress panel in AppWrapper.tsx — reads from generation_jobs table instead of in-memory state. No hidden App instances needed.

  What Stays the Same

- All Stage components (Stage1-7) — they display data, don't generate it
- DashboardScreen — display only, regeneration becomes "create job"
- ArticleScreen — display only
- useAutoSave — still saves user edits (text changes, feedback)
- useBriefLoader — still loads brief from DB
- All UI components, Sidebar, navigation

---

  DataForSEO Migration

  Currently calls api.dataforseo.com directly from browser with credentials exposed. Must move to backend:

- New Edge Function: analyze-competitors (or part of process-generation-queue)
- DataForSEO credentials stored as Supabase Edge Function secrets (like GEMINI_API_KEY)
- Frontend no longer needs DataForSEO credentials at all
- Remove VITE_DATAFORSEO_LOGIN / VITE_DATAFORSEO_PASSWORD env vars

---

  Bulk Generation Design

  User Flow

1. User provides list of keywords/topics (e.g., 10 keywords)
2. Frontend calls createBulkGenerationBatch(clientId, configs[])
3. Backend creates:
   - 1 generation_batches row
   - 10 briefs rows (draft status)
   - 10 generation_jobs rows (type: full_brief, linked to batch)
4. Queue processes them with concurrency limit (max 5-10 simultaneous to respect Gemini rate limits)
5. User sees batch progress panel: "5/10 complete, 2 running, 3 pending"

  Concurrency Control

- Gemini rate limiter: Max 10 concurrent Gemini calls across all jobs
- Job concurrency: pg_cron processes N jobs per tick, controlled by SELECT ... LIMIT N
- Per-batch fairness: Round-robin across batches so one bulk job doesn't starve others

---

  Implementation Phases

  Phase 1: Foundation ✅ COMPLETE

- ✅ Create generation_jobs table + migration
- ✅ Create create-generation-job Edge Function (deployed v3, verify_jwt: true)
- ✅ Create process-generation-queue Edge Function (deployed v6, verify_jwt: false)
- ✅ Set up pg_cron trigger
- ✅ Move geminiService.generateBriefStep() logic to Edge Function (_shared/step-executor.ts)
- ✅ Frontend: add generationJobService.ts + useGenerationSubscription + useBriefRealtimeSync
- ✅ Port all shared modules: types, prompts, schemas, gemini-client, brief-context, generation-config
- Milestone achieved: User can generate a single brief step from the backend

  Phase 2: Full Brief Pipeline ✅ COMPLETE

- ✅ Implement full_brief job type with step chaining (EXECUTION_ORDER: [1,3,2,4,5,6,7])
- ✅ Implement step dependency/stale logic server-side (STEP_DEPENDENCIES map)
- ✅ Implement regenerate job type with user feedback
- ✅ Frontend wired: "Generate Full Brief" delegates to backend in Supabase mode
- ✅ 3-phase Step 5 generation (skeleton → enrichment → resource analysis)
- ✅ Workflow status guards (isWorkflowStatus checks in all status write paths)
- Milestone achieved: User can generate full 7-step brief, close browser, come back to results

  Phase 3: Article Generation ✅ COMPLETE

- ✅ Implement article job type with section-by-section processing (_shared/article-generator.ts)
- ✅ Port word count enforcement (expand at <70% target, trim at >120%/150% target)
- ✅ Port FAQ generation with per-FAQ word budgeting
- ✅ Final global trim pass (worst 3 offenders)
- ✅ Progress via Realtime (section name, index, total, percentage, word count)
- ✅ Frontend wiring: handleBackendArticleGeneration in App.tsx
- ✅ Article saved to brief_articles table with version management
- ✅ Edge Functions deployed (process-generation-queue v6 with all 10 shared files)
- Milestone achieved: User can generate articles from backend

  QA Audit (Phases 1-3) — PASSED

  Two rounds of QA validation were performed. Issues found and resolved:

  Phase 1 fixes:
  - FIXED: generation_jobs DDL added to version control (supabase/migrations/003_add_generation_jobs.sql)
  - FIXED: retryOperation() now uses actual exponential backoff (delay × 2^attempt + jitter 0-500ms)
  - FIXED: cancelGenerationJob() now clears briefs.active_job_id to prevent stale pointers
  - FIXED: pg_cron schedule documented in migration file (as comments, requires manual enable)
  - FIXED: GenerationJobProgress TypeScript interface synced with backend JSONB shape (added total_sections, percentage, word_count)
  - DEFERRED (Phase 6): App-level auth checks in create-generation-job
  - DEFERRED (Phase 6): Job row cleanup for completed jobs

  Phase 2 fixes:
  - FIXED: Regenerate completion Realtime race — App.tsx now does a one-time getBrief() fetch when regenerate jobs complete, catching brief data events dropped due to ordering

  Phase 3 fixes:
  - FIXED: Documented that thinkingLevel is intentionally ignored for article generation (JSDoc on buildArticleGenerationConfig and ArticleSectionParams.thinkingLevel)

  Status update (February 27, 2026): Build succeeds. Unit tests are now split from Playwright E2E and `npm run test:run` is green at 45/45 passing tests.

---

  Phase 4: Competitor Analysis ✅ COMPLETE

- ✅ Move DataForSEO calls to Edge Function (`_shared/dataforseo-client.ts` — getSerpUrls, getOnPageElements)
- ✅ Store credentials as Edge Function secrets (DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD)
- ⚠️ DataForSEO frontend credential removal is only partial in current codebase.
  - Supabase mode uses Edge Function secrets (`DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`)
  - Standalone mode still reads `VITE_DATAFORSEO_LOGIN` / `VITE_DATAFORSEO_PASSWORD`
- ✅ Implement competitors job type in process-generation-queue
- ✅ Frontend delegates in Supabase mode, standalone mode preserved (`services/dataforseoService.ts`)
- Milestone achieved: Full generation pipeline runs server-side, no browser dependency

  Phase 5: Bulk Generation + Polish ✅ COMPLETE

- ✅ Database migration 004: Realtime enabled for generation_batches, `increment_batch_counter()` RPC for atomic counter updates, composite indexes for batch queries
- ✅ New Edge Function: `create-generation-batch` (verify_jwt: true) — creates batch row + N brief rows + N chained jobs (competitors → full_brief for full_pipeline, or direct full_brief/article for existing briefs)
- ✅ Updated `process-generation-queue` with batch counter updates after job completion/failure, automatic full_brief chaining after competitors jobs, and batch status resolution (completed/partially_failed/cancelled)
- ✅ Frontend service: `services/batchService.ts` — createGenerationBatch, cancelBatch, getBatchesForClient, getJobsForBatch
- ✅ Frontend hook: `hooks/useBatchSubscription.ts` — Realtime subscription to generation_batches for live batch progress
- ✅ New component: `components/briefs/BulkGenerationModal.tsx` — Modal with two tabs: "From Keywords" (keyword groups → new briefs) and "Existing Briefs" (bulk full_brief or article generation)
- ✅ New component: `components/briefs/BatchProgressPanel.tsx` — Floating panel showing active batch progress with per-batch counters, progress bars, and cancel buttons
- ✅ Updated BriefListScreen with "Bulk Generate" button, bulk action "Generate" button for selected briefs, and BatchProgressPanel integration
- Milestone achieved: Bulk generation of 10-50 briefs simultaneously with live progress tracking

  Phase 6: Cleanup + Security (NOT STARTED)

- Remove dead frontend generation code (~600 lines from App.tsx)
- Remove hidden `<App>` instances from AppWrapper.tsx
- Tighten RLS policies (currently all USING(true))
- Add proper auth checks in Edge Functions
- Add job cleanup (auto-delete completed jobs after 30 days)
- Milestone: Clean, secure, production-ready

---

Risk Assessment
  ┌───────────────────────────────────────────────┬──────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │                     Risk                      │ Severity │                                                                    Mitigation                                                                     │
  ├───────────────────────────────────────────────┼──────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Edge Function 400s timeout exceeded           │ Medium   │ Each step is a separate invocation (~30s). Only article sections could be long. Fallback: Trigger.dev                                             │
  ├───────────────────────────────────────────────┼──────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Edge Function 256MB memory                    │ Low      │ Generation is I/O-bound (API calls), not memory-bound. Competitor full_text could be large — truncate                                             │
  ├───────────────────────────────────────────────┼──────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Gemini rate limits hit during bulk            │ High     │ Concurrency limiter (max 10 parallel calls). Exponential backoff on 429s. Queue naturally throttles                                               │
  ├───────────────────────────────────────────────┼──────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ pg_cron polling latency (10-30s)              │ Low      │ Acceptable for background jobs. User sees "pending" → "running" with slight delay. For interactive single-step, could call Edge Function directly │
  ├───────────────────────────────────────────────┼──────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Partial failure mid-pipeline                  │ Medium   │ Each step saved independently. Job tracks step_number. Resume from last completed step                                                            │
  ├───────────────────────────────────────────────┼──────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Supabase Realtime connection drops            │ Low      │ Client reconnects automatically. On reconnect, fetch current state from DB                                                                        │
  ├───────────────────────────────────────────────┼──────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ RLS wide open during transition               │ High     │ Phase 6 addresses this. Until then, same security as today (anon key)                                                                             │
  ├───────────────────────────────────────────────┼──────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Data race: user edits while backend generates │ Medium   │ active_job_id on brief indicates generation in progress. UI shows lock/warning. Auto-save pauses during active generation                         │
  └───────────────────────────────────────────────┴──────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

Cost Analysis
  ┌───────────────────────────┬──────────────┬────────────────────────────────────┐
  │         Component         │ Current Cost │          After Migration           │
  ├───────────────────────────┼──────────────┼────────────────────────────────────┤
  │ Supabase Pro              │ $25/mo       │ $25/mo (same)                      │
  ├───────────────────────────┼──────────────┼────────────────────────────────────┤
  │ Edge Function invocations │ ~10K/mo      │ ~50K/mo (still within 2M included) │
  ├───────────────────────────┼──────────────┼────────────────────────────────────┤
  │ Supabase Realtime         │ Included     │ Included (more connections)        │
  ├───────────────────────────┼──────────────┼────────────────────────────────────┤
  │ Gemini API                │ Usage-based  │ Same (just called from server now) │
  ├───────────────────────────┼──────────────┼────────────────────────────────────┤
  │ DataForSEO API            │ Usage-based  │ Same                               │
  ├───────────────────────────┼──────────────┼────────────────────────────────────┤
  │ New infrastructure        │ —            │ $0                                 │
  ├───────────────────────────┼──────────────┼────────────────────────────────────┤
  │ Total additional cost     │ —            │ $0/mo                              │
  └───────────────────────────┴──────────────┴────────────────────────────────────┘
--------------------------------------------------------------------------------------------------------------------------------------------------------------------

  Summary

  Architecture: Supabase Queues + Edge Functions + pg_cron — zero new vendors, zero extra cost.
  How it works: User clicks "Generate" → job row inserted → pg_cron triggers Edge Function every 10-30s → Edge Function processes one step at a time → saves results to DB → Supabase Realtime pushes updates to browser (if open).

  Progress (as of Feb 26, 2026):
  ✅ Phase 1: Foundation — COMPLETE
  ✅ Phase 2: Full Brief Pipeline — COMPLETE
  ✅ Phase 3: Article Generation — COMPLETE
  ✅ Phase 4: Competitor Analysis — COMPLETE
  ✅ Phase 5: Bulk Generation — COMPLETE
  ⬜ Phase 6: Cleanup + Security — NOT STARTED

  Key wins achieved so far:
  - Users can close browser mid-generation (briefs + articles + competitor analysis)
  - All Gemini calls route server-side (no client-side API key exposure)
  - All DataForSEO calls route server-side (no client-side credential exposure)
  - Realtime progress updates via Supabase subscriptions
  - Full generation pipeline runs server-side — no browser dependency
  - Bulk generation of 10-50 briefs simultaneously with live progress tracking
  - Batch progress panel with per-batch counters and cancel support
  - $0 additional monthly cost

  Remaining:
  - Dead frontend generation code not yet removed (Phase 6)
  - RLS policies still wide open (Phase 6)
