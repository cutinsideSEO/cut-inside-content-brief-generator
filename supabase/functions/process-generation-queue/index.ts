// Edge Function: process-generation-queue
// Worker that processes generation jobs from the queue.
// Invoked by pg_cron every 10-30 seconds or manually via POST.
//
// Flow:
// 1. Query generation_jobs for pending jobs
// 2. Claim jobs atomically (UPDATE WHERE status='pending')
// 3. Process each job (call Gemini via shared step-executor)
// 4. Save results to DB, update job status + progress
// 5. Status changes trigger Supabase Realtime for frontend updates

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { executeBriefStep } from '../_shared/step-executor.ts'
import { generateFullArticle } from '../_shared/article-generator.ts'
import type { ArticleJobConfig, ArticleResumeState } from '../_shared/article-generator.ts'
import type {
  ContentBrief,
  CompetitorPage,
  CompetitorSummary,
  ClientBrandData,
  ContextFileData,
  ContextUrlData,
  GeminiModel,
  ThinkingLevel,
  LengthConstraints,
  HeadingNode,
  StepExecutionParams,
} from '../_shared/types.ts'
import {
  buildBrandContext,
  mergeBrandContext,
  formatForBriefGeneration,
  stripCompetitorFullText,
} from '../_shared/brief-context.ts'
import { retryOperation } from '../_shared/gemini-client.ts'
import { getSerpUrls, getOnPageElements } from '../_shared/dataforseo-client.ts'
import {
  computeRetryBackoffSeconds,
  isJobStaleForRecovery,
  resolveRecoveryPolicy,
  resolveQueueModelSettings,
  shouldCountFailedChainSlot,
  shouldHaltJobProcessing,
  type ChainJobOutcome,
} from '../_shared/generation-guards.ts'

// ============================================
// Constants
// ============================================

const MAX_JOBS_PER_INVOCATION = 1;

/** Keep article jobs alive while long section/model calls are in flight. */
const ARTICLE_HEARTBEAT_INTERVAL_MS = 20_000;
const DEFAULT_JOB_LEASE_MINUTES = 6;
const SOFT_ARTICLE_CHECKPOINT_MS = 120_000;
const SOFT_REQUEUE_DELAY_MS = 5_000;
const SOFT_REQUEUE_CODE = 'soft_checkpoint_requeue';

/** Workflow statuses that must not be overwritten by auto-computed statuses */
const WORKFLOW_STATUSES = [
  'sent_to_client',
  'approved',
  'changes_requested',
  'in_writing',
  'published',
];

const STALE_IN_PROGRESS_VIEWS = new Set([
  undefined,
  null,
  'initial_input',
  'context_input',
  'visualization',
  'brief_upload',
]);

function hasGeneratedBriefData(briefData: Partial<ContentBrief>): boolean {
  return Boolean(
    briefData.page_goal ||
    briefData.target_audience ||
    briefData.keyword_strategy ||
    briefData.competitor_insights ||
    briefData.content_gap_analysis ||
    briefData.article_structure ||
    briefData.faqs ||
    briefData.on_page_seo
  );
}

function hasTerminalBriefData(briefData: Partial<ContentBrief>): boolean {
  return Boolean(
    briefData.page_goal &&
    briefData.target_audience &&
    briefData.keyword_strategy &&
    briefData.competitor_insights &&
    briefData.content_gap_analysis &&
    briefData.article_structure &&
    briefData.faqs &&
    briefData.on_page_seo
  );
}

function buildTerminalBriefUpdate(currentStatus: string): Record<string, unknown> {
  const update: Record<string, unknown> = {
    current_step: 7,
    current_view: 'dashboard',
    updated_at: new Date().toISOString(),
  };

  if (!WORKFLOW_STATUSES.includes(currentStatus)) {
    update.status = 'complete';
  }

  return update;
}

function buildInProgressBriefUpdate(
  currentStatus: string,
  currentView: string | null | undefined
): Record<string, unknown> {
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (STALE_IN_PROGRESS_VIEWS.has(currentView)) {
    update.current_view = 'briefing';
  }

  if (!WORKFLOW_STATUSES.includes(currentStatus)) {
    update.status = 'in_progress';
  }

  return update;
}

/** Which downstream steps become stale when a given step is regenerated */
const STEP_DEPENDENCIES: Record<number, number[]> = {
  1: [2, 3, 4, 5, 6, 7],
  2: [4, 5, 6, 7],
  3: [4, 5, 6, 7],
  4: [5, 6, 7],
  5: [6, 7],
  6: [],
  7: [],
};

/** Human-readable step names for progress display */
const STEP_NAMES: Record<number, string> = {
  1: 'Page Goal & Audience',
  2: 'Keyword Strategy',
  3: 'Competitor Analysis',
  4: 'Content Gap Analysis',
  5: 'Article Structure',
  6: 'FAQ Generation',
  7: 'On-Page SEO',
};

/**
 * The order in which steps are executed during a full brief generation.
 * Matches the frontend UI wizard order (Competitor Analysis before Keywords)
 * so that each step has the same context it would have in the browser.
 *
 * UI Step 1: Goal (logical 1)
 * UI Step 2: Competitor Analysis (logical 3)
 * UI Step 3: Keywords (logical 2) — benefits from competitor insights
 * UI Step 4-7: logical 4-7
 */
const EXECUTION_ORDER = [1, 3, 2, 4, 5, 6, 7];

/** Steps that need full competitor text (not just summaries) */
const STEPS_NEEDING_FULL_TEXT = [3, 4, 5];

/** Steps that need ground truth text from top competitors */
const STEPS_NEEDING_GROUND_TRUTH = [1, 3, 4, 5];

/** Position-based weight for competitor URL scoring (ranks 1-20) */
function getRankWeight(rank: number): number {
  return Math.max(1, 21 - rank);
}

// ============================================
// Helper Types
// ============================================

// deno-lint-ignore no-explicit-any
type JobRow = Record<string, any>;

class SoftCheckpointRequeueError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SoftCheckpointRequeueError';
  }
}

function isSoftCheckpointRequeueError(error: Error): boolean {
  return error instanceof SoftCheckpointRequeueError || error.message.includes(SOFT_REQUEUE_CODE);
}

