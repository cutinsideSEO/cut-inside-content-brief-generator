# Client Projects and Assignment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add projects under each client and allow assigning briefs and batch outputs to a project, while enforcing that every article always has the same project as its parent brief.

**Architecture:** Add a `client_projects` entity, add `project_id` references to `briefs`, `brief_articles`, and `generation_batches`, and enforce a hard DB invariant that `brief_articles.project_id` must always equal `briefs.project_id` for the same brief. Batch creation will support `project_id` and assign outcomes accordingly.

**Tech Stack:** Supabase Postgres + Edge Functions, React + TypeScript, existing services in `services/`, existing screens in `components/screens/`.

---

## Final Product Rules (Locked)

1. Project assignment is optional (`NULL` = unassigned).
2. Brief is the source of truth for project assignment.
3. Article project must always equal its parent brief project.
4. Article-level "assign project" UI is allowed, but implementation updates the parent brief (and therefore all articles for that brief), not just one article row.
5. Batch can be created with `project_id`; outcomes are assigned to that project.
6. For existing-brief batch runs with selected project:
- selected briefs are reassigned to that project before jobs are queued.

## Scope

1. Data model for projects.
2. Assignment on briefs.
3. Article/brief invariant enforcement.
4. Batch project propagation (full pipeline, full brief, article batch).
5. Project filtering on Briefs/Articles list views.
6. Basic project management UI in client context.

## Non-Goals (V1)

1. Multi-project per brief/article.
2. Cross-client project moves.
3. Project-level permissions separate from client permissions.
4. Dedicated project dashboard screen.

## Task 1: Database Migration and Invariants

**Files:**
- Create: `supabase/migrations/008_client_projects.sql`

