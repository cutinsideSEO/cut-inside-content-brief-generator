# Phase 5: Bulk Generation + Polish — Implementation Plan

## Overview

Enable bulk generation of 10-50 briefs simultaneously. Users provide keyword groups (each group = one brief with multiple keywords), the system creates briefs and runs the full pipeline (competitors → 7-step brief → optional article) server-side. Also add batch actions for existing briefs (generate full brief, generate article).

**Key concept: Each brief has MULTIPLE keywords** (`Array<{ kw: string; volume: number }>`). The bulk input must support grouping keywords per brief — not just one keyword = one brief. This matches the existing single-brief flow where InitialInputScreen collects multiple keywords via CSV or manual entry.

**Prerequisite:** Phases 1-4 complete. `generation_batches` table already exists in schema. `GenerationBatch` type already defined in `types/database.ts`.

**UI mandate:** All new components MUST use the existing shadcn/Radix UI primitives and design tokens. Specifically:
- `Modal` (Radix Dialog) for the bulk generation dialog
- `Tabs` (Radix Tabs, `variant="pills"`) for switching between "From Keywords" and "Existing Briefs" modes
- `FloatingPanel` + `FloatingPanelHeader` + `FloatingPanelItem` for batch progress display
- `Progress` (Radix Progress, `color="teal"`) for progress bars
- `Badge`, `Card`, `Select`, `Input`, `Textarea`, `checkbox` from `components/ui/`
- `toast` (sonner) for success/error notifications
- Design tokens: `bg-card`, `border-border`, `text-foreground`, `text-muted-foreground`, `font-heading`, `text-primary`
- `cn()` utility from `lib/utils.ts` for conditional classes

---

## Architecture

```
User pastes keyword groups (CSV or tab-separated)
Each group = one brief with multiple keywords
        │
        ▼
┌──────────────────────┐
│  BulkGenerationModal  │ (new component, uses Modal + Tabs)
│  - keyword groups     │
│  - country/language   │
│  - generation type    │
└──────────┬───────────┘
           │ POST
           ▼
┌──────────────────────────┐
│  create-generation-batch  │ (new Edge Function)
│  1. Insert batch row      │
│  2. Create N briefs       │
│  3. Create N jobs         │
│     (linked to batch)     │
│  4. Return batch_id       │
└──────────┬───────────────┘
           │
           ▼
┌──────────────────────────┐
│  generation_jobs table    │ (N pending jobs, all with batch_id)
│  generation_batches table │ (1 row: total_jobs=N)
└──────────┬───────────────┘
           │ pg_cron every 15s
           ▼
┌──────────────────────────┐
│ process-generation-queue  │ (existing, updated)
│ - Claims 3 jobs per tick  │
│ - After completion:       │
│   increment batch counters│
│ - When all done:          │
│   mark batch complete     │
└──────────────────────────┘
           │ Realtime
           ▼
┌──────────────────────────┐
│  BatchProgressPanel       │ (new component)
│  - "5/10 complete"        │
│  - per-brief status       │
│  - cancel button          │
└──────────────────────────┘
```

---

## Workstream A: Backend (Edge Functions)

### A1. New Edge Function: `create-generation-batch`

**Location:** `supabase/functions/create-generation-batch/index.ts`

**Endpoint:** POST, `verify_jwt: true`

**Request body:**

```typescript
{
  client_id: string;
  batch_name?: string;            // Optional label like "WD keyword batch"
  generation_type: 'full_pipeline' | 'full_brief' | 'article';

  // For 'full_pipeline' (new briefs from keyword groups):
  // Each entry = one brief. A brief can have MULTIPLE keywords.
  brief_entries?: Array<{
    subject_info?: string;        // Optional topic description (defaults to first keyword)
    keywords: Array<{             // ALL keywords for this brief (primary + secondary)
      kw: string;
      volume: number;
    }>;
  }>;
  country?: string;               // Default: 'United States'
  serp_language?: string;         // Default: 'English'
  output_language?: string;       // Default: 'English'
  model_settings?: { model: string; thinkingLevel: string };

  // For 'full_brief' or 'article' (existing briefs):
  brief_ids?: string[];           // Existing brief IDs to process
  writer_instructions?: string;   // For article generation
}
```