function getLeaseExpiryIso(minutes = DEFAULT_JOB_LEASE_MINUTES): string {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function getRetryScheduleIso(nextRetryCount: number): string {
  const delaySeconds = computeRetryBackoffSeconds(nextRetryCount);
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}

// ============================================
// Competitor & Context Helpers
// ============================================

/**
 * Transforms raw competitor DB rows into CompetitorPage objects.
 * The DB stores snake_case columns; the generation logic expects PascalCase/mixed fields.
 */
function transformCompetitors(rawCompetitors: Record<string, unknown>[]): CompetitorPage[] {
  return rawCompetitors.map(c => ({
    URL: (c.url as string) || '',
    Weighted_Score: (c.weighted_score as number) || 0,
    rankings: (c.rankings as CompetitorPage['rankings']) || [],
    H1s: (c.h1s as string[]) || [],
    H2s: (c.h2s as string[]) || [],
    H3s: (c.h3s as string[]) || [],
    Word_Count: (c.word_count as number) || 0,
    Full_Text: (c.full_text as string) || '',
    is_starred: (c.is_starred as boolean) || false,
  }));
}

/**
 * Selects the top 3 ground truth competitors (starred first, then highest scored).
 * Mirrors the frontend's getGroundTruthCompetitors() from App.tsx.
 */
function getGroundTruthCompetitors(competitors: CompetitorPage[]): CompetitorPage[] {
  const starred = competitors.filter(c => c.is_starred);
  const notStarred = competitors.filter(c => !c.is_starred);

  const topCompetitors = [...starred];

  let i = 0;
  while (topCompetitors.length < 3 && i < notStarred.length) {
    if (!topCompetitors.some(c => c.URL === notStarred[i].URL)) {
      topCompetitors.push(notStarred[i]);
    }
    i++;
  }

  return topCompetitors;
}

/**
 * Builds ground truth text from the top competitors.
 */
function buildGroundTruthText(competitors: CompetitorPage[]): string {
  const topCompetitors = getGroundTruthCompetitors(competitors);
  return topCompetitors
    .map(c => `URL: ${c.URL}\nTEXT: ${c.Full_Text}`)
    .join('\n\n---\n\n');
}

/**
 * Build the merged brand context string from the job config.
 */
function buildBrandInfoFromConfig(config: Record<string, unknown>): string {
  const client = config.client as ClientBrandData | null;
  if (!client) {
    return (config.brand_info as string) || '';
  }

  // Map client context files/urls to the expected format
  const clientContextFiles = (config.client_context_files as Array<{ name: string; content: string; category?: string }>) || [];
  const clientContextUrls = (config.client_context_urls as Array<{ url: string; content: string; label?: string }>) || [];

  const contextFileData: ContextFileData[] = clientContextFiles.map(f => ({
    file_name: f.name,
    description: f.category || null,
    parsed_content: f.content,
    parse_status: 'done',
  }));

  const contextUrlData: ContextUrlData[] = clientContextUrls.map(u => ({
    url: u.url,
    label: u.label || null,
    scraped_content: u.content,
    scrape_status: 'done',
  }));

  const clientContext = buildBrandContext(client, contextFileData, contextUrlData);
  const mergedContext = mergeBrandContext(clientContext, (config.brand_info as string) || '');
  return formatForBriefGeneration(mergedContext);
}

/**
 * Build StepExecutionParams from a job's config for a given step.
 */
function buildStepParams(
  config: Record<string, unknown>,
  step: number,
  options: { isRegeneration?: boolean; userFeedback?: string } = {},
  jobType: 'brief_step' | 'full_brief' | 'regenerate' = 'brief_step'
): StepExecutionParams {
  const competitors = transformCompetitors(
    (config.competitors as Record<string, unknown>[]) || []
  );

  // Determine competitor data for this step
  const needsFullText = STEPS_NEEDING_FULL_TEXT.includes(step);
  const competitorData = needsFullText
    ? competitors
    : stripCompetitorFullText(competitors);

  // Ground truth text
  const needsGroundTruth = STEPS_NEEDING_GROUND_TRUTH.includes(step);
  const groundTruthText = needsGroundTruth ? buildGroundTruthText(competitors) : undefined;

  // Keywords — DB stores {kw, volume} but step executor expects {keyword, volume}
  const rawKeywords = (config.keywords as Array<{ kw: string; volume: number }>) || [];
  const keywords = rawKeywords.map(k => ({ keyword: k.kw, volume: k.volume }));

  // Model settings
  const configuredModelSettings =
    (config.model_settings as { model: string; thinkingLevel: string } | undefined) ||
    { model: 'gemini-3-pro-preview', thinkingLevel: 'high' };
  const modelSettings = resolveQueueModelSettings(jobType, step, configuredModelSettings);

  // Length constraints
  const lengthConstraints = config.length_constraints as LengthConstraints | undefined;

  // Template headings (only for step 5)
  const extractedTemplate = config.extracted_template as { headingStructure?: HeadingNode[] } | undefined;
  const templateHeadings = step === 5 && extractedTemplate?.headingStructure
    ? extractedTemplate.headingStructure
    : undefined;

  // PAA questions (only for step 6)
  const paaQuestions = step === 6
    ? ((config.paa_questions as string[]) || [])
    : undefined;

  // Brand info
  const brandInfo = buildBrandInfoFromConfig(config);

  // Previous steps data — use brief_data as the accumulated results
  const briefData = (config.brief_data as Partial<ContentBrief>) || {};

  return {
    step,
    competitorData,
    subjectInfo: (config.subject_info as string) || '',
    brandInfo,
    previousStepsData: briefData,
    groundTruthText,
    userFeedback: options.userFeedback || undefined,
    availableKeywords: step === 2 ? keywords : undefined,
    isRegeneration: options.isRegeneration || false,
    language: (config.output_language as string) || 'English',
    templateHeadings,
    lengthConstraints,
    paaQuestions,
    model: modelSettings.model as GeminiModel,
    thinkingLevel: modelSettings.thinkingLevel as ThinkingLevel,
  };
}

// ============================================
// Job Progress Helpers
// ============================================

async function updateJobProgress(
  supabase: SupabaseClient,
  jobId: string,
  progress: Record<string, unknown>
): Promise<void> {
  await supabase
    .from('generation_jobs')
    .update({
      progress,
      updated_at: new Date().toISOString(),
      lease_expires_at: getLeaseExpiryIso(),
    })
    .eq('id', jobId);
}

function startRunningJobHeartbeat(
  supabase: SupabaseClient,
  jobId: string,
  intervalMs = ARTICLE_HEARTBEAT_INTERVAL_MS
): () => void {
  let updateInFlight = false;
  const timer = setInterval(() => {
    if (updateInFlight) return;
    updateInFlight = true;
    void supabase
      .from('generation_jobs')
      .update({
        updated_at: new Date().toISOString(),
        lease_expires_at: getLeaseExpiryIso(),
      })
      .eq('id', jobId)
      .eq('status', 'running')
      .then(({ error }) => {
        if (error) {
          console.warn(`Heartbeat update failed for job ${jobId}: ${error.message}`);
        }
      })
      .finally(() => {
        updateInFlight = false;
      });
  }, intervalMs);

  return () => clearInterval(timer);
}

async function markJobCompleted(
  supabase: SupabaseClient,
  jobId: string,
  briefId: string,
  clearActiveJob = true
): Promise<boolean> {
  const { data: completedJob, error: completeError } = await supabase
    .from('generation_jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      lease_expires_at: null,
      claimed_by: null,
      next_retry_at: null,
      dead_lettered_at: null,
    })
    .eq('id', jobId)
    .eq('status', 'running')
    .select('id')
    .maybeSingle();

  if (completeError) {
    throw new Error(`Failed to mark job ${jobId} as completed: ${completeError.message}`);
  }

  if (!completedJob) {
    return false;
  }

  if (clearActiveJob) {
    await supabase
      .from('briefs')
      .update({ active_job_id: null })
      .eq('id', briefId)
      .eq('active_job_id', jobId);
  }

  return true;
}

