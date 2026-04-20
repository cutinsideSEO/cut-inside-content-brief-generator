# Bulk Generation Terminal State Fix Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Ensure bulk-generated briefs finish in a stable terminal state (`status`, `current_view`, `current_step`, CTA behavior), prevent stale terminal briefs from being auto-saved back to `draft`, and repair already-corrupted live rows.

**Architecture:** Fix the source of truth first in the Supabase queue processor so terminal brief rows are written consistently at step 7. Add frontend load/autosave normalization so stale terminal rows cannot regress when opened. Back this with one data-repair path for existing production rows and regression tests that assert DB state plus UI behavior.

**Tech Stack:** Vite, React, TypeScript, Supabase Edge Functions, Supabase Realtime, Vitest, Playwright

---

### Task 1: Normalize Terminal Brief State in Backend

**Files:**
- Modify: `supabase/functions/process-generation-queue/index.ts`
- Modify: `supabase/functions/create-generation-batch/index.ts`
- Test: `e2e/bulk-generation.spec.ts`

**Step 1: Write the failing regression expectation**

Document and enforce this terminal contract for `full_pipeline` and `full_brief` completion:

```ts
{
  status: 'complete',
  current_step: 7,
  current_view: 'dashboard',
  active_job_id: null,
}
```

**Step 2: Update backend completion writes**

- Keep new bulk-created briefs initialized as draft input rows when created.
- In `process-generation-queue/index.ts`, when `processFullBrief()` finishes the last step, update:
  - `current_step: 7`
  - `current_view: 'dashboard'`
  - `status: 'complete'` when not in workflow status
  - `updated_at`
- Review intermediate `mergeAndSaveBriefData()` calls so they do not accidentally preserve stale terminal view forever.

**Step 3: Add a repair path for existing corrupted rows**

Implement one repair utility in the backend path most appropriate for this repo:

- Either a small migration/SQL repair script or a targeted normalization function used on load/open.
- Scope repair to rows that already have terminal brief data or `current_step = 7` but stale terminal metadata.

**Step 4: Verify**

Run:

```bash
npm run test:unit -- tests/services/generationStatus.test.ts
```

Expected:
- Existing generation-status behavior still passes.

**Step 5: Commit**

```bash
git add supabase/functions/process-generation-queue/index.ts supabase/functions/create-generation-batch/index.ts docs/plans/2026-03-11-bulk-generation-terminal-state-fix-plan.md
git commit -m "fix: normalize terminal state for bulk generated briefs"
```

### Task 2: Prevent Autosave Regression on Stale Terminal Briefs

**Files:**
- Modify: `App.tsx`
- Modify: `hooks/useBriefLoader.ts`
- Modify: `hooks/useBriefRealtimeSync.ts`
- Modify: `hooks/useAutoSave.ts`
- Modify: `services/briefService.ts`
- Test: `tests/services/briefService.statusPersistence.test.ts`

**Step 1: Write the failing unit test**

Add tests covering:

```ts
it('does not downgrade a terminal brief loaded with stale initial_input metadata', () => {
  // completed terminal brief data + stale current_view should remain terminal
});
```

Also cover:
- dashboard + full data computes `complete`
- workflow statuses remain preserved

**Step 2: Normalize stale terminal rows on load**

When a loaded brief has terminal brief data or `current_step >= 7`, normalize app state to terminal view instead of trusting stale `current_view = 'initial_input'`.

**Step 3: Harden save semantics**

- Ensure `saveBriefState()` cannot downgrade a terminal brief to `draft` purely because `current_view` is stale.
- Ensure autosave does not immediately persist the stale loaded view before normalization.
- If realtime updates can change terminal metadata, include `current_view` handling in `useBriefRealtimeSync.ts` or otherwise avoid stale local state.

**Step 4: Verify**

Run:

```bash
npm run test:unit -- tests/services/briefService.statusPersistence.test.ts
```

Expected:
- Terminal-state persistence regressions fail before the fix and pass after it.

**Step 5: Commit**

```bash
git add App.tsx hooks/useBriefLoader.ts hooks/useBriefRealtimeSync.ts hooks/useAutoSave.ts services/briefService.ts tests/services/briefService.statusPersistence.test.ts
git commit -m "fix: prevent stale terminal briefs from regressing on load"
```

### Task 3: Add End-to-End Regression Coverage

**Files:**
- Modify: `e2e/bulk-generation.spec.ts`
- Modify: `e2e/helpers.ts`

**Step 1: Strengthen the DB assertions**

Replace the loose “brief exists” check with row-level assertions for the exact created briefs:

```ts
expect(brief.status).toBe('complete');
expect(brief.current_view).toBe('dashboard');
expect(brief.current_step).toBe(7);
expect(brief.active_job_id).toBeNull();
```

Use unique keyword suffixes per test run so the test does not match old rows.

**Step 2: Strengthen the UI assertions**

After reload:
- assert the brief card renders `View / Edit`
- assert it does not render `Continue`
- open the brief
- assert dashboard content is visible
- assert initial-input content is not visible

**Step 3: Catch autosave regression**

After opening the completed brief, wait past autosave debounce, re-fetch the row, and assert terminal metadata is unchanged.

**Step 4: Verify**

Run:

```bash
npx playwright test e2e/bulk-generation.spec.ts --grep "bulk generate briefs from keywords"
```

Expected:
- The flow fails on stale terminal metadata before the fix and passes after it.

**Step 5: Commit**

```bash
git add e2e/bulk-generation.spec.ts e2e/helpers.ts
git commit -m "test: cover terminal bulk generation resume state"
```

### Task 4: Final Verification

**Files:**
- No code changes required

**Step 1: Run targeted verification**

```bash
npm run test:unit -- tests/services/briefService.statusPersistence.test.ts tests/services/generationStatus.test.ts
npx playwright test e2e/bulk-generation.spec.ts --grep "bulk generate briefs from keywords"
```

**Step 2: Capture production repair notes**

Record:
- which live rows were corrupted
- whether a repair script/migration was run
- whether existing `status='draft'` terminal rows were normalized

**Step 3: Final review**

Confirm:
- terminal brief rows always end in dashboard state
- card CTA and subtitle align with terminal DB state
- opening a repaired brief does not rewrite it back to draft
