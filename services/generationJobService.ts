// Generation Job Service - CRUD operations for server-side generation jobs
import { supabase } from './supabaseClient';
import type { GenerationJob, GenerationJobType, GenerationBatch } from '../types/database';

/**
 * Create a generation job by calling the create-generation-job Edge Function.
 * The Edge Function snapshots the brief's current state into the job config.
 */
export async function createGenerationJob(
  briefId: string,
  jobType: GenerationJobType,
  options?: {
    stepNumber?: number;
    userFeedback?: string;
    writerInstructions?: string;
    // Competitor analysis options
    keywords?: string[];
    keywordVolumes?: Record<string, number>;
    country?: string;
    serpLanguage?: string;
    outputLanguage?: string;
  }
): Promise<{ jobId: string }> {
  const { data, error } = await supabase.functions.invoke('create-generation-job', {
    body: {
      brief_id: briefId,
      job_type: jobType,
      step_number: options?.stepNumber,
      user_feedback: options?.userFeedback,
      writer_instructions: options?.writerInstructions,
      // Competitor analysis fields
      keywords: options?.keywords,
      keyword_volumes: options?.keywordVolumes,
      country: options?.country,
      serp_language: options?.serpLanguage,
      output_language: options?.outputLanguage,
    },
  });

  if (error) throw new Error(`Failed to create generation job: ${error.message}`);
  return { jobId: data.job_id };
}

/**
 * Cancel an active generation job.
 * Also clears the brief's active_job_id pointer so it doesn't remain stale.
 */
export async function cancelGenerationJob(jobId: string): Promise<void> {
  const { data: targetJob, error: targetJobError } = await supabase
    .from('generation_jobs')
    .select('id, brief_id, batch_id')
    .eq('id', jobId)
    .single();

  if (targetJobError || !targetJob) {
    throw new Error(`Failed to load job for cancellation: ${targetJobError?.message || 'not found'}`);
  }

  let cancelQuery = supabase
    .from('generation_jobs')
    .update({
      status: 'cancelled',
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('brief_id', targetJob.brief_id)
    .in('status', ['pending', 'running']);

  if (targetJob.batch_id) {
    cancelQuery = cancelQuery.eq('batch_id', targetJob.batch_id);
  }

  const { error } = await cancelQuery;

  if (error) throw new Error(`Failed to cancel job: ${error.message}`);

  const { data: activeJob, error: activeJobError } = await supabase
    .from('generation_jobs')
    .select('id')
    .eq('brief_id', targetJob.brief_id)
    .in('status', ['pending', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Clear the stale active_job_id pointer on the brief.
  // This is best-effort — the cancellation itself already succeeded above,
  // so we log a warning rather than throwing if the brief update fails.
  const { error: briefError } = await supabase
    .from('briefs')
    .update({ active_job_id: activeJob?.id ?? null })
    .eq('id', targetJob.brief_id);

  if (activeJobError || briefError) {
    console.warn(
      `Job ${jobId} cancelled, but failed to clear briefs.active_job_id: ${briefError?.message || activeJobError?.message}`
    );
  }
}

/**
 * Get the active (pending or running) job for a brief, if any.
 */
export async function getActiveJobForBrief(briefId: string): Promise<GenerationJob | null> {
  const { data, error } = await supabase
    .from('generation_jobs')
    .select('*')
    .eq('brief_id', briefId)
    .in('status', ['pending', 'running'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Failed to get active job: ${error.message}`);
  return data;
}

/**
 * Get all jobs for a brief (for history/debugging).
 */
export async function getJobsForBrief(briefId: string): Promise<GenerationJob[]> {
  const { data, error } = await supabase
    .from('generation_jobs')
    .select('*')
    .eq('brief_id', briefId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to get jobs: ${error.message}`);
  return data || [];
}

/**
 * Get batch progress.
 */
export async function getBatchProgress(batchId: string): Promise<GenerationBatch | null> {
  const { data, error } = await supabase
    .from('generation_batches')
    .select('*')
    .eq('id', batchId)
    .maybeSingle();

  if (error) throw new Error(`Failed to get batch: ${error.message}`);
  return data;
}
