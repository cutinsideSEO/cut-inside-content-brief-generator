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
import type { ArticleJobConfig } from '../_shared/article-generator.ts'
import type {
  ContentBrief,
  CompetitorPage,
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

// ============================================
// Constants
// ============================================

const MAX_JOBS_PER_INVOCATION = 3;

/** Workflow statuses that must not be overwritten by auto-computed statuses */
const WORKFLOW_STATUSES = [
  'sent_to_client',
  'approved',
  'changes_requested',
  'in_writing',
  'published',
];

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

// ============================================
// Helper Types
// ============================================

// deno-lint-ignore no-explicit-any
type JobRow = Record<string, any>;

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
  options: { isRegeneration?: boolean; userFeedback?: string } = {}
): StepExecutionParams {
  const competitors = transformCompetitors(
    (config.competitors as Record<string, unknown>[]) || []
  );

  // Determine competitor data for this step
  const needsFullText = STEPS_NEEDING_FULL_TEXT.includes(step);
  const competitorData: CompetitorPage[] = needsFullText
    ? competitors
    : (stripCompetitorFullText(competitors) as unknown as CompetitorPage[]);

  // Ground truth text
  const needsGroundTruth = STEPS_NEEDING_GROUND_TRUTH.includes(step);
  const groundTruthText = needsGroundTruth ? buildGroundTruthText(competitors) : undefined;

  // Keywords — DB stores {kw, volume} but step executor expects {keyword, volume}
  const rawKeywords = (config.keywords as Array<{ kw: string; volume: number }>) || [];
  const keywords = rawKeywords.map(k => ({ keyword: k.kw, volume: k.volume }));

  // Model settings
  const modelSettings = (config.model_settings as { model: string; thinkingLevel: string }) ||
    { model: 'gemini-2.5-pro', thinkingLevel: 'high' };

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
    })
    .eq('id', jobId);
}

async function markJobCompleted(
  supabase: SupabaseClient,
  jobId: string,
  briefId: string,
  clearActiveJob = true
): Promise<void> {
  await supabase
    .from('generation_jobs')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (clearActiveJob) {
    await supabase
      .from('briefs')
      .update({ active_job_id: null })
      .eq('id', briefId);
  }
}

/**
 * Read the current brief_data fresh from the DB to avoid overwriting concurrent edits.
 */
async function readCurrentBriefData(
  supabase: SupabaseClient,
  briefId: string
): Promise<{ briefData: Partial<ContentBrief>; currentStatus: string }> {
  const { data: brief, error } = await supabase
    .from('briefs')
    .select('brief_data, status')
    .eq('id', briefId)
    .single();

  if (error || !brief) {
    throw new Error(`Failed to read brief ${briefId}: ${error?.message || 'not found'}`);
  }

  return {
    briefData: (brief.brief_data as Partial<ContentBrief>) || {},
    currentStatus: (brief.status as string) || 'draft',
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
  const { briefData: currentData, currentStatus } = await readCurrentBriefData(supabase, briefId);

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

  await supabase
    .from('briefs')
    .update(updatePayload)
    .eq('id', briefId);
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
  const params = buildStepParams(config, step);
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
  const params = buildStepParams(config, step);
  const result = await executeBriefStep(params);

  // Merge result into brief_data in DB
  await mergeAndSaveBriefData(supabase, briefId, result, 'in_progress', {
    current_step: step,
  });

  // Determine next step using EXECUTION_ORDER (not sequential)
  const currentIndex = EXECUTION_ORDER.indexOf(step);
  const hasNextStep = currentIndex >= 0 && currentIndex < EXECUTION_ORDER.length - 1;

  if (hasNextStep) {
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
    await supabase
      .from('generation_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id);
  } else {
    // Step 7 — final step. Mark brief as complete (with workflow guard)
    const { currentStatus } = await readCurrentBriefData(supabase, briefId);

    const briefUpdate: Record<string, unknown> = {
      current_step: 7,
      updated_at: new Date().toISOString(),
    };

    if (!WORKFLOW_STATUSES.includes(currentStatus)) {
      briefUpdate.status = 'complete';
    }

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
  });

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
  const config = job.config as Record<string, unknown>;
  const briefId = job.brief_id as string;

  // Read fresh brief data from DB
  const { briefData } = await readCurrentBriefData(supabase, briefId);

  // Model settings
  const modelSettings = (config.model_settings as { model: string; thinkingLevel: string }) ||
    { model: 'gemini-2.5-pro', thinkingLevel: 'high' };

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

  // Progress callback — updates generation_jobs.progress for Realtime
  const onProgress = async (progress: {
    currentSection: string;
    currentIndex: number;
    total: number;
    contentSoFar?: string;
  }) => {
    await updateJobProgress(supabase, job.id, {
      current_section: progress.currentSection,
      current_index: progress.currentIndex,
      total_sections: progress.total,
      percentage: Math.round((progress.currentIndex / progress.total) * 100),
      word_count: progress.contentSoFar ? progress.contentSoFar.split(/\s+/).length : 0,
    });
  };

  // Generate the full article
  const result = await generateFullArticle(articleConfig, onProgress);

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

  // Mark previous versions as not current
  if (latestVersion > 0) {
    await supabase
      .from('brief_articles')
      .update({ is_current: false })
      .eq('brief_id', briefId)
      .eq('is_current', true);
  }

  // Insert new article
  const { error: insertError } = await supabase
    .from('brief_articles')
    .insert({
      brief_id: briefId,
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
  await markJobCompleted(supabase, job.id, briefId, true);
}

// ============================================
// Main Handler
// ============================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    // Find pending jobs, ordered by creation time (FIFO)
    const { data: pendingJobs, error: fetchError } = await supabase
      .from('generation_jobs')
      .select('*')
      .eq('status', 'pending')
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
        JSON.stringify({ processed: 0, message: 'No pending jobs' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: Array<{ job_id: string; status: string; error?: string }> = [];

    for (const job of pendingJobs) {
      // Atomically claim this job — only succeeds if still pending
      const { data: claimed } = await supabase
        .from('generation_jobs')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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

      try {
        // Route to the appropriate handler
        switch (job.job_type) {
          case 'brief_step':
            await processBriefStep(supabase, job);
            break;
          case 'full_brief':
            await processFullBrief(supabase, job);
            break;
          case 'regenerate':
            await processRegenerate(supabase, job);
            break;
          case 'article':
            await processArticle(supabase, job);
            break;
          default:
            throw new Error(`Unsupported job type: ${job.job_type}`);
        }

        results.push({ job_id: job.id, status: 'completed' });
      } catch (err) {
        const error = err as Error;
        console.error(`Job ${job.id} failed:`, error.message);

        const retryCount = ((job.retry_count as number) || 0) + 1;
        const maxRetries = (job.max_retries as number) || 3;

        if (retryCount < maxRetries) {
          // Return to pending for retry
          await supabase
            .from('generation_jobs')
            .update({
              status: 'pending',
              retry_count: retryCount,
              error_message: error.message,
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);
        } else {
          // Max retries exceeded — mark as failed
          await supabase
            .from('generation_jobs')
            .update({
              status: 'failed',
              retry_count: retryCount,
              error_message: error.message,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.id);

          // Clear brief's active_job_id so user can retry
          await supabase
            .from('briefs')
            .update({ active_job_id: null })
            .eq('id', job.brief_id);
        }

        results.push({ job_id: job.id, status: 'error', error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ processed: results.length, results }),
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