**Logic:**

```
1. Validate input (client_id required, at least brief_entries[] or brief_ids[])
2. Determine total job count:
   - full_pipeline: N brief_entries × 2 jobs each (competitors + full_brief chained)
   - full_brief: N brief_ids × 1 job each
   - article: N brief_ids × 1 job each
3. Insert generation_batches row:
   { client_id, created_by, name, total_jobs: N, status: 'running' }
4. For 'full_pipeline':
   For each brief_entry:
   a. Create brief row: {
        client_id, created_by,
        subject_info: entry.subject_info || entry.keywords[0].kw,
        keywords: entry.keywords,     // Array<{ kw, volume }> — multiple keywords per brief
        status: 'draft',
        serp_country, serp_language, output_language, model_settings
      }
   b. Create competitors job: {
        brief_id, job_type: 'competitors', batch_id,
        config: {
          keywords: entry.keywords.map(k => k.kw),  // Plain string array for SERP
          keyword_volumes: Object.fromEntries(entry.keywords.map(k => [k.kw, k.volume])),
          country, serp_language, output_language
        }
      }
   NOTE: full_brief jobs are NOT created here — they'll be created
   by a completion handler when competitors finish (see A3)
5. For 'full_brief':
   For each brief_id:
   a. Validate brief exists and has no active job
   b. Snapshot config (same as create-generation-job)
   c. Create full_brief job with batch_id
6. For 'article':
   For each brief_id:
   a. Validate brief exists, has complete brief_data
   b. Create article job with batch_id
7. Return { batch_id, total_jobs, created_brief_ids? }
```

**Reference:** `create-generation-job/index.ts` for config snapshotting pattern.

---

### A2. Update `create-generation-job/index.ts`

**Changes:**

1. Accept optional `batch_id` in request body (line ~18):
   ```typescript
   const { brief_id, job_type, step_number, batch_id, ... } = await req.json()
   ```

2. Pass `batch_id` to job insert (line ~165):
   ```typescript
   .insert({
     brief_id,
     batch_id: batch_id || null,  // NEW
     // ... rest unchanged
   })
   ```

3. Skip the "existing active job" check when `batch_id` is provided — batch jobs are managed at batch level, not individually. OR: keep the check but allow batch jobs to bypass it. Better approach: only skip if `force: true` is passed (for batch-created jobs).

---

### A3. Update `process-generation-queue/index.ts`

**Changes:**

1. **After any job completes or fails** (in the main loop, after the switch):
   Add batch counter update logic:

   ```typescript
   // After job succeeds:
   if (job.batch_id) {
     await updateBatchCounters(supabase, job.batch_id, 'completed');
   }

   // After job fails (in catch block):
   if (job.batch_id) {
     await updateBatchCounters(supabase, job.batch_id, 'failed');
   }
   ```

2. **New helper function `updateBatchCounters()`:**

   ```typescript
   async function updateBatchCounters(
     supabase: SupabaseClient,
     batchId: string,
     outcome: 'completed' | 'failed'
   ): Promise<void> {
     // Atomically increment the right counter
     const column = outcome === 'completed' ? 'completed_jobs' : 'failed_jobs';

     // Use RPC or raw SQL for atomic increment
     // Option 1: Read + write (slightly racy but OK for our scale)
     const { data: batch } = await supabase
       .from('generation_batches')
       .select('total_jobs, completed_jobs, failed_jobs')
       .eq('id', batchId)
       .single();

     if (!batch) return;

     const newCompleted = outcome === 'completed'
       ? batch.completed_jobs + 1
       : batch.completed_jobs;
     const newFailed = outcome === 'failed'
       ? batch.failed_jobs + 1
       : batch.failed_jobs;
     const totalDone = newCompleted + newFailed;

     const updates: Record<string, unknown> = {
       completed_jobs: newCompleted,
       failed_jobs: newFailed,
     };

     // Determine batch status
     if (totalDone >= batch.total_jobs) {
       if (newFailed === 0) {
         updates.status = 'completed';
       } else if (newCompleted === 0) {
         updates.status = 'cancelled'; // All failed
       } else {
         updates.status = 'partially_failed';
       }
       updates.completed_at = new Date().toISOString();
     }

     await supabase
       .from('generation_batches')
       .update(updates)
       .eq('id', batchId);
   }
   ```