async function readProcessingStatuses(
  supabase: SupabaseClient,
  jobId: string,
  batchId?: string | null
): Promise<{ jobStatus: string; batchStatus: string | null }> {
  const { data: jobRow, error: jobError } = await supabase
    .from('generation_jobs')
    .select('status')
    .eq('id', jobId)
    .single();

  if (jobError || !jobRow) {
    throw new Error(`Failed to read status for job ${jobId}: ${jobError?.message || 'not found'}`);
  }

  if (!batchId) {
    return { jobStatus: jobRow.status as string, batchStatus: null };
  }

  const { data: batchRow, error: batchError } = await supabase
    .from('generation_batches')
    .select('status')
    .eq('id', batchId)
    .maybeSingle();

  if (batchError) {
    throw new Error(`Failed to read status for batch ${batchId}: ${batchError.message}`);
  }

  return {
    jobStatus: jobRow.status as string,
    batchStatus: (batchRow?.status as string | null) || null,
  };
}

async function isProcessingCancelled(
  supabase: SupabaseClient,
  jobId: string,
  batchId?: string | null
): Promise<boolean> {
  const { jobStatus, batchStatus } = await readProcessingStatuses(supabase, jobId, batchId);
  return shouldHaltJobProcessing(jobStatus, batchStatus);
}

async function clearActiveJobPointer(
  supabase: SupabaseClient,
  briefId: string,
  jobId: string
): Promise<void> {
  await supabase
    .from('briefs')
    .update({ active_job_id: null })
    .eq('id', briefId)
    .eq('active_job_id', jobId);
}

async function markJobCancelledIfActive(
  supabase: SupabaseClient,
  jobId: string,
  briefId: string
): Promise<void> {
  await supabase
    .from('generation_jobs')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      lease_expires_at: null,
      claimed_by: null,
      next_retry_at: null,
    })
    .eq('id', jobId)
    .in('status', ['pending', 'running']);

  await clearActiveJobPointer(supabase, briefId, jobId);
}

async function readJobStatus(
  supabase: SupabaseClient,
  jobId: string
): Promise<string> {
  const { data: row, error } = await supabase
    .from('generation_jobs')
    .select('status')
    .eq('id', jobId)
    .single();

  if (error || !row) {
    throw new Error(`Failed to read final status for job ${jobId}: ${error?.message || 'not found'}`);
  }

  return row.status as string;
}

/**
 * Read the current brief_data fresh from the DB to avoid overwriting concurrent edits.
 */
async function readCurrentBriefData(
  supabase: SupabaseClient,
  briefId: string
): Promise<{ briefData: Partial<ContentBrief>; currentStatus: string; currentView: string | null; projectId: string | null }> {
  const { data: brief, error } = await supabase
    .from('briefs')
    .select('brief_data, status, current_view, project_id')
    .eq('id', briefId)
    .single();

  if (error || !brief) {
    throw new Error(`Failed to read brief ${briefId}: ${error?.message || 'not found'}`);
  }

  return {
    briefData: (brief.brief_data as Partial<ContentBrief>) || {},
    currentStatus: (brief.status as string) || 'draft',
    currentView: (brief.current_view as string | null) || null,
    projectId: (brief.project_id as string | null) || null,
  };
}

/**
 * Merge step result into brief_data and save to DB.
 * Also updates the brief status if it's not a manual workflow status.
 */
async function mergeAndSaveBriefData(
  supabase: SupabaseClient,
  briefId: string,
  stepResult: Partial<ContentBrief>,
  newStatus?: string,
  additionalUpdates?: Record<string, unknown>
): Promise<void> {
  // Fresh read to avoid overwriting concurrent edits
  const { briefData: currentData, currentStatus, currentView } = await readCurrentBriefData(supabase, briefId);

  // Merge the step result into existing brief data
  const mergedData = { ...currentData, ...stepResult };

  const updatePayload: Record<string, unknown> = {
    brief_data: mergedData,
    updated_at: new Date().toISOString(),
    ...additionalUpdates,
  };

  // Only update status if it's not a manually-set workflow status
  if (newStatus && !WORKFLOW_STATUSES.includes(currentStatus)) {
    updatePayload.status = newStatus;
  }

  const requestedStep = Number(additionalUpdates?.current_step ?? 0);
  if (requestedStep >= 7 && hasTerminalBriefData(mergedData)) {
    Object.assign(updatePayload, buildTerminalBriefUpdate(currentStatus));
  } else if ((requestedStep > 1 || hasGeneratedBriefData(mergedData))) {
    Object.assign(updatePayload, buildInProgressBriefUpdate(currentStatus, currentView));
  }

  await supabase
    .from('briefs')
    .update(updatePayload)
    .eq('id', briefId);
}

// ============================================
// Batch Helpers
// ============================================

/**
 * Update batch counters after a job completes or fails.
 * If all jobs in the batch are done, mark the batch as completed/partially_failed/cancelled.
 */
async function updateBatchCounters(
  supabase: SupabaseClient,
  batchId: string,
  outcome: 'completed' | 'failed',
  count = 1
): Promise<void> {
  try {
    // Atomically increment the counter using the RPC function (avoids race conditions)
    const column = outcome === 'completed' ? 'completed_jobs' : 'failed_jobs';
    const { error: rpcError } = await supabase.rpc('increment_batch_counter', {
      p_batch_id: batchId,
      p_column: column,
      p_increment: count,
    });

    if (rpcError) {
      console.warn(`Failed to increment batch ${batchId} counter:`, rpcError.message);
      return;
    }

    // Now read the updated batch to check if it's complete
    const { data: batch, error: readError } = await supabase
      .from('generation_batches')
      .select('total_jobs, completed_jobs, failed_jobs, status')
      .eq('id', batchId)
      .single();

    if (readError || !batch) {
      console.warn(`Failed to read batch ${batchId} after counter update:`, readError?.message);
      return;
    }

    // Don't update already-completed or cancelled batches
    if (batch.status !== 'running') {
      return;
    }

    const totalDone = batch.completed_jobs + batch.failed_jobs;

    // Determine if batch is complete
    if (totalDone >= batch.total_jobs) {
      const updates: Record<string, unknown> = {
        completed_at: new Date().toISOString(),
      };

      if (batch.failed_jobs === 0) {
        updates.status = 'completed';
      } else if (batch.completed_jobs === 0) {
        updates.status = 'cancelled'; // All failed
      } else {
        updates.status = 'partially_failed';
      }

      const { error: updateError } = await supabase
        .from('generation_batches')
        .update(updates)
        .eq('id', batchId);

      if (updateError) {
        console.warn(`Failed to update batch ${batchId} status:`, updateError.message);
      }
    }
  } catch (err) {
    // Best-effort — don't fail the job because of batch counter issues
    console.warn(`Error updating batch counters for ${batchId}:`, (err as Error).message);
  }
}

/**
 * Chain a full_brief job after competitors completes for a batch pipeline.
 * Creates a new pending full_brief job for the same brief, linked to the same batch.
 * Snapshots the brief's current state (including freshly-saved competitor data) into the config.
 */
