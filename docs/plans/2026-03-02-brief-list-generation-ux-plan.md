# Brief/Article Generation UX Improvement Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Redesign the client brief/article list experience so active generation (single brief, single article, and batch runs) is always visible, accurate, and actionable.

**Architecture:** Keep existing Supabase realtime subscriptions, but add a normalized "generation activity" view-model that powers both card-level status and a unified page-level activity center. Replace synthetic progress with real `generation_jobs.progress` fields, and align brief/article/batch states under one UX pattern.

**Tech Stack:** React + TypeScript + existing shadcn/ui components + Supabase realtime hooks.

---

## Current UX Gaps (from code audit)

1. Card progress is mostly synthetic:
- `BriefListCard` hardcodes progress values (`15`, `20..80`, `85`) instead of using realtime percentage/phase data.

2. Realtime detail is dropped before render:
- `AppWrapper` tracks `jobProgress`, but `BriefListScreen`’s local `GeneratingBrief` type only keeps `status` + `step`, so richer context never reaches cards.

3. Batch visibility is disconnected and too transient:
- Batch state appears in a floating panel that auto-dismisses completed/cancelled batches after 5 seconds, making outcomes easy to miss.

4. UX copy is not aligned with backend queue behavior:
- "Keep this tab open" appears while jobs are server-side and continue without tab focus.

5. Active article generation is underrepresented on the list page:
- Article work is shown on brief cards only, while the Articles tab has no in-progress placeholders/state.

6. Test comments confirm fragility:
- E2E notes say progress cards may appear/disappear too quickly to reliably observe.

---

## UX Options

### Option A (Recommended): Unified Activity Center + Rich Cards
- Add an in-page "Generation Activity" panel at top of Briefs/Articles page (not floating by default).
- Keep per-brief card progress bars, but feed them with real job progress.
- Show batch rollups and per-job rows in the same panel.
- Keep a short "recently finished" section (60-120s) instead of instant dismissal.

**Why:** Highest clarity with moderate implementation risk. Preserves current layout while making generation state reliable.

### Option B: Full Kanban (Queued / Running / Done / Failed)
- Replace status-grouped brief cards with a generation-centric board.
- Strongest process visibility, but higher disruption to existing workflow filtering/search habits.

### Option C: Minimal Patch
- Keep current UI; only improve labels/progress math.
- Fastest but likely still feels fragmented, especially for batch and article runs.

---

## Recommended UX Design

### 1) Generation Activity Center (top of list page)
- Persistent section under page header with:
  - Total active jobs.
  - Active batches count.
  - Failed jobs badge.
  - Global "Collapse/Expand" control.
- Group by batch when `batch_id` exists.
- For each running item show:
  - Entity name (brief name).
  - Job type (`competitors`, `full_brief`, `article`, `regenerate`).
  - Real progress bar from `progress.percentage` when available.
  - Stage details:
    - Competitors: phase + keyword/url counters.
    - Brief: step label + `current_step/total_steps`.
    - Article: section name + `current_index/total_sections`.
  - Actions: View brief, Cancel job/batch.

### 2) Card-Level Progress (Brief cards)
- Keep status badge + inline progress, but derive from realtime `jobProgress`.
- Progress priority:
  1. `progress.percentage` if present.
  2. Step/section-derived fraction.
  3. Existing fallback synthetic estimate.
- Replace "Keep this tab open" with:
  - "Running in background. You can leave this page."
- Add small status subtitle:
  - "Updated Xs ago" (based on job row update time).

### 3) Batch UX
- Move `BatchProgressPanel` content into the new Activity Center.
- Keep floating panel only as optional compact mode on small screens.
- Do not auto-dismiss immediately:
  - Completed/cancelled/partially_failed remain in "Recent activity" for at least 60s.
- Add "View results" jump action after completion.

### 4) Articles Tab Representation
- Add an "In progress" strip at top of Articles tab:
  - Shows article jobs currently running/queued.
  - Each row links to originating brief.
