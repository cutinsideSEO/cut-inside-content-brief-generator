# Brief List Declutter + Sidebar-First UX Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduce cognitive load in the client brief/article list view by moving filtering/navigation responsibility into the sidebar and collapsing duplicate top controls.

**Architecture:** Keep the existing `BriefListScreen` data loading/realtime behavior, but introduce a shared list-UI state contract (`BriefListUiState`) owned by `AppWrapper` and consumed by both `Sidebar` and `BriefListScreen`. Refactor top controls into one compact toolbar and make `GenerationActivityPanel` default to condensed mode. Use pure utility modules for control-model derivation so behavior can be unit-tested without DOM.

**Tech Stack:** React 19 + TypeScript + existing shadcn/ui wrappers (`Card`, `Tabs`, `Select`, `Input`, `Badge`, `Collapsible`, `Modal`) + Vitest + Playwright.

---

## Non-Negotiable Constraints

- Use `shadcn/ui` components and existing project UI primitives only.
- Do not introduce any parallel component system or raw ad-hoc primitive set.
- Preserve existing generation/subscription logic and Supabase service boundaries.
- Keep Smart Queue as default brief mode; Grouped by Status remains optional.

## UX Outcome Targets

- One control row above content (not three stacked rows).
- Sidebar becomes actionable (not passive metrics only).
- No duplicated controls between sidebar and main panel.
- Brief cards become visible with less vertical scrolling on 1366x768 and above.
- Mobile/tablet keeps full functionality with collapsible sidebar controls.

## Execution Order (for sub-agent swarming)

1. Task 1, 2, 3 must run sequentially (state contract + plumbing).
2. Task 4 and 5 can run in parallel after Task 3 lands.
3. Task 6 depends on 4 and 5.
4. Task 7 and 8 are verification/QA gates before merge.

---

### Task 1: Define Shared Brief List UI State Contract

**Files:**
- Create: `types/briefListUi.ts`
- Create: `utils/briefListUiState.ts`
- Test: `tests/services/briefListUiState.test.ts`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { createDefaultBriefListUiState, normalizeBriefListUiState } from '../../utils/briefListUiState';