async function chainFullBriefJob(
  supabase: SupabaseClient,
  job: JobRow,
  briefId: string
): Promise<ChainJobOutcome> {
  try {
    if (await isProcessingCancelled(supabase, job.id, job.batch_id)) {
      return 'cancelled';
    }

    // Fetch the brief with all related data for config snapshotting
    // (same pattern as create-generation-job)
    const { data: brief, error: briefError } = await supabase
      .from('briefs')
      .select('*, clients(*)')
      .eq('id', briefId)
      .single();

    if (briefError || !brief) {
      console.error(`Failed to read brief ${briefId} for chaining:`, briefError?.message);
      return 'failed';
    }

    // Fetch the freshly-saved competitors
    const { data: competitors } = await supabase
      .from('brief_competitors')
      .select('*')
      .eq('brief_id', briefId)
      .order('weighted_score', { ascending: false });

    // Fetch context files (parsed content)
    const { data: contextFiles } = await supabase
      .from('brief_context_files')
      .select('file_name, parsed_content')
      .eq('brief_id', briefId)
      .eq('parse_status', 'done');

    // Fetch context URLs (scraped content)
    const { data: contextUrls } = await supabase
      .from('brief_context_urls')
      .select('url, scraped_content')
      .eq('brief_id', briefId)
      .eq('scrape_status', 'done');

    // Fetch client context files and URLs for brand context
    const { data: clientContextFiles } = await supabase
      .from('client_context_files')
      .select('file_name, parsed_content, category')
      .eq('client_id', brief.client_id)
      .eq('parse_status', 'done');

    const { data: clientContextUrls } = await supabase
      .from('client_context_urls')
      .select('url, scraped_content, label')
      .eq('client_id', brief.client_id)
      .eq('scrape_status', 'done');

    if (await isProcessingCancelled(supabase, job.id, job.batch_id)) {
      return 'cancelled';
    }

    // Build the full_brief config snapshot
    const nextConfig: Record<string, unknown> = {
      // Brief data
      subject_info: brief.subject_info,
      brand_info: brief.brand_info,
      brief_data: brief.brief_data || {},
      keywords: brief.keywords || [],
      paa_questions: brief.paa_questions || [],
      stale_steps: brief.stale_steps || [],
      output_language: brief.output_language || 'English',
      serp_language: brief.serp_language || 'English',
      serp_country: brief.serp_country || 'United States',
      model_settings: brief.model_settings || { model: 'gemini-3-pro-preview', thinkingLevel: 'high' },
      length_constraints: brief.length_constraints,
      extracted_template: brief.extracted_template,
      user_feedbacks: brief.user_feedbacks || {},
      project_id: (brief.project_id as string | null) || null,

      // Related data — use freshly saved competitors
      competitors: competitors || [],
      context_files: (contextFiles || []).map((f: { file_name: string; parsed_content: string }) => ({
        name: f.file_name, content: f.parsed_content
      })),
      context_urls: (contextUrls || []).map((u: { url: string; scraped_content: string }) => ({
        url: u.url, content: u.scraped_content
      })),

      // Client brand context
      client: brief.clients ? {
        name: brief.clients.name,
        brand_identity: brief.clients.brand_identity,
        brand_voice: brief.clients.brand_voice,
        target_audience: brief.clients.target_audience,
        content_strategy: brief.clients.content_strategy,
      } : null,
      client_context_files: (clientContextFiles || []).map((f: { file_name: string; parsed_content: string; category: string }) => ({
        name: f.file_name, content: f.parsed_content, category: f.category
      })),
      client_context_urls: (clientContextUrls || []).map((u: { url: string; scraped_content: string; label: string }) => ({
        url: u.url, content: u.scraped_content, label: u.label
      })),

      // Job-specific
      user_feedback: null,
      writer_instructions: null,
    };

    // Create the chained full_brief job
    const { data: nextJob, error: nextJobError } = await supabase
      .from('generation_jobs')
      .insert({
        brief_id: briefId,
        client_id: job.client_id,
        created_by: job.created_by,
        job_type: 'full_brief',
        step_number: 1,
        batch_id: job.batch_id,
        config: nextConfig,
        status: 'pending',
        progress: {
          current_step: 1,
          total_steps: 7,
          step_name: 'Queued',
          percentage: 0,
        },
      })
      .select('id')
      .single();

    if (nextJobError || !nextJob) {
      console.error(`Failed to create chained full_brief job for brief ${briefId}:`, nextJobError?.message);
      return 'failed';
    }

    // Update the brief's active_job_id to point to the new full_brief job
    const { error: briefUpdateError } = await supabase
      .from('briefs')
      .update({ active_job_id: nextJob.id })
      .eq('id', briefId);

    if (briefUpdateError) {
      console.error(`Failed to set active_job_id for chained full_brief job ${nextJob.id}:`, briefUpdateError.message);
      return 'failed';
    }

    console.log(`Chained full_brief job ${nextJob.id} for brief ${briefId} in batch ${job.batch_id}`);
    return 'chained';
  } catch (err) {
    console.error(`Error chaining full_brief for brief ${briefId}:`, (err as Error).message);
    return 'failed';
  }
}

// ============================================
// Job Handlers
// ============================================

/**
 * Process a single brief step generation job.
 */
async function processBriefStep(supabase: SupabaseClient, job: JobRow): Promise<void> {
  const config = job.config as Record<string, unknown>;
  const step = job.step_number as number;
  const briefId = job.brief_id as string;

  // Update progress before starting
  await updateJobProgress(supabase, job.id, {
    current_step: step,
    total_steps: 1,
    step_name: `Generating ${STEP_NAMES[step] || `Step ${step}`}...`,
  });

  // Build params and execute
  const params = buildStepParams(config, step, {}, 'brief_step');
  const result = await executeBriefStep(params);

  // Save result to DB — check if brief should be marked 'complete'
  // For single-step jobs, check if all 7 steps are now present
  const { briefData: currentBriefData, currentStatus } = await readCurrentBriefData(supabase, briefId);
  const merged = { ...currentBriefData, ...result };
  const allStepsComplete = merged.page_goal && merged.keyword_strategy &&
    merged.competitor_insights && merged.content_gap_analysis &&
    merged.article_structure && merged.faqs && merged.on_page_seo;

  let newStatus: string = 'in_progress';
  if (allStepsComplete && !WORKFLOW_STATUSES.includes(currentStatus)) {
    newStatus = 'complete';
  } else if (WORKFLOW_STATUSES.includes(currentStatus)) {
    newStatus = currentStatus; // Don't overwrite workflow statuses
  }

  await mergeAndSaveBriefData(supabase, briefId, result, newStatus, {
    current_step: step,
  });

  // Mark job completed
  await markJobCompleted(supabase, job.id, briefId);
}

/**
 * Process a full brief generation (steps 1-7 sequentially).
 *
 * Strategy: Process the current step, then create a NEW job for the next step.
 * This allows progress tracking per-step via Realtime and keeps each job focused.
 */