3. **Chain full_brief after competitors** (for `full_pipeline` batches):
   At the end of `processCompetitors()`, after marking the job completed, check if this job has a `batch_id`. If so, automatically create a `full_brief` job for the same brief:

   ```typescript
   // At end of processCompetitors(), before markJobCompleted:
   if (job.batch_id) {
     // Auto-chain: create full_brief job for this brief
     const { briefData } = await readCurrentBriefData(supabase, briefId);
     // ... snapshot config same as create-generation-job ...
     await supabase.from('generation_jobs').insert({
       brief_id: briefId,
       client_id: job.client_id,
       created_by: job.created_by,
       job_type: 'full_brief',
       step_number: 1,
       batch_id: job.batch_id,
       config: nextConfig,
       status: 'pending',
       progress: { current_step: 1, total_steps: 7, step_name: 'Queued' },
     });

     // Increment batch total_jobs (since we're adding a chained job)
     await supabase.rpc('increment_batch_total', {
       p_batch_id: job.batch_id,
       p_increment: 1
     });
     // OR: just pre-calculate total_jobs as N*2 in create-generation-batch
   }
   ```

   **Better approach:** Pre-calculate `total_jobs` in `create-generation-batch` as `N * 2` (competitors + full_brief per keyword) so we don't need to modify total_jobs at runtime. The chaining still happens, but the total is known upfront.

4. **Concurrency fairness** (optional polish):
   Currently processes oldest jobs first (FIFO). For batch fairness, consider round-robin across batches. Simple approach: keep FIFO but ensure `MAX_JOBS_PER_INVOCATION = 3` naturally limits any single batch from monopolizing the queue.

---

### A4. Database: Add `increment_batch_counters` RPC (optional)

For atomic counter increments, add a Postgres function:

```sql
CREATE OR REPLACE FUNCTION increment_batch_counter(
  p_batch_id UUID,
  p_column TEXT,  -- 'completed_jobs' or 'failed_jobs'
  p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  IF p_column = 'completed_jobs' THEN
    UPDATE generation_batches
    SET completed_jobs = completed_jobs + p_increment
    WHERE id = p_batch_id;
  ELSIF p_column = 'failed_jobs' THEN
    UPDATE generation_batches
    SET failed_jobs = failed_jobs + p_increment
    WHERE id = p_batch_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

This avoids read-modify-write race conditions. However, given our scale (one queue worker at a time), the simpler read+write approach in A3 is also fine.

---

## Workstream B: Frontend

### B1. New service: `services/batchService.ts`

```typescript
import { supabase } from './supabaseClient';
import type { GenerationBatch } from '../types/database';

export interface BriefKeywordGroup {
  subjectInfo?: string;               // Optional topic description (defaults to first keyword)
  keywords: Array<{ kw: string; volume: number }>;  // Multiple keywords per brief
}

export interface CreateBatchOptions {
  clientId: string;
  batchName?: string;
  generationType: 'full_pipeline' | 'full_brief' | 'article';

  // For full_pipeline (new briefs from keyword groups)
  // Each entry = one brief. Each brief has MULTIPLE keywords.
  briefEntries?: BriefKeywordGroup[];
  country?: string;
  serpLanguage?: string;
  outputLanguage?: string;
  modelSettings?: { model: string; thinkingLevel: string };

  // For full_brief/article (existing briefs)
  briefIds?: string[];
  writerInstructions?: string;
}

export interface CreateBatchResult {
  batchId: string;
  totalJobs: number;
  createdBriefIds?: string[];
}

/** Create a bulk generation batch */
export async function createGenerationBatch(
  options: CreateBatchOptions
): Promise<CreateBatchResult> {
  const { data, error } = await supabase.functions.invoke(
    'create-generation-batch',
    {
      body: {
        client_id: options.clientId,
        batch_name: options.batchName,
        generation_type: options.generationType,
        brief_entries: options.briefEntries,
        country: options.country,
        serp_language: options.serpLanguage,
        output_language: options.outputLanguage,
        model_settings: options.modelSettings,
        brief_ids: options.briefIds,
        writer_instructions: options.writerInstructions,
      },
    }
  );

  if (error) throw new Error(error.message || 'Failed to create batch');
  return {
    batchId: data.batch_id,
    totalJobs: data.total_jobs,
    createdBriefIds: data.created_brief_ids,
  };
}

