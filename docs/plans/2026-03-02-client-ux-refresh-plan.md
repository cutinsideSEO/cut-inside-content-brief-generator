# Client UX Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve desktop usability in client-facing list screens by making actions always discoverable, reducing card noise, and aligning controls with shared UI components.

**Architecture:** Keep the current screen structure and data flows, but standardize interaction patterns around the existing Generation Activity model. Apply low-risk Phase 1 updates first, then refactor cards and list orchestration in incremental phases.

**Tech Stack:** React, TypeScript, Vite, Tailwind classes, existing `components/ui` primitives.

---

### Phase 1: Quick Wins (Now)

**Files:**
- Modify: `components/screens/ClientSelectScreen.tsx`
- Modify: `components/screens/BriefListScreen.tsx`
- Modify: `components/briefs/BriefListCard.tsx`
- Modify: `components/articles/ArticleListCard.tsx`
- Modify: `components/clients/ClientCard.tsx`

**Checklist:**
1. Replace native `<select>` controls with shared `Select` component in client and brief list screens.
2. Remove hover-only discoverability for key card actions (menu/settings/delete controls remain visible).
3. Update client card metadata from static "Created" emphasis to "Updated" emphasis.
4. Keep visual hierarchy unchanged to avoid workflow disruption.
5. Run `npm run build` and fix any type/style regressions.

### Phase 2: Shared Card Anatomy

**Files:**
- Modify: `components/briefs/BriefListCard.tsx`
- Modify: `components/articles/ArticleListCard.tsx`
- Modify: `components/clients/ClientCard.tsx`
- Modify: `components/ui/Card.tsx`
- Create: `components/ui/WorkItemCard.tsx` (optional if extraction is clean)

**Checklist:**
1. Define one shared structure: `header` (title/status/actions), `body` (high-signal metadata), `footer` (single primary CTA).
2. Normalize spacing, border emphasis, and CTA placement across client/brief/article cards.
3. Reduce low-value metadata and preserve only actionable context.
4. Keep status language aligned with Generation Activity badges/progress terms.
5. Add/adjust unit snapshots or component tests if present.

### Phase 3: Brief List Flow Simplification

**Files:**
- Modify: `components/screens/BriefListScreen.tsx`
- Modify: `components/briefs/GenerationActivityPanel.tsx`
- Modify: `utils/generationActivitySummary.ts` (if additional summary fields are needed)

**Checklist:**
1. Keep `GenerationActivityPanel` as the fixed decision anchor at top.
2. Add a default "Smart List" sorting mode (urgent first: generating, workflow-blocked, in-progress, remaining).
3. Keep grouped-by-status as an optional view mode, not the default.
4. Consolidate in-progress messaging so article progress uses the same language model as generation activity.
5. Re-test bulk action behavior in both modes.

### Phase 4: Client Profile Information Architecture

**Files:**
- Modify: `components/screens/ClientProfileScreen.tsx`
- Modify: `components/clients/profile/*.tsx` (targeted sections only)

**Checklist:**
1. Reduce visual noise in section headers and improve section-level summaries.
2. Add section completion indicators (what is configured vs missing).
3. Keep autosave status persistent and clear while editing.
4. Streamline "Danger Zone" to reduce accidental focus and improve clarity.

### Validation Plan

**Commands:**
1. `npm run build`
2. `npm run test:unit -- tests/services/generationActivity.test.ts tests/services/generationActivitySummary.test.ts tests/services/articleGenerationActivity.test.ts` (when list/activity logic changes)
3. Optional after Phase 3+: targeted Playwright flow for brief list and article list interactions.

**Manual QA (Desktop):**
1. Client list: search, sort, settings/delete actions visibility, generating indicator.
2. Brief list: search/sort/filter, bulk selection/actions, status updates, menu visibility.
3. Articles tab: card actions, workflow transitions, published URL handling.
4. Generation Activity: view/cancel actions and recent activity coherence.