async function processFullBrief(supabase: SupabaseClient, job: JobRow): Promise<void> {
  const config = job.config as Record<string, unknown>;
  const step = (job.step_number as number) || 1;
  const briefId = job.brief_id as string;

  // Update progress: show which step is running (use execution order index for percentage)
  const execIndex = EXECUTION_ORDER.indexOf(step);
  await updateJobProgress(supabase, job.id, {
    current_step: step,
    total_steps: 7,
    step_name: `Generating ${STEP_NAMES[step] || `Step ${step}`}...`,
    percentage: execIndex >= 0 ? Math.round((execIndex / 7) * 100) : 0,
  });

  // Build params and execute current step
  const params = buildStepParams(config, step, {}, 'full_brief');
  const result = await executeBriefStep(params);

  // Merge result into brief_data in DB
  await mergeAndSaveBriefData(supabase, briefId, result, 'in_progress', {
    current_step: step,
  });

  // Determine next step using EXECUTION_ORDER (not sequential)
  const currentIndex = EXECUTION_ORDER.indexOf(step);
  const hasNextStep = currentIndex >= 0 && currentIndex < EXECUTION_ORDER.length - 1;

  if (hasNextStep) {
    if (await isProcessingCancelled(supabase, job.id, job.batch_id)) {
      await supabase.from('generation_jobs').update({ status: 'cancelled', completed_at: new Date().toISOString() }).eq('id', job.id);
      await supabase.from('briefs').update({ active_job_id: null }).eq('id', briefId);
      return;
    }

    const nextStep = EXECUTION_ORDER[currentIndex + 1];
    const nextStepIndex = currentIndex + 1; // 0-based position in execution order

    // Update the config with the new brief_data for the next step
    const { briefData: updatedBriefData } = await readCurrentBriefData(supabase, briefId);
    const nextStepConfig = {
      ...config,
      brief_data: updatedBriefData,
    };

    // Create a NEW job for the next step
    const { data: nextJob, error: nextJobError } = await supabase
      .from('generation_jobs')
      .insert({
        brief_id: briefId,
        client_id: job.client_id,
        created_by: job.created_by,
        batch_id: job.batch_id || null,
        job_type: 'full_brief',
        step_number: nextStep,
        config: nextStepConfig,
        status: 'pending',
        progress: {
          current_step: nextStep,
          total_steps: 7,
          step_name: `Queued: ${STEP_NAMES[nextStep] || `Step ${nextStep}`}`,
          percentage: Math.round((nextStepIndex / 7) * 100),
        },
      })
      .select('id')
      .single();

    if (nextJobError || !nextJob) {
      throw new Error(`Failed to create next step job: ${nextJobError?.message || 'unknown'}`);
    }

    // Point the brief's active_job_id to the new job
    await supabase
      .from('briefs')
      .update({ active_job_id: nextJob.id })
      .eq('id', briefId);

    // Mark THIS job as completed (don't clear active_job_id since we set it to the new job)
    await markJobCompleted(supabase, job.id, briefId, false);
  } else {
    if (await isProcessingCancelled(supabase, job.id, job.batch_id)) {
      await supabase.from('generation_jobs').update({ status: 'cancelled', completed_at: new Date().toISOString() }).eq('id', job.id);
      await supabase.from('briefs').update({ active_job_id: null }).eq('id', briefId);
      return;
    }

    // Step 7 — final step. Mark brief as complete (with workflow guard)
    const { currentStatus } = await readCurrentBriefData(supabase, briefId);

    const briefUpdate = buildTerminalBriefUpdate(currentStatus);

    await supabase
      .from('briefs')
      .update(briefUpdate)
      .eq('id', briefId);

    // Mark job completed and clear active_job_id
    await markJobCompleted(supabase, job.id, briefId, true);
  }
}

/**
 * Process a regeneration job (re-run a single step with user feedback).
 */
async function processRegenerate(supabase: SupabaseClient, job: JobRow): Promise<void> {
  const config = job.config as Record<string, unknown>;
  const step = job.step_number as number;
  const briefId = job.brief_id as string;

  // User feedback can come from the job config or the user_feedbacks map
  const userFeedbacks = (config.user_feedbacks as Record<string, string>) || {};
  const userFeedback = (config.user_feedback as string) || userFeedbacks[String(step)] || '';

  // Update progress
  await updateJobProgress(supabase, job.id, {
    current_step: step,
    total_steps: 1,
    step_name: `Regenerating ${STEP_NAMES[step] || `Step ${step}`}...`,
  });

  // Build params with regeneration flag and user feedback
  const params = buildStepParams(config, step, {
    isRegeneration: true,
    userFeedback,
  }, 'regenerate');

  const result = await executeBriefStep(params);

  // Compute stale steps (downstream steps that depend on this one)
  const staleSteps = STEP_DEPENDENCIES[step] || [];

  // Merge result and update stale steps
  await mergeAndSaveBriefData(supabase, briefId, result, undefined, {
    current_step: step,
    stale_steps: staleSteps.length > 0 ? staleSteps : [],
  });

  // Mark job completed
  await markJobCompleted(supabase, job.id, briefId);
}

/**
 * Process an article generation job.
 * Generates a full article from the brief, saves to brief_articles table.
 */
