// Batch Generation Service - CRUD operations for bulk generation batches
import { supabase } from './supabaseClient';
import type { GenerationBatch } from '../types/database';

/** A group of keywords that will become a single brief */
export interface BriefKeywordGroup {
  subjectInfo?: string;
  keywords: Array<{ kw: string; volume: number }>;
}

/** Options for creating a generation batch */
export interface CreateBatchOptions {
  clientId: string;
  batchName?: string;
  generationType: 'full_pipeline' | 'full_brief' | 'article';

  // For full_pipeline (new briefs from keyword groups)
  briefEntries?: BriefKeywordGroup[];
  country?: string;
  serpLanguage?: string;
  outputLanguage?: string;
  modelSettings?: { model: string; thinkingLevel: string };

  // For full_brief/article (existing briefs)
  briefIds?: string[];
  writerInstructions?: string;
}

/** Result from creating a generation batch */
export interface CreateBatchResult {
  batchId: string;
  totalJobs: number;
  createdBriefIds?: string[];
}

/** Create a bulk generation batch via Edge Function */
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
