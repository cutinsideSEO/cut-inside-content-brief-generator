# Backend Migration QA Release Gate

This checklist validates the completed backend migration described in `backend migration.md`.

## Scope

- Server-side generation pipeline (`create-generation-job`, `process-generation-queue`)
- Bulk generation pipeline (`create-generation-batch`, `generation_batches`)
- Realtime-backed progress (`generation_jobs`, `generation_batches`, `briefs`)
- DataForSEO server-side routing (`dataforseo-proxy`)
- Cleanup and queue health invariants

## Preconditions

1. `.env.local` contains:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
2. Staging environment is targeted for this run.
3. Edge Functions are deployed in Supabase.
4. `npm install` has already been run.

## Automated Gates

### Core gate

```bash
npm run qa:gate:core
```

Runs:

1. `npm run build`
2. `npm run test:unit`
3. `npm run qa:gate:checks` (`scripts/qa/release-gate-checks.mjs`)

`qa:gate:checks` verifies:

1. Edge Function endpoint health/status expectations
2. `generation_jobs` lifecycle invariants and stale-running detection
3. `briefs.active_job_id` integrity against active jobs
4. `generation_batches` counter and status coherence
5. Security regression checks for client-side DataForSEO usage/credentials

### Migration e2e gate

```bash
npm run qa:gate:e2e:migration
```

Targeted specs:

1. `e2e/single-brief.spec.ts`
2. `e2e/brief-step.spec.ts`
3. `e2e/regenerate-step.spec.ts`
4. `e2e/article-generation.spec.ts`
5. `e2e/bulk-generation.spec.ts`

### Full gate

```bash
npm run qa:gate:full
```

## Manual QA Matrix

Run after automated gates pass:

1. Start generation, close browser, reopen later, confirm final persisted result.
2. Verify realtime progress updates during generation and batch processing.
3. Regenerate step and confirm stale-step behavior and clearing.
4. Run bulk jobs for 10, 25, and 50 briefs; confirm progress panel counters.
5. Confirm no DataForSEO credential fields appear in client UI flow.
6. Confirm cancel behavior leaves no incorrect `active_job_id`.

## Exit Criteria

1. `qa:gate:core` passes.
2. `qa:gate:e2e:migration` passes.
3. No `FAIL` items in `qa:gate:checks`.
4. Manual matrix items all pass.
5. Any warnings are reviewed and explicitly accepted before release.