**Step 1: Create `client_projects` table**
- Columns:
  - `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()`
  - `client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE`
  - `created_by UUID NOT NULL REFERENCES access_codes(id)`
  - `name TEXT NOT NULL`
  - `description TEXT`
  - `status TEXT NOT NULL DEFAULT 'active'` with check `('active','archived')`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`
- Indexes:
  - `idx_client_projects_client_id` on `(client_id)`
  - unique index on `(client_id, lower(name))`

**Step 2: Add `project_id` columns**
- `ALTER TABLE briefs ADD COLUMN project_id UUID REFERENCES client_projects(id) ON DELETE SET NULL`
- `ALTER TABLE brief_articles ADD COLUMN project_id UUID REFERENCES client_projects(id) ON DELETE SET NULL`
- `ALTER TABLE generation_batches ADD COLUMN project_id UUID REFERENCES client_projects(id) ON DELETE SET NULL`
- Indexes:
  - `idx_briefs_client_project` on `(client_id, project_id)`
  - `idx_brief_articles_project_id` on `(project_id)`
  - `idx_generation_batches_client_project` on `(client_id, project_id)`

**Step 3: Backfill existing rows**
- `UPDATE brief_articles a SET project_id = b.project_id FROM briefs b WHERE a.brief_id = b.id;`

**Step 4: Add hard invariant triggers**
- Create `sync_article_project_from_brief()` trigger function:
  - On `brief_articles` `BEFORE INSERT OR UPDATE`
  - Load parent brief `project_id`
  - If `NEW.project_id` is null and brief has project, set `NEW.project_id = brief.project_id`
  - If `NEW.project_id IS DISTINCT FROM brief.project_id`, raise exception
- Create `cascade_brief_project_to_articles()` trigger function:
  - On `briefs` `AFTER UPDATE OF project_id`
  - Update all `brief_articles` rows for that brief to `NEW.project_id`

**Step 5: Add RLS and realtime**
- Enable RLS on `client_projects`
- Add policies mirroring existing permissive model
- Add `client_projects` table to `supabase_realtime` publication

**Step 6: Migration verification SQL**
- Verify no mismatched rows exist:
  - `SELECT a.id FROM brief_articles a JOIN briefs b ON b.id=a.brief_id WHERE a.project_id IS DISTINCT FROM b.project_id;` expected 0 rows

## Task 2: Type System Updates

**Files:**
- Modify: `types/database.ts`

**Step 1: Add project types**
- `ClientProject`, `ClientProjectInsert`, `ClientProjectUpdate`

**Step 2: Add `project_id` fields**
- `Brief`
- `BriefArticle`
- `GenerationBatch`
- `ArticleWithBrief` (include `project_id` for list rendering/filtering)

**Step 3: Add helper filter types**
- `BriefListFilters` with optional `projectId`
- `ArticleListFilters` with optional `projectId`

## Task 3: Project Service

**Files:**
- Create: `services/projectService.ts`

**Step 1: CRUD functions**
- `getProjectsForClient(clientId: string)`
- `createProject(clientId: string, name: string, description?: string)`
- `updateProject(projectId: string, updates)`
- `archiveProject(projectId: string)`

**Step 2: Assignment functions**
- `assignBriefToProject(briefId: string, projectId: string | null)`
- `assignArticleToProject(articleId: string, projectId: string | null)`:
  - fetch article -> get `brief_id`
  - call `assignBriefToProject` for that brief (do not directly update article row)

## Task 4: Brief/Article Query and Assignment Integration

**Files:**
- Modify: `services/briefService.ts`
- Modify: `services/articleService.ts`

**Step 1: Brief filters**
- Extend `getBriefsForClient(clientId, options?)` with `projectId` filter:
  - `undefined` => all projects
  - `'unassigned'` sentinel => `.is('project_id', null)`
  - UUID => `.eq('project_id', uuid)`

**Step 2: Article filters**
- Extend `getArticlesForClient(clientId, options?)` similarly using joined brief project or article project consistently.

**Step 3: Article creation consistency**
- `createArticle` should source `project_id` from parent brief on insert so DB trigger never fails from missing/mismatched project data.

## Task 5: Batch API and Edge Function Changes

**Files:**
- Modify: `services/batchService.ts`
- Modify: `supabase/functions/create-generation-batch/index.ts`

**Step 1: API contract update**
- Add optional `projectId` to `CreateBatchOptions`
- Send `project_id` in function payload

**Step 2: Validate project ownership**
- In `create-generation-batch`, when `project_id` provided:
  - verify exists
  - verify `project.client_id = client_id`

**Step 3: Persist batch project**
- Insert `generation_batches.project_id = project_id`

**Step 4: Apply project to outcomes**
- `full_pipeline`: newly created briefs get `project_id`
- `full_brief` (existing briefs): if `project_id` provided, update selected briefs to that project before inserting jobs
- `article` (existing briefs): if `project_id` provided, update selected briefs to that project before inserting jobs
- Ensure `job.config.project_id` is set for diagnostics/auditing (optional but recommended)

## Task 6: Queue Processor Article Insert Consistency

**Files:**
- Modify: `supabase/functions/process-generation-queue/index.ts`

**Step 1: Ensure insert uses brief project**
- Before inserting into `brief_articles`, read brief project or rely on config/brief snapshot and set `project_id`.
- Keep DB trigger as final guard.

**Step 2: Failure handling**
- If project mismatch exception occurs (unexpected), log explicit error and fail job with clear error message.

## Task 7: UI - Project Management and Filtering

**Files:**
- Modify: `components/screens/BriefListScreen.tsx`
- Modify: `components/screens/ClientProfileScreen.tsx` (or add small modal in BriefList header)

**Step 1: Project filter in list screen**
- Add dropdown near existing search/sort controls:
  - `All Projects`
  - `Unassigned`
  - each active project
- Apply filter to both briefs and articles tabs

**Step 2: Project management entrypoint**
- Add "Manage Projects" action:
  - create project
  - rename/archive project

**Step 3: Header context**
- Show selected project name and item count in current filter.

## Task 8: UI - Assignment Actions and Labels

**Files:**
- Modify: `components/briefs/BriefListCard.tsx`
- Modify: `components/articles/ArticleListCard.tsx`
- Optional small helper component: `components/ui/ProjectBadge.tsx`

**Step 1: Brief assignment UX**
- Add assign/unassign control in brief card actions.

**Step 2: Article assignment UX**
- Add action label:
  - "Move this article's brief to project"
- This action calls service that updates brief project.

**Step 3: Badge display**
- Show project badge on brief and article cards.

## Task 9: Realtime and Batch Activity Filtering

**Files:**
- Modify: `hooks/useBatchSubscription.ts`
- Modify: `components/briefs/GenerationActivityPanel.tsx`

**Step 1: Optional `projectId` param**
- Filter active batches by selected project (including unassigned)

**Step 2: Keep existing behavior stable**
- When filter = all, current batch behavior remains unchanged.

## Task 10: Unit Tests

**Files:**
- Create: `tests/services/projectService.test.ts`
- Modify: `tests/services/batchProgressDetails.test.ts` (if needed)
- Modify: `tests/services/articleGenerationActivity.test.ts` (project label/filter behavior)
- Create/Modify: `tests/services/briefService.test.ts` and `tests/services/articleService.test.ts` (if absent, add targeted files)

**Test cases:**
1. Create/list/archive project.
2. Assign brief to project and unassign.
3. Assign article to project moves parent brief, not standalone article.
4. Filtering by all/specific/unassigned returns expected items.
5. Batch payload includes project id and service mapping is correct.

## Task 11: E2E Tests

**Files:**
- Create: `e2e/project-assignment.spec.ts`
- Modify: `e2e/bulk-generation.spec.ts`

**Scenarios:**
1. Create project and assign brief from list card.
2. Generate article for assigned brief and verify article badge shows same project.
3. Use article card project action and verify parent brief moved.
4. Start bulk batch with project and verify created/updated briefs end in that project.
5. Filter by project and verify list/tab counts.

## Task 12: Verification Checklist and Commands

**Unit and targeted tests:**
1. `npm run test:unit -- tests/services/projectService.test.ts`
2. `npm run test:unit -- tests/services/generationActivity.test.ts tests/services/generationActivitySummary.test.ts tests/services/articleGenerationActivity.test.ts`
3. `npm run test:unit -- tests/services/batchProgressDetails.test.ts`
4. `npm run test:unit -- tests/services/briefService.test.ts tests/services/articleService.test.ts` (or targeted equivalents created in this work)

**E2E and gate:**
1. `npm run test:e2e -- e2e/project-assignment.spec.ts`
2. `npm run test:e2e -- e2e/bulk-generation.spec.ts`
3. `npm run qa:gate:core`

## Rollout Sequence

1. Deploy migration to staging, verify invariant query returns 0 mismatches.
2. Deploy updated edge functions.
3. Deploy frontend with project filters/assignment UI.
4. Run staging smoke:
- assign brief
- assign from article action
- run batch with project
- confirm article/brief project parity
5. Promote to production.

## Risks and Mitigations

1. Risk: existing article insert paths fail due to new invariant.
- Mitigation: set `project_id` explicitly from brief in all creation paths and keep DB sync trigger.

2. Risk: reassignment in article batch surprises users.
- Mitigation: explicit confirmation text in batch modal: "Selected briefs will be moved to this project."

3. Risk: filter confusion between all/unassigned/specific.
- Mitigation: clear filter label and counts in header.