async function processArticle(supabase: SupabaseClient, job: JobRow): Promise<void> {
  const stopHeartbeat = startRunningJobHeartbeat(supabase, job.id as string);
  const startedAtMs = Date.now();
  try {
  const config = job.config as Record<string, unknown>;
  const briefId = job.brief_id as string;

  // Read fresh brief data from DB
  const { briefData } = await readCurrentBriefData(supabase, briefId);

  // Model settings
  const configuredModelSettings =
    (config.model_settings as { model: string; thinkingLevel: string } | undefined) ||
    { model: 'gemini-3-pro-preview', thinkingLevel: 'high' };
  const modelSettings = resolveQueueModelSettings('article', null, configuredModelSettings);

  // Build brand context from client data
  const brandContext = buildBrandInfoFromConfig(config);

  // Length constraints for word targets
  const lengthConstraints = config.length_constraints as LengthConstraints | undefined;
  const globalWordTarget = lengthConstraints?.globalTarget
    || briefData.article_structure?.word_count_target
    || null;
  const strictMode = lengthConstraints?.strictMode || false;

  // Build article job config
  const articleConfig: ArticleJobConfig = {
    brief: briefData,
    language: (config.output_language as string) || 'English',
    writerInstructions: (config.writer_instructions as string) || undefined,
    brandContext: brandContext || undefined,
    model: modelSettings.model as GeminiModel,
    thinkingLevel: modelSettings.thinkingLevel as ThinkingLevel,
    globalWordTarget,
    strictMode,
  };

  // Extract resume state from previous partial run (if any)
  const existingProgress = job.progress as Record<string, unknown>;
  const resumeState: ArticleResumeState | undefined =
    (existingProgress?.partial_content && existingProgress?.completed_section_index != null)
      ? {
          partial_content: existingProgress.partial_content as string[],
          completed_section_index: existingProgress.completed_section_index as number,
        }
      : undefined;

  if (resumeState) {
    console.log(`Resuming article generation from section index ${resumeState.completed_section_index}`);
  }

  // Progress callback — updates generation_jobs.progress for Realtime
  // Track last checkpoint so non-checkpoint progress calls don't wipe it out
  // (updateJobProgress replaces the entire JSONB, so we must always carry forward)
  let lastCheckpointContent: string[] | undefined = resumeState?.partial_content;
  let lastCheckpointIndex: number | undefined = resumeState?.completed_section_index;

  const onProgress = async (progress: {
    currentSection: string;
    currentIndex: number;
    total: number;
    contentSoFar?: string;
    completedSectionIndex?: number;
    contentPartsSnapshot?: string[];
  }) => {
    // Update checkpoint state if this is a checkpoint call
    if (progress.completedSectionIndex != null && progress.contentPartsSnapshot) {
      lastCheckpointContent = progress.contentPartsSnapshot;
      lastCheckpointIndex = progress.completedSectionIndex;
    }

    // deno-lint-ignore no-explicit-any
    const progressData: Record<string, any> = {
      current_section: progress.currentSection,
      current_index: progress.currentIndex,
      total_sections: progress.total,
      percentage: Math.round((progress.currentIndex / progress.total) * 100),
      word_count: progress.contentSoFar ? progress.contentSoFar.split(/\s+/).length : 0,
    };

    // Always include last checkpoint for resume (survives non-checkpoint overwrites)
    if (lastCheckpointContent && lastCheckpointIndex != null) {
      progressData.partial_content = lastCheckpointContent;
      progressData.completed_section_index = lastCheckpointIndex;
    }

    await updateJobProgress(supabase, job.id, progressData);

    if (Date.now() - startedAtMs >= SOFT_ARTICLE_CHECKPOINT_MS) {
      throw new SoftCheckpointRequeueError(`${SOFT_REQUEUE_CODE}: checkpoint reached time budget`);
    }
  };

  // Generate the full article (with resume support)
  const result = await generateFullArticle(articleConfig, onProgress, resumeState);

  // Save to brief_articles table (mirroring frontend createArticle logic)
  // Get the latest version number
  const { data: existingArticles } = await supabase
    .from('brief_articles')
    .select('version')
    .eq('brief_id', briefId)
    .order('version', { ascending: false })
    .limit(1);

  const latestVersion = existingArticles?.[0]?.version || 0;
  const newVersion = latestVersion + 1;
  const { projectId: currentBriefProjectId } = await readCurrentBriefData(supabase, briefId);

  // Insert new article (mark_previous_articles_not_current trigger handles is_current)
  const { error: insertError } = await supabase
    .from('brief_articles')
    .insert({
      brief_id: briefId,
      project_id: currentBriefProjectId,
      title: result.title,
      content: result.content,
      version: newVersion,
      is_current: true,
      status: 'draft',
      published_url: null,
      generation_settings: {
        model_settings: modelSettings,
        length_constraints: lengthConstraints || null,
      },
      writer_instructions: (config.writer_instructions as string) || null,
    });

  if (insertError) {
    throw new Error(`Failed to save article: ${insertError.message}`);
  }

  // Update job progress to show completion
  await updateJobProgress(supabase, job.id, {
    current_section: 'Complete',
    current_index: result.wordCount,
    total_sections: result.wordCount,
    percentage: 100,
    word_count: result.wordCount,
  });

  // Mark job completed and clear active_job_id
  const completed = await markJobCompleted(supabase, job.id, briefId, true);
  if (!completed) {
    throw new Error(`Article job ${job.id} finished content but could not transition to completed`);
  }
  } finally {
    stopHeartbeat();
  }
}

/**
 * Process a competitors analysis job.
 * Fetches SERP results for each keyword, scrapes on-page data for top URLs,
 * and saves competitor data + PAA questions to the database.
 */