- Completed article cards remain unchanged.

### 5) Failure and Recovery UX
- Explicit failed state with error snippet and action buttons:
  - Retry (if supported),
  - View brief,
  - Dismiss.
- Cancel action should confirm when job is >80% or has partial output.

### 6) Mobile Behavior
- Activity Center collapses into one summary row with badge counts.
- Expands into drawer-style list to avoid crowding cards.

---

## Implementation Plan (Phased)

### Phase 1: Data Plumbing (low risk, high impact)
**Files:**
- `AppWrapper.tsx`
- `components/screens/BriefListScreen.tsx`
- `components/briefs/BriefListCard.tsx`
- `types/database.ts` (if helper types are needed)

**Steps:**
1. Introduce shared `GeneratingBrief` type that includes `jobId`, `jobProgress`, and `updatedAt`.
2. Pass full generation payload from `AppWrapper` to `BriefListScreen` without narrowing.
3. Update `BriefListCard` props to receive richer progress metadata.
4. Add utility helpers to resolve display text and percentage from `GenerationJobProgress`.

**Success criteria:**
- Card progress reflects real backend progress fields when available.

### Phase 2: Activity Center UI
**Files:**
- `components/screens/BriefListScreen.tsx`
- `components/briefs/BatchProgressPanel.tsx` (refactor/reuse or replace)
- `components/ui/*` (small presentational additions if needed)

**Steps:**
1. Create `GenerationActivityPanel` component rendered above tabs/filters.
2. Merge single-job and batch info into one list model.
3. Add expandable groups, per-job actions, and recent-completed section.
4. Keep existing floating panel behind feature flag or remove after parity.

**Success criteria:**
- User can always see active work and recently finished outcomes in one place.

### Phase 3: Articles Tab In-Progress Strip
**Files:**
- `components/screens/BriefListScreen.tsx`
- `components/articles/ArticleListCard.tsx` (optional subcomponent reuse)

**Steps:**
1. Surface active article generation jobs above article cards.
2. Include source brief label + progress + "View brief" action.
3. Ensure strip is visible even before first article row is created.

**Success criteria:**
- Article generation is visible inside the Articles view, not only Briefs cards.

### Phase 4: Copy and Interaction Polish
**Files:**
- `components/briefs/BriefListCard.tsx`
- `components/screens/ClientSelectScreen.tsx` (optional consistency pass)

**Steps:**
1. Replace outdated copy ("Keep this tab open").
2. Harmonize status labels across card + activity center.
3. Improve empty/error states for no active jobs, failed jobs, and cancelled batches.

**Success criteria:**
- Messaging matches backend behavior and reduces confusion.

### Phase 5: Tests
**Files:**
- `tests/services/generationStatus.test.ts`
- `tests/services/batchVisibility.test.ts`
- `e2e/bulk-generation.spec.ts`
- `e2e/single-brief.spec.ts`

**Steps:**
1. Unit tests for progress percentage derivation/fallback logic.
2. Unit tests for recent-completed visibility window.
3. E2E assertions for persistent activity center visibility and per-job status text.

**Success criteria:**
- Tests no longer rely on "progress appears too quickly"; UI state is stable enough for deterministic checks.

---

## Rollout Strategy

1. Ship Phase 1 first behind no flag (safe, mostly data correctness).
2. Ship Activity Center behind a feature flag (`generationActivityV2`) for internal QA.
3. Validate with `npm run test:unit` and targeted Playwright (`bulk-generation`, `article-generation`).
4. Remove old floating-only behavior once telemetry/feedback confirms parity.

---

## My Recommendation

Implement Option A in two quick increments:
1. **Immediate fix (1-2 days):** pass real `jobProgress` through and improve card progress/copy.
2. **UX upgrade (2-4 days):** add the unified activity center and recent-completed behavior.

This gives fast visible improvement without reworking the entire list IA.