/** Cancel all pending jobs in a batch */
export async function cancelBatch(batchId: string): Promise<void> {
  // Set all pending jobs to cancelled
  const { error: jobError } = await supabase
    .from('generation_jobs')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('batch_id', batchId)
    .eq('status', 'pending');

  if (jobError) console.warn('Failed to cancel pending jobs:', jobError.message);

  // Update batch status
  const { error: batchError } = await supabase
    .from('generation_batches')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
    })
    .eq('id', batchId);

  if (batchError) console.warn('Failed to update batch status:', batchError.message);
}

/** Get all batches for a client (most recent first) */
export async function getBatchesForClient(
  clientId: string
): Promise<GenerationBatch[]> {
  const { data, error } = await supabase
    .from('generation_batches')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return data || [];
}

/** Get jobs for a specific batch */
export async function getJobsForBatch(batchId: string) {
  const { data, error } = await supabase
    .from('generation_jobs')
    .select('id, brief_id, job_type, status, progress, error_message')
    .eq('batch_id', batchId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}
```

---

### B2. New hook: `hooks/useBatchSubscription.ts`

Realtime subscription to `generation_batches` table changes for a client:

```typescript
import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { GenerationBatch } from '../types/database';

export function useBatchSubscription(clientId: string | null) {
  const [activeBatches, setActiveBatches] = useState<GenerationBatch[]>([]);

  useEffect(() => {
    if (!clientId) return;

    // Load initial active batches
    supabase
      .from('generation_batches')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'running')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setActiveBatches(data);
      });

    // Subscribe to changes
    const channel = supabase
      .channel(`batches-client:${clientId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'generation_batches',
        filter: `client_id=eq.${clientId}`,
      }, (payload) => {
        const batch = payload.new as GenerationBatch;
        setActiveBatches(prev => {
          const filtered = prev.filter(b => b.id !== batch.id);
          if (batch.status === 'running') {
            return [batch, ...filtered];
          }
          // Remove completed/cancelled batches after brief delay
          return filtered;
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clientId]);

  return { activeBatches };
}
```

---

### B3. New component: `components/briefs/BulkGenerationModal.tsx`

Uses existing `Modal` (`size="lg"`), `Tabs` (`variant="pills"`), `Input`, `Select`, `Textarea`, `Badge`, and `Card` components. Import all from `'../ui'`.

**Structure:**
```tsx
<Modal isOpen={isOpen} onClose={onClose} title="Bulk Generation" size="lg"
  footer={<>
    <Button variant="outline" onClick={onClose}>Cancel</Button>
    <Button onClick={handleStart} disabled={!isValid || isLoading}>
      {isLoading ? 'Creating...' : `Start Batch (${briefCount} briefs)`}
    </Button>
  </>}
>
  <Tabs items={tabItems} activeId={activeTab} onChange={setActiveTab} variant="pills" size="sm" />
  {activeTab === 'keywords' && <KeywordsTab />}
  {activeTab === 'existing' && <ExistingBriefsTab />}
</Modal>
```

**Tab 1: "From Keywords" (full_pipeline) — supports MULTIPLE keywords per brief:**

Input format options (radio or simple toggle):

1. **Simple mode** — one brief per line, keywords separated by commas:
   ```
   Textarea placeholder:
   "best nas for home, nas storage, network attached storage | 1200, 800, 500
    ssd vs hdd, solid state drive comparison | 2400, 900
    raid configuration guide | 1500"
   ```
   Format: `keyword1, keyword2, keyword3 | volume1, volume2, volume3`
   Each LINE = one brief. Keywords within a line share one brief.
   Volumes are optional (pipe-separated from keywords).

2. **CSV upload mode** — reuse existing CSV parsing pattern from `InitialInputScreen`:
   - Upload CSV with columns: keyword, volume, group (optional group column to cluster keywords into briefs)
   - If no group column: each row = one brief (single keyword)
   - If group column present: rows with same group value = one brief (multiple keywords)
   - Auto-detect columns using `findDefaultColumn()` pattern from InitialInputScreen

**Parsing produces:** `BriefKeywordGroup[]` — one entry per brief, each with `keywords: Array<{ kw, volume }>`.

**Settings section** (below the keyword input, using existing `Select` component):
- Country `<Select>` (default from client's `content_strategy.default_serp_country`)
- SERP Language `<Select>` (default from client's `content_strategy.default_serp_language`)
- Output Language `<Select>` (default from client's `content_strategy.default_output_language`)
- Model settings: model `<Select>` + thinking level `<Select>`

**Preview** (below settings):
```tsx
<Card variant="muted" padding="md">
  <p className="text-sm text-muted-foreground">
    This will create <Badge variant="default">{briefCount}</Badge> briefs
    with a total of <Badge variant="default">{totalKeywords}</Badge> keywords.
    Each brief will run competitor analysis → full 7-step brief generation.
  </p>
</Card>
```

**Tab 2: "Existing Briefs" (full_brief or article):**
- Only shown when `selectedBriefIds.length > 0`
- Shows: `<Badge>{selectedBriefIds.length}</Badge> briefs selected`
- Radio group (styled as `Card` buttons): "Generate Full Brief" / "Generate Article"
- For articles: `<Textarea>` for optional writer instructions
- Warning `<Alert variant="warning">` if any selected brief is in workflow status or has active job

**Both tabs:**
- "Start Batch" button in Modal `footer` → calls `createGenerationBatch()`
- Loading state with spinner while creating
- On success: `toast.success(...)`, close modal, call `onBatchCreated()` callback to refresh brief list

---

### B4. New component: `components/briefs/BatchProgressPanel.tsx`

Uses the existing `FloatingPanel` + `FloatingPanelHeader` + `FloatingPanelItem` + `FloatingPanelFooter` component from `components/ui/FloatingPanel.tsx`. Also uses `Progress` (`color="teal"`, `size="sm"`) and `Badge`.

**Structure:**
```tsx
<FloatingPanel position="bottom-right" variant="info">
  <FloatingPanelHeader icon={<Layers className="w-4 h-4 text-primary" />}>
    Batch Generation
  </FloatingPanelHeader>

  {batches.map(batch => (
    <FloatingPanelItem
      key={batch.id}
      title={batch.name || `Batch ${batch.id.slice(0, 8)}`}
      subtitle={`${batch.completed_jobs + batch.failed_jobs}/${batch.total_jobs} complete`}
      status={
        <div className="flex items-center gap-2 text-xs">
          {batch.completed_jobs > 0 && <Badge variant="success">{batch.completed_jobs} done</Badge>}
          {batch.failed_jobs > 0 && <Badge variant="error">{batch.failed_jobs} failed</Badge>}
          {pendingCount > 0 && <span className="text-muted-foreground">{pendingCount} pending</span>}
        </div>
      }
      progress={
        <Progress
          value={batch.completed_jobs + batch.failed_jobs}
          max={batch.total_jobs}
          size="sm"
          color={batch.failed_jobs > 0 ? 'yellow' : 'teal'}
        />
      }
      action={
        batch.status === 'running' && (
          <button
            onClick={() => onCancel(batch.id)}
            className="text-xs text-muted-foreground hover:text-red-500 transition-colors"
          >
            Cancel
          </button>
        )
      }
    />
  ))}

  <FloatingPanelFooter>
    {totalRunning} batch{totalRunning !== 1 ? 'es' : ''} running
  </FloatingPanelFooter>
</FloatingPanel>
```

**Features:**
- Uses existing FloatingPanel component (no custom panel needed)
- `Progress` component with `color="teal"` (switches to `"yellow"` if any jobs failed)
- `Badge` for status breakdown (success/error variants)
- Cancel button per batch
- Auto-dismiss completed batches after 5 seconds (remove from `activeBatches` state)

---

### B5. Update `components/screens/BriefListScreen.tsx`

All additions use existing UI components. No new custom styling needed.

**Changes:**

1. **Add "Generate" button to existing bulk action bar** (alongside Archive/Delete):
   Follow the existing pattern at lines 73-175 of BriefListScreen.
   ```tsx
   {selectedBriefs.size > 0 && (
     <div className="flex items-center gap-2">
       <Button onClick={() => setShowBulkModal('existing')}>
         Generate ({selectedBriefs.size})
       </Button>
       {/* existing Archive + Delete buttons stay here */}
     </div>
   )}
   ```

2. **Add "Bulk Generate" button** next to the existing "New Brief" button:
   ```tsx
   <Button variant="outline" onClick={() => setShowBulkModal('keywords')}>
     Bulk Generate
   </Button>
   ```

3. **BatchProgressPanel renders via FloatingPanel** — it's fixed-position bottom-right, so no layout changes needed. Just render it unconditionally; it hides itself when `activeBatches` is empty.

4. **Single modal with tab preselection:**
   ```tsx
   const [showBulkModal, setShowBulkModal] = useState<'keywords' | 'existing' | null>(null);
   const { activeBatches } = useBatchSubscription(clientId);

   <BulkGenerationModal
     isOpen={showBulkModal !== null}
     onClose={() => setShowBulkModal(null)}
     initialTab={showBulkModal || 'keywords'}
     selectedBriefIds={[...selectedBriefs]}
     clientId={clientId}
     onBatchCreated={() => { loadBriefs(); setSelectedBriefs(new Set()); }}
   />

   <BatchProgressPanel
     batches={activeBatches}
     onCancel={handleCancelBatch}
   />
   ```

---

### B6. Update `AppWrapper.tsx`

**Changes:**

1. **Add `generation_batches` to Realtime publication** (if not already):
   The batches table needs Realtime enabled. Check if it's in the Realtime publication — if not, we need a migration:
   ```sql
   ALTER PUBLICATION supabase_realtime ADD TABLE generation_batches;
   ```

2. **Refresh brief list when batch completes:**
   When a batch status changes to 'completed' or 'partially_failed', trigger a brief list refresh so new briefs appear.

3. **Pass `activeBatches` down to BriefListScreen** (or let BriefListScreen use the hook directly).

---

## Workstream C: Infrastructure + Documentation

### C1. Database Migration

New migration file: `supabase/migrations/004_batch_generation.sql`

```sql
-- Enable Realtime for generation_batches (if not already)
ALTER PUBLICATION supabase_realtime ADD TABLE generation_batches;

-- Optional: Add RPC for atomic counter increments
CREATE OR REPLACE FUNCTION increment_batch_counter(
  p_batch_id UUID,
  p_column TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  IF p_column = 'completed_jobs' THEN
    UPDATE generation_batches
    SET completed_jobs = completed_jobs + p_increment
    WHERE id = p_batch_id;
  ELSIF p_column = 'failed_jobs' THEN
    UPDATE generation_batches
    SET failed_jobs = failed_jobs + p_increment
    WHERE id = p_batch_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### C2. Deploy Edge Functions

After code changes:
- Deploy `create-generation-batch` (NEW, verify_jwt: true)
- Deploy `create-generation-job` v5 (updated, verify_jwt: true)
- Deploy `process-generation-queue` v8 (updated, verify_jwt: false)

### C3. Update Documentation

- `CLAUDE.md`: Add batch service, batch hook, BulkGenerationModal, BatchProgressPanel
- `MEMORY.md`: Mark Phase 5 complete
- `backend migration.md`: Mark Phase 5 complete with bullet points

---

## Parallel Execution Strategy

```
┌─────────────────────────┐  ┌──────────────────────────┐  ┌─────────────────────┐
│   AGENT 1: Backend      │  │   AGENT 2: Frontend      │  │   AGENT 3: Docs     │
├─────────────────────────┤  ├──────────────────────────┤  ├─────────────────────┤
│ A1. create-generation-  │  │ B1. batchService.ts      │  │ C1. Migration SQL   │
│     batch Edge Function │  │                          │  │                     │
│                         │  │ B2. useBatchSubscription  │  │ C3. CLAUDE.md       │
│ A2. Update create-      │  │     hook                 │  │     MEMORY.md       │
│     generation-job      │  │                          │  │     migration.md    │
│                         │  │ B3. BulkGenerationModal  │  │                     │
│ A3. Update process-     │  │                          │  │                     │
│     generation-queue    │  │ B4. BatchProgressPanel   │  │                     │
│     (batch counters +   │  │                          │  │                     │
│      chaining logic)    │  │ B5. BriefListScreen      │  │                     │
│                         │  │     updates              │  │                     │
│                         │  │                          │  │                     │
│                         │  │ B6. AppWrapper updates   │  │                     │
└─────────────────────────┘  └──────────────────────────┘  └─────────────────────┘
```

**Dependencies:**
- B1 (batchService) depends on A1 being defined (API contract)
- B3 (Modal) depends on B1 (service)
- B5 (BriefListScreen) depends on B2 + B3 + B4
- A3 (queue update) depends on A1 (batch chaining needs to know the job structure)
- C2 (deploy) depends on A1 + A2 + A3

**Agent assignment:**
- **Agent 1 (Backend):** A1 → A2 → A3 (sequential)
- **Agent 2 (Frontend):** B1 + B2 (parallel) → B3 → B4 → B5 + B6 (parallel)
- **Agent 3 (Docs):** C1 + C3 (parallel, independent)

---

## What Stays Unchanged

- All Stage components (1-7) — display only
- DashboardScreen — display only
- Single-brief generation flow — untouched
- useAutoSave — unchanged
- Individual brief cards — BriefListCard already supports generation status
- Sidebar — no changes needed (brief counts auto-update from DB)

---

## Concurrency & Rate Limiting

**Current limits:**
- `MAX_JOBS_PER_INVOCATION = 3` — up to 3 jobs processed per cron tick
- pg_cron runs every 15 seconds
- Each brief_step takes ~10-60 seconds (Gemini call)
- Each competitors job takes ~30-120 seconds (DataForSEO rate limits)

**Effective throughput:**
- ~3 jobs running simultaneously
- For a 10-brief batch (each brief with 3-5 keywords): 10 competitors jobs + 10 full_brief jobs = 20 total jobs
- Competitors jobs take longer with more keywords per brief (SERP call per keyword + on-page per URL)
- At 3 concurrent: ~7 cron cycles × ~1-2 min each = ~10-15 minutes for competitors phase
- Then ~7 cycles for full_brief (each full_brief chains 7 steps internally)
- **Total estimated time for 10-brief batch: ~25-40 minutes**

**No additional concurrency limiting needed** — the existing `MAX_JOBS_PER_INVOCATION = 3` naturally throttles. Gemini rate limits (60 RPM on Pro) are respected since each step is a single call, and with 3 concurrent jobs that's ~3 calls per 15 seconds = 12 RPM.

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Single job fails in batch | Job retried (up to 3x). If fails permanently, batch counter incremented as failed. Other jobs continue. |
| All jobs in batch fail | Batch status → `cancelled` (or `partially_failed` if some succeeded first) |
| User cancels batch | All `pending` jobs set to `cancelled`. Running jobs finish their current step but don't chain next. |
| Brief already has active job | Skip that brief in batch creation, warn user |
| Brief in workflow status | Skip that brief, warn user |
| Edge Function timeout | Job returns to `pending` for retry (existing behavior) |

---

## Verification Checklist

After implementation, verify:

- [ ] `npm run build` passes
- [ ] `npm run test:run` — all tests pass
- [ ] Batch from keywords: paste 3 keywords → 3 briefs created → competitors run → full_brief chains
- [ ] Batch from existing: select 2 complete briefs → generate articles → both complete
- [ ] BatchProgressPanel shows correct counts (completed/failed/total)
- [ ] Cancel batch: pending jobs cancelled, running jobs finish, batch marked cancelled
- [ ] Realtime updates: progress panel updates without page refresh
- [ ] Workflow status briefs are skipped with warning
- [ ] Briefs with active jobs are skipped with warning
- [ ] After batch completes, new briefs appear in brief list
- [ ] Edge Functions deployed successfully
- [ ] Documentation updated