async function processCompetitors(supabase: SupabaseClient, job: JobRow): Promise<void> {
  const config = job.config as Record<string, unknown>;
  const briefId = job.brief_id as string;

  const keywords = (config.keywords as string[]) || [];
  const keywordVolumes = (config.keyword_volumes as Record<string, number>) || {};
  const country = (config.country as string) || 'United States';
  const serpLanguage = (config.serp_language as string) || 'English';

  if (keywords.length === 0) {
    throw new Error('No keywords provided for competitor analysis');
  }

  // ---- SERP PHASE ----
  // Collect SERP results across all keywords, aggregating URL scores
  const urlDataMap = new Map<string, { rankings: Array<{ keyword: string; rank: number; volume: number }>; score: number }>();
  const collectedPaaQuestions: string[] = [];

  for (let i = 0; i < keywords.length; i++) {
    if (await isProcessingCancelled(supabase, job.id, job.batch_id)) {
      await supabase.from('generation_jobs').update({ status: 'cancelled', completed_at: new Date().toISOString() }).eq('id', job.id);
      await supabase.from('briefs').update({ active_job_id: null }).eq('id', briefId);
      return;
    }

    const keyword = keywords[i];
    const volume = keywordVolumes[keyword] || 0;

    await updateJobProgress(supabase, job.id, {
      phase: 'serp',
      completed_keywords: i,
      total_keywords: keywords.length,
      completed_urls: 0,
      total_urls: 0,
      percentage: Math.round((i / keywords.length) * 40), // SERP = 0-40%
    });

    const serpResponse = await retryOperation(
      () => getSerpUrls(keyword, country, serpLanguage),
      3, 2000, 30000
    );

    // Collect PAA questions (deduplicated)
    for (const q of serpResponse.paaQuestions) {
      if (!collectedPaaQuestions.includes(q)) {
        collectedPaaQuestions.push(q);
      }
    }

    // Aggregate URLs by weighted score
    for (const result of serpResponse.urls) {
      if (!result.url) continue;
      if (!urlDataMap.has(result.url)) {
        urlDataMap.set(result.url, { rankings: [], score: 0 });
      }
      const data = urlDataMap.get(result.url)!;
      data.rankings.push({ keyword, rank: result.rank, volume });
      const rankWeight = getRankWeight(result.rank);
      data.score += volume * rankWeight;
    }

    // Rate limiting between keywords
    if (i < keywords.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Sort by weighted score, take top 10
  const sortedUrls = Array.from(urlDataMap.entries())
    .sort(([, a], [, b]) => b.score - a.score)
    .slice(0, 10);

  // ---- ON-PAGE PHASE ----
  // Scrape headings, word count, and full text from each top URL
  const competitors: Array<{
    url: string;
    weighted_score: number;
    rankings: Array<{ keyword: string; rank: number; volume: number }>;
    h1s: string[];
    h2s: string[];
    h3s: string[];
    word_count: number;
    full_text: string;
  }> = [];

  for (let i = 0; i < sortedUrls.length; i++) {
    if (await isProcessingCancelled(supabase, job.id, job.batch_id)) {
      await supabase.from('generation_jobs').update({ status: 'cancelled', completed_at: new Date().toISOString() }).eq('id', job.id);
      await supabase.from('briefs').update({ active_job_id: null }).eq('id', briefId);
      return;
    }

    const [url, data] = sortedUrls[i];

    await updateJobProgress(supabase, job.id, {
      phase: 'onpage',
      completed_keywords: keywords.length,
      total_keywords: keywords.length,
      completed_urls: i,
      total_urls: sortedUrls.length,
      current_domain: new URL(url).hostname,
      percentage: 40 + Math.round((i / sortedUrls.length) * 50), // OnPage = 40-90%
    });

    try {
      const onPageData = await retryOperation(
        () => getOnPageElements(url),
        3, 2000, 30000
      );

      competitors.push({
        url,
        weighted_score: Math.round(data.score),
        rankings: data.rankings,
        h1s: onPageData.H1s,
        h2s: onPageData.H2s,
        h3s: onPageData.H3s,
        word_count: onPageData.Word_Count,
        full_text: onPageData.Full_Text,
      });
    } catch (err) {
      console.warn(`Failed to scrape ${url}:`, (err as Error).message);
      // Continue with remaining URLs — don't fail the whole job
    }

    // Rate limiting between URLs
    if (i < sortedUrls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // ---- SAVE PHASE ----
  await updateJobProgress(supabase, job.id, {
    phase: 'saving',
    completed_keywords: keywords.length,
    total_keywords: keywords.length,
    completed_urls: sortedUrls.length,
    total_urls: sortedUrls.length,
    percentage: 90,
  });

  // Upsert competitors to brief_competitors table
  if (competitors.length > 0) {
    const competitorInserts = competitors.map(c => ({
      brief_id: briefId,
      url: c.url,
      weighted_score: c.weighted_score,
      rankings: c.rankings,
      h1s: c.h1s,
      h2s: c.h2s,
      h3s: c.h3s,
      word_count: c.word_count,
      full_text: c.full_text,
      is_starred: false,
    }));

    const { error: upsertError } = await supabase
      .from('brief_competitors')
      .upsert(competitorInserts, {
        onConflict: 'brief_id,url',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.warn('Upsert failed, falling back to delete + insert:', upsertError.message);
      await supabase.from('brief_competitors').delete().eq('brief_id', briefId);
      await supabase.from('brief_competitors').insert(competitorInserts);
    }

    // Cleanup old competitors not in the new list
    const newUrls = new Set(competitors.map(c => c.url));
    const { data: existing } = await supabase
      .from('brief_competitors')
      .select('id, url')
      .eq('brief_id', briefId);

    if (existing) {
      const idsToDelete = existing
        .filter((row: { id: string; url: string }) => !newUrls.has(row.url))
        .map((row: { id: string; url: string }) => row.id);

      if (idsToDelete.length > 0) {
        await supabase.from('brief_competitors').delete().in('id', idsToDelete);
      }
    }
  }

  // Save PAA questions to brief
  if (collectedPaaQuestions.length > 0) {
    await supabase
      .from('briefs')
      .update({ paa_questions: collectedPaaQuestions })
      .eq('id', briefId);
  }

  // Mark job completed
  await updateJobProgress(supabase, job.id, {
    phase: 'complete',
    completed_keywords: keywords.length,
    total_keywords: keywords.length,
    completed_urls: sortedUrls.length,
    total_urls: sortedUrls.length,
    percentage: 100,
  });

  // If this is a batched full_pipeline job, chain a full_brief job next.
  // Don't clear active_job_id — chainFullBriefJob will set it to the new job.
  if (job.batch_id) {
    const completed = await markJobCompleted(supabase, job.id, briefId, false);
    if (!completed) {
      return;
    }

    const chainOutcome = await chainFullBriefJob(supabase, job, briefId);
    if (chainOutcome === 'cancelled') {
      await clearActiveJobPointer(supabase, briefId, job.id as string);
      return;
    }

    if (shouldCountFailedChainSlot(chainOutcome)) {
      await clearActiveJobPointer(supabase, briefId, job.id as string);
      await updateBatchCounters(supabase, job.batch_id as string, 'failed');
    }
  } else {
    await markJobCompleted(supabase, job.id, briefId, true);
  }
}

// ============================================
// Stale Job Recovery
// ============================================

/**
 * Reset jobs stuck in 'running' state with no recent heartbeat for their
 * resolved recovery policy (timeout/retry budget depends on job type/progress).
 * This handles Edge Function timeouts where the job was claimed but never completed.
 * Jobs under max_retries are returned to 'pending'; exhausted jobs are marked 'failed'.
 */
async function resetStaleJobs(supabase: SupabaseClient): Promise<number> {
  const nowMs = Date.now();

  const { data: runningJobs, error } = await supabase
    .from('generation_jobs')
    .select('id, brief_id, batch_id, retry_count, max_retries, job_type, step_number, started_at, updated_at, lease_expires_at, progress')
    .eq('status', 'running');

  if (error || !runningJobs || runningJobs.length === 0) return 0;

  const staleJobs = runningJobs
    .map((job) => {
      const policy = resolveRecoveryPolicy(job);
      const leaseExpiresMs = job.lease_expires_at ? Date.parse(job.lease_expires_at as string) : Number.NaN;
      const leaseExpired = !Number.isNaN(leaseExpiresMs) && leaseExpiresMs <= nowMs;
      const cutoffIso = new Date(nowMs - policy.timeoutMinutes * 60 * 1000).toISOString();
      const staleByHeartbeat = isJobStaleForRecovery(job, cutoffIso);
      if (!leaseExpired && !staleByHeartbeat) return null;
      return { job, policy };
    })
    .filter((entry): entry is { job: JobRow; policy: { timeoutMinutes: number; maxRetries: number } } => Boolean(entry));
  if (staleJobs.length === 0) return 0;

  let resetCount = 0;
  for (const { job, policy } of staleJobs) {
    const retryCount = ((job.retry_count as number) || 0) + 1;
    const maxRetries = policy.maxRetries;

    if (retryCount < maxRetries) {
      // Return to pending for retry
      const retryAt = getRetryScheduleIso(retryCount);
      await supabase
        .from('generation_jobs')
        .update({
          status: 'pending',
          retry_count: retryCount,
          error_message: `Auto-reset: no heartbeat for >${policy.timeoutMinutes}min (likely timeout)`,
          updated_at: new Date().toISOString(),
          next_retry_at: retryAt,
          lease_expires_at: null,
          claimed_by: null,
        })
        .eq('id', job.id);
      console.log(`Reset stale job ${job.id} (type=${job.job_type}, step=${job.step_number}) to pending at ${retryAt} (retry ${retryCount}/${maxRetries})`);
    } else {
      // Max retries exhausted — mark as failed
      await supabase
        .from('generation_jobs')
        .update({
          status: 'failed',
          retry_count: retryCount,
          error_message: `Failed: no heartbeat for >${policy.timeoutMinutes}min, max retries exhausted`,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          next_retry_at: null,
          lease_expires_at: null,
          claimed_by: null,
          dead_lettered_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      // Clear brief's active_job_id so user can retry manually
      await supabase
        .from('briefs')
        .update({ active_job_id: null })
        .eq('id', job.brief_id);

      // Update batch counters for permanently failed job
      if (job.batch_id) {
        // For full_pipeline competitors: count both the failed competitors slot
        // and the never-created chained full_brief slot
        const failCount = job.job_type === 'competitors' ? 2 : 1;
        await updateBatchCounters(supabase, job.batch_id, 'failed', failCount);
      }

      console.log(`Marked stale job ${job.id} as failed (retries exhausted)`);
    }
    resetCount++;
  }

  return resetCount;
}

// ============================================
// Main Handler
// ============================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Auth gate: accept either QUEUE_PROCESSOR_SECRET or SUPABASE_SERVICE_ROLE_KEY.
  // This function uses verify_jwt: false (called by pg_cron with the service role key).
  // If neither secret is configured, the gate is skipped (open access for backwards compat).
  const queueSecret = Deno.env.get('QUEUE_PROCESSOR_SECRET');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (queueSecret || serviceRoleKey) {
    const authHeader = req.headers.get('Authorization');
    const validTokens = [
      queueSecret ? `Bearer ${queueSecret}` : null,
      serviceRoleKey ? `Bearer ${serviceRoleKey}` : null,
    ].filter(Boolean);
    if (!validTokens.includes(authHeader)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const workerId = `queue-worker-${crypto.randomUUID()}`;

    // Reset any stale jobs before processing new ones
    const staleCount = await resetStaleJobs(supabase);
    if (staleCount > 0) {
      console.log(`Reset ${staleCount} stale job(s)`);
    }

    // Find pending jobs that are eligible to run now, ordered by creation time (FIFO).
    const nowIso = new Date().toISOString();
    const { data: pendingJobs, error: fetchError } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('status', 'pending')
      .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
      .order('created_at', { ascending: true })
      .limit(MAX_JOBS_PER_INVOCATION);

    if (fetchError) {
      console.error('Error fetching pending jobs:', fetchError.message);
      return new Response(
        JSON.stringify({ processed: 0, error: fetchError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!pendingJobs || pendingJobs.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, stale_reset: staleCount, message: 'No pending jobs' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: Array<{ job_id: string; status: string; error?: string }> = [];

    for (const job of pendingJobs) {
      const leasePolicy = resolveRecoveryPolicy(job);
      const leaseExpiresAt = getLeaseExpiryIso(Math.max(DEFAULT_JOB_LEASE_MINUTES, leasePolicy.timeoutMinutes));
      const claimStartedAt = (job.started_at as string | null) || nowIso;

      // Atomically claim this job — only succeeds if still pending
      const { data: claimed } = await supabase
        .from('generation_jobs')
        .update({
          status: 'running',
          started_at: claimStartedAt,
          updated_at: nowIso,
          claimed_by: workerId,
          lease_expires_at: leaseExpiresAt,
          next_retry_at: null,
          dead_lettered_at: null,
        })
        .eq('id', job.id)
        .eq('status', 'pending')
        .select()
        .maybeSingle();

      if (!claimed) {
        // Another worker already claimed it
        results.push({ job_id: job.id, status: 'skipped' });
        continue;
      }

      if (await isProcessingCancelled(supabase, claimed.id, claimed.batch_id)) {
        await markJobCancelledIfActive(supabase, claimed.id, claimed.brief_id);
        results.push({ job_id: claimed.id, status: 'cancelled' });
        continue;
      }

      try {
        // Route to the appropriate handler
        switch (claimed.job_type) {
          case 'competitors':
            await processCompetitors(supabase, claimed);
            break;
          case 'brief_step':
            await processBriefStep(supabase, claimed);
            break;
          case 'full_brief':
            await processFullBrief(supabase, claimed);
            break;
          case 'regenerate':
            await processRegenerate(supabase, claimed);
            break;
          case 'article':
            await processArticle(supabase, claimed);
            break;
          default:
            throw new Error(`Unsupported job type: ${claimed.job_type}`);
        }

        const finalStatus = await readJobStatus(supabase, claimed.id);
        if (finalStatus === 'cancelled') {
          results.push({ job_id: claimed.id, status: 'cancelled' });
          continue;
        }

        if (finalStatus !== 'completed') {
          results.push({ job_id: claimed.id, status: finalStatus });
          continue;
        }

        // Update batch counters if this job belongs to a batch.
        // For full_brief jobs, only count the final step (step 7) since intermediate
        // steps chain to the next step and shouldn't each count as a separate batch job.
        if (claimed.batch_id) {
          const isFullBrief = claimed.job_type === 'full_brief';
          const currentStep = claimed.step_number as number;
          const lastStep = EXECUTION_ORDER[EXECUTION_ORDER.length - 1];
          const isIntermediateStep = isFullBrief && currentStep !== lastStep;

          if (!isIntermediateStep) {
            await updateBatchCounters(supabase, claimed.batch_id, 'completed');
          }
        }

        results.push({ job_id: claimed.id, status: finalStatus });
      } catch (err) {
        const error = err as Error;
        console.error(`Job ${claimed.id} failed:`, error.message);

        const liveStatus = await readJobStatus(supabase, claimed.id).catch(() => null);
        if (liveStatus === 'cancelled') {
          results.push({ job_id: claimed.id, status: 'cancelled' });
          continue;
        }

        if (isSoftCheckpointRequeueError(error)) {
          await supabase
            .from('generation_jobs')
            .update({
              status: 'pending',
              next_retry_at: new Date(Date.now() + SOFT_REQUEUE_DELAY_MS).toISOString(),
              error_message: 'Auto-checkpoint: requeued before edge timeout',
              updated_at: new Date().toISOString(),
              lease_expires_at: null,
              claimed_by: null,
            })
            .eq('id', claimed.id)
            .eq('status', 'running');
          results.push({ job_id: claimed.id, status: 'requeued' });
          continue;
        }

        const retryCount = ((claimed.retry_count as number) || 0) + 1;
        const maxRetries = (claimed.max_retries as number) || 3;

        if (retryCount < maxRetries) {
          const retryAt = getRetryScheduleIso(retryCount);
          await supabase
            .from('generation_jobs')
            .update({
              status: 'pending',
              retry_count: retryCount,
              error_message: error.message,
              updated_at: new Date().toISOString(),
              next_retry_at: retryAt,
              lease_expires_at: null,
              claimed_by: null,
            })
            .eq('id', claimed.id)
            .eq('status', 'running');
        } else {
          await supabase
            .from('generation_jobs')
            .update({
              status: 'failed',
              retry_count: retryCount,
              error_message: error.message,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              next_retry_at: null,
              lease_expires_at: null,
              claimed_by: null,
              dead_lettered_at: new Date().toISOString(),
            })
            .eq('id', claimed.id)
            .eq('status', 'running');

          await clearActiveJobPointer(supabase, claimed.brief_id, claimed.id);

          if (claimed.batch_id) {
            const failCount = claimed.job_type === 'competitors' ? 2 : 1;
            await updateBatchCounters(supabase, claimed.batch_id, 'failed', failCount);
          }
        }

        results.push({ job_id: claimed.id, status: 'error', error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, stale_reset: staleCount, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('process-generation-queue fatal error:', (err as Error).message);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