describe('briefListUiState', () => {
  it('defaults to briefs tab, smart queue, all statuses, all projects', () => {
    const state = createDefaultBriefListUiState();
    expect(state.activeTab).toBe('briefs');
    expect(state.filterStatus).toBe('all');
    expect(state.sortBy).toBe('smart');
    expect(state.briefViewMode).toBe('smart');
    expect(state.projectFilter).toBe('all');
  });

  it('normalizes invalid values back to safe defaults', () => {
    const normalized = normalizeBriefListUiState({
      activeTab: 'bad',
      filterStatus: 'bad',
      sortBy: 'bad',
      briefViewMode: 'bad',
      projectFilter: '',
    } as never);

    expect(normalized.activeTab).toBe('briefs');
    expect(normalized.filterStatus).toBe('all');
    expect(normalized.sortBy).toBe('smart');
    expect(normalized.briefViewMode).toBe('smart');
    expect(normalized.projectFilter).toBe('all');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/services/briefListUiState.test.ts`
Expected: FAIL (`Cannot find module '../../utils/briefListUiState'`).

**Step 3: Write minimal implementation**

- Add `BriefListUiState` and union types in `types/briefListUi.ts`.
- Implement `createDefaultBriefListUiState` + `normalizeBriefListUiState` in `utils/briefListUiState.ts`.

**Step 4: Run test to verify it passes**

Run: `npm run test:unit -- tests/services/briefListUiState.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add types/briefListUi.ts utils/briefListUiState.ts tests/services/briefListUiState.test.ts
git commit -m "feat: add shared brief list ui state contract"
```

---

### Task 2: Lift UI State to App Wrapper and Pass to Screen + Sidebar

**Files:**
- Modify: `AppWrapper.tsx`
- Modify: `components/screens/BriefListScreen.tsx`
- Modify: `components/Sidebar.tsx`
- Test: `tests/services/briefListUiState.test.ts`

**Step 1: Write the failing test**

Add assertion to `briefListUiState.test.ts` for tab switch reset policy helper (e.g. switching clients resets `projectFilter` to `all`).

```ts
it('resets project filter when client changes', () => {
  const next = normalizeBriefListUiState({
    activeTab: 'articles',
    filterStatus: 'complete',
    sortBy: 'name',
    briefViewMode: 'grouped',
    projectFilter: 'some-project-id',
  }, { resetProjectFilter: true });

  expect(next.projectFilter).toBe('all');
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/services/briefListUiState.test.ts`
Expected: FAIL (second arg/helper not implemented).

**Step 3: Write minimal implementation**

- Add `briefListUiState` state in `AppWrapper` for `brief_list` mode.
- Pass state + callbacks to `BriefListScreen` and `Sidebar`.
- Remove local ownership of duplicated state in `BriefListScreen` where now controlled by props (`activeTab`, `filterStatus`, `projectFilter`, `sortBy`, `briefViewMode`).
- Keep `searchQuery` local to `BriefListScreen`.

**Step 4: Run focused tests**

Run: `npm run test:unit -- tests/services/briefListUiState.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add AppWrapper.tsx components/screens/BriefListScreen.tsx components/Sidebar.tsx tests/services/briefListUiState.test.ts
git commit -m "refactor: lift brief list ui state to wrapper"
```

---

### Task 3: Sidebar-First Controls (Status + Project + View Mode)

**Files:**
- Create: `utils/sidebarBriefListModel.ts`
- Create: `tests/services/sidebarBriefListModel.test.ts`
- Modify: `components/Sidebar.tsx`
- Modify: `components/screens/BriefListScreen.tsx`

**Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import { buildSidebarBriefListModel } from '../../utils/sidebarBriefListModel';

describe('sidebarBriefListModel', () => {
  it('marks active status row and keeps zero-count workflow hidden', () => {
    const model = buildSidebarBriefListModel({
      counts: { draft: 2, in_progress: 1, complete: 4, workflow: 0, published: 0, all: 7 },
      activeFilter: 'in_progress',
    });

    expect(model.statusRows.find((r) => r.id === 'in_progress')?.isActive).toBe(true);
    expect(model.statusRows.some((r) => r.id === 'workflow')).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:unit -- tests/services/sidebarBriefListModel.test.ts`
Expected: FAIL (module missing).

**Step 3: Write minimal implementation**

- Implement `buildSidebarBriefListModel` utility.
- Update sidebar brief-list section to:
  - Render clickable status rows (active style + count).
  - Render project select under Overview.
  - Render Smart/Grouped segmented control in sidebar.
- Remove duplicated status tabs and project select from top bar in `BriefListScreen`.

**Step 4: Run tests**

Run: `npm run test:unit -- tests/services/sidebarBriefListModel.test.ts tests/services/briefListUiState.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add components/Sidebar.tsx components/screens/BriefListScreen.tsx utils/sidebarBriefListModel.ts tests/services/sidebarBriefListModel.test.ts
git commit -m "feat: move brief list filters and view controls into sidebar"
```

---

### Task 4: Condense Main Header into Single Toolbar (Search + Primary CTA)

**Files:**
- Create: `components/briefs/BriefListToolbar.tsx`
- Modify: `components/screens/BriefListScreen.tsx`
- Modify: `components/ui/index.ts` (only if new export required)
- Test: `e2e/single-brief.spec.ts`

**Step 1: Add failing E2E assertion (or TODO assertion placeholder first)**

In `e2e/single-brief.spec.ts`, add assertion that only one control toolbar container is visible before brief cards.

Pseudo-assertion:

```ts
await expect(page.getByTestId('brief-list-toolbar')).toBeVisible();
await expect(page.getByTestId('brief-list-legacy-controls')).toHaveCount(0);
```

**Step 2: Run targeted E2E to confirm fail**

Run: `npx playwright test e2e/single-brief.spec.ts --grep "brief list toolbar"`
Expected: FAIL (new test ids/behavior not present).

**Step 3: Implement minimal UI**

- Add `BriefListToolbar` with:
  - Search input.
  - `New Brief` button.
  - Secondary actions dropdown (`Bulk Generate`, `New Project`) using shadcn dropdown primitives.
- Replace old header + separate top panel controls in `BriefListScreen`.

**Step 4: Run targeted E2E again**

Run: `npx playwright test e2e/single-brief.spec.ts --grep "brief list toolbar"`
Expected: PASS.

**Step 5: Commit**

```bash
git add components/briefs/BriefListToolbar.tsx components/screens/BriefListScreen.tsx e2e/single-brief.spec.ts
git commit -m "feat: replace stacked brief list controls with compact toolbar"
```

---

### Task 5: Compact Generation Activity by Default

**Files:**
- Modify: `components/briefs/GenerationActivityPanel.tsx`
- Modify: `components/screens/BriefListScreen.tsx`
- Create: `tests/services/generationActivityPanelModel.test.ts`

**Step 1: Write failing unit test for compact-mode summary model**

```ts
import { describe, expect, it } from 'vitest';
import { buildGenerationActivitySummary } from '../../utils/generationActivitySummary';

describe('generation activity summary', () => {
  it('returns compact summary counts for active jobs and batches', () => {
    const summary = buildGenerationActivitySummary({ activeJobs: 3, activeBatches: 1, failedJobs: 0 });
    expect(summary.title).toContain('Generation Activity');
    expect(summary.badges).toEqual([
      { key: 'jobs', value: 3 },
      { key: 'batches', value: 1 },
    ]);
  });
});
```

**Step 2: Run failing test**

Run: `npm run test:unit -- tests/services/generationActivityPanelModel.test.ts`
Expected: FAIL until helper contract is implemented/exported.

**Step 3: Implement minimal behavior**

- Default panel collapsed when there are no active jobs.
- Auto-expand only when new active job appears.
- Keep recent activity section, but move to secondary content in expanded panel.

**Step 4: Run tests**

Run: `npm run test:unit -- tests/services/generationActivityPanelModel.test.ts tests/services/generationActivitySummary.test.ts tests/services/generationActivity.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add components/briefs/GenerationActivityPanel.tsx components/screens/BriefListScreen.tsx tests/services/generationActivityPanelModel.test.ts
git commit -m "feat: default generation activity panel to compact summary"
```

---

### Task 6: Mobile/Tablet Behavior for Sidebar Controls

**Files:**
- Modify: `components/Sidebar.tsx`
- Modify: `components/screens/BriefListScreen.tsx`
- Modify: `components/briefs/BriefListToolbar.tsx`
- Test: `e2e/brief-step.spec.ts` (or new spec if cleaner)

**Step 1: Add failing E2E assertion for responsive controls**

- At mobile viewport, verify sidebar controls are reachable via sheet/drawer trigger.

```ts
await page.setViewportSize({ width: 390, height: 844 });
await page.getByRole('button', { name: /filters/i }).click();
await expect(page.getByTestId('brief-list-sidebar-controls')).toBeVisible();
```

**Step 2: Run targeted E2E fail**

Run: `npx playwright test e2e/brief-step.spec.ts --grep "brief list mobile controls"`
Expected: FAIL before implementation.

**Step 3: Implement minimal responsive behavior**

- Keep desktop sidebar fixed.
- For mobile, render sidebar controls inside shadcn `Sheet` trigger from toolbar.
- Ensure all controls are the same shared components/state (no forked logic).

**Step 4: Re-run targeted E2E**

Run: `npx playwright test e2e/brief-step.spec.ts --grep "brief list mobile controls"`
Expected: PASS.

**Step 5: Commit**

```bash
git add components/Sidebar.tsx components/screens/BriefListScreen.tsx components/briefs/BriefListToolbar.tsx e2e/brief-step.spec.ts
git commit -m "feat: add responsive sidebar control access for brief list"
```

---

### Task 7: Regression Tests for Filtering + Smart Queue Defaults

**Files:**
- Modify: `tests/services/generationStatus.test.ts`
- Modify: `tests/services/batchVisibility.test.ts`
- Create: `tests/services/briefListFilteringModel.test.ts`
- Optional Create: `utils/briefListFilteringModel.ts` (if extraction needed)

**Step 1: Write failing tests for list behavior invariants**

- Smart Queue remains default after entering client list.
- Status filter from sidebar updates visible brief subset.
- Project filter + status filter compose correctly.

**Step 2: Run tests to confirm failure**

Run: `npm run test:unit -- tests/services/briefListFilteringModel.test.ts`
Expected: FAIL before helper extraction/plumbing.

**Step 3: Implement minimal helper/wiring**

- Extract deterministic filter/sort resolver if needed.
- Keep existing priority ordering for Smart Queue.

**Step 4: Run focused unit suite**

Run: `npm run test:unit -- tests/services/briefListFilteringModel.test.ts tests/services/generationStatus.test.ts tests/services/batchVisibility.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add tests/services/briefListFilteringModel.test.ts tests/services/generationStatus.test.ts tests/services/batchVisibility.test.ts utils/briefListFilteringModel.ts
 git commit -m "test: cover brief list sidebar filtering and smart queue defaults"
```

---

### Task 8: Full Verification + QA Gate

**Files:**
- Modify (if needed after failures): touched files from Tasks 1-7
- Docs update: `docs/plans/2026-03-03-brief-list-declutter-sidebar-ux-implementation-plan.md` (verification notes section)

**Step 1: Run required targeted unit tests**

Run:

```bash
npm run test:unit -- tests/services/generationActivity.test.ts tests/services/generationActivitySummary.test.ts tests/services/articleGenerationActivity.test.ts
npm run test:unit -- tests/services/batchProgressDetails.test.ts
npm run test:unit -- tests/services/generationJobTransitions.test.ts
```

Expected: PASS.

**Step 2: Run targeted E2E for impacted flows**

Run:

```bash
npx playwright test e2e/single-brief.spec.ts e2e/article-generation.spec.ts e2e/bulk-generation.spec.ts --grep "brief list|toolbar|filters|project"
```

Expected: PASS for new/updated assertions.

**Step 3: Run core release gate**

Run: `npm run qa:gate:core`
Expected: PASS (build + unit + checks).

**Step 4: Record verification evidence**

- Add a short verification section to this plan file with command + status + timestamp.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: verify brief list declutter and sidebar-first ux"
```

---

## Swarm Assignment Map (for next step)

- **Subagent A (State/Plumbing):** Tasks 1-2.
- **Subagent B (Sidebar UX):** Task 3.
- **Subagent C (Toolbar UX):** Task 4.
- **Subagent D (Activity Density):** Task 5.
- **Subagent E (Responsive Controls):** Task 6.
- **Subagent F (Regression Tests):** Task 7.
- **Controller + Awaiter:** Task 8 verification and conflict resolution.

## Review Gates Per Task

- Gate 1: Spec compliance (control placement, no duplicates, shadcn-only).
- Gate 2: Code quality (no dead state, no duplicated filter logic, clear typing).
- Gate 3: Test evidence attached before marking task complete.

## Definition of Done

- Sidebar is actionable and owns status/project/view controls.
- Main area has one compact toolbar.
- Generation activity starts condensed and expands intentionally.
- Smart Queue remains default behavior.
- Unit + targeted E2E + `qa:gate:core` pass.
- No non-shadcn component system introduced.
