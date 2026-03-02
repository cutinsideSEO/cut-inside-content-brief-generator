// Edge Function: create-generation-batch
// Creates a batch of generation jobs for bulk brief/article generation.
// Supports three modes:
//   - full_pipeline: Create new briefs from keyword groups, then run competitors + full_brief
//   - full_brief: Run full 7-step brief generation on existing briefs
//   - article: Generate articles for existing briefs
//
// verify_jwt: true (user-facing endpoint)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { userHasClientAccess } from '../_shared/generation-guards.ts'

// ============================================
// Types
// ============================================

interface KeywordEntry {
  kw: string;
  volume: number;
}

interface BriefEntry {
  subject_info?: string;
  keywords: KeywordEntry[];
}

interface BatchRequestBody {
  client_id: string;
  user_id: string;
  batch_name?: string;
  generation_type: 'full_pipeline' | 'full_brief' | 'article';
  brief_entries?: BriefEntry[];
  brief_ids?: string[];
  country?: string;
  serp_language?: string;
  output_language?: string;
  model_settings?: { model: string; thinkingLevel: string };
  writer_instructions?: string;
}

// ============================================
// Helpers
// ============================================

/**
 * Snapshot the config needed for a full_brief job from an existing brief row.
 * Mirrors the config-building logic from create-generation-job.
 */
// deno-lint-ignore no-explicit-any
async function snapshotBriefConfig(supabase: any, briefId: string, writerInstructions?: string): Promise<Record<string, unknown>> {
  // Fetch brief with client
  const { data: brief, error: briefError } = await supabase
    .from('briefs')
    .select('*, clients(*)')
    .eq('id', briefId)
    .single()

  if (briefError || !brief) {
    throw new Error(`Brief ${briefId} not found: ${briefError?.message || 'not found'}`)
  }

  if (!brief.client_id) {
    throw new Error(`Brief ${briefId} is missing client_id`)
  }

  // Fetch competitors
  const { data: competitors } = await supabase
    .from('brief_competitors')
    .select('*')
    .eq('brief_id', briefId)
    .order('weighted_score', { ascending: false })

  // Fetch context files (parsed content)
  const { data: contextFiles } = await supabase
    .from('brief_context_files')
    .select('file_name, parsed_content')
    .eq('brief_id', briefId)
    .eq('parse_status', 'done')

  // Fetch context URLs (scraped content)
  const { data: contextUrls } = await supabase
    .from('brief_context_urls')
    .select('url, scraped_content')
    .eq('brief_id', briefId)
    .eq('scrape_status', 'done')

  // Fetch client context files and URLs for brand context
  const { data: clientContextFiles } = await supabase
    .from('client_context_files')
    .select('file_name, parsed_content, category')
    .eq('client_id', brief.client_id)
    .eq('parse_status', 'done')

  const { data: clientContextUrls } = await supabase
    .from('client_context_urls')
    .select('url, scraped_content, label')
    .eq('client_id', brief.client_id)
    .eq('scrape_status', 'done')

  return {
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

    // Related data
    competitors: competitors || [],
    context_files: (contextFiles || []).map((f: { file_name: string; parsed_content: string }) => ({ name: f.file_name, content: f.parsed_content })),
    context_urls: (contextUrls || []).map((u: { url: string; scraped_content: string }) => ({ url: u.url, content: u.scraped_content })),

    // Client brand context
    client: brief.clients ? {
      name: brief.clients.name,
      brand_identity: brief.clients.brand_identity,
      brand_voice: brief.clients.brand_voice,
      target_audience: brief.clients.target_audience,
      content_strategy: brief.clients.content_strategy,
    } : null,
    client_context_files: (clientContextFiles || []).map((f: { file_name: string; parsed_content: string; category: string }) => ({ name: f.file_name, content: f.parsed_content, category: f.category })),
    client_context_urls: (clientContextUrls || []).map((u: { url: string; scraped_content: string; label: string }) => ({ url: u.url, content: u.scraped_content, label: u.label })),

    // Job-specific
    user_feedback: null,
    writer_instructions: writerInstructions || null,
  }
}

// ============================================
// Main Handler
// ============================================

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Parse request
    const body: BatchRequestBody = await req.json()
    const {
      client_id,
      user_id,
      batch_name,
      generation_type,
      brief_entries,
      brief_ids,
      country = 'United States',
      serp_language = 'English',
      output_language = 'English',
      model_settings = { model: 'gemini-3-pro-preview', thinkingLevel: 'high' },
      writer_instructions,
    } = body

    // ---- Validate input ----
    if (!client_id) {
      return new Response(
        JSON.stringify({ error: 'client_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validTypes = ['full_pipeline', 'full_brief', 'article']
    if (!generation_type || !validTypes.includes(generation_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid generation_type: ${generation_type}. Must be one of: ${validTypes.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (generation_type === 'full_pipeline') {
      if (!brief_entries || brief_entries.length === 0) {
        return new Response(
          JSON.stringify({ error: 'brief_entries is required for full_pipeline generation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (brief_entries.length > 50) {
        return new Response(
          JSON.stringify({ error: 'Maximum 50 briefs per batch' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      // Validate each entry has at least one keyword
      for (let i = 0; i < brief_entries.length; i++) {
        if (!brief_entries[i].keywords || brief_entries[i].keywords.length === 0) {
          return new Response(
            JSON.stringify({ error: `brief_entries[${i}] must have at least one keyword` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    } else {
      // full_brief or article — need existing brief_ids
      if (!brief_ids || brief_ids.length === 0) {
        return new Response(
          JSON.stringify({ error: 'brief_ids is required for full_brief or article generation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      if (brief_ids.length > 50) {
        return new Response(
          JSON.stringify({ error: 'Maximum 50 briefs per batch' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Verify client exists
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, name')
      .eq('id', client_id)
      .single()

    if (clientError || !client) {
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate user exists in access_codes
    const { data: accessCode, error: accessError } = await supabase
      .from('access_codes')
      .select('id, is_admin, client_ids')
      .eq('id', user_id)
      .eq('is_active', true)
      .maybeSingle()

    if (accessError || !accessCode) {
      return new Response(
        JSON.stringify({ error: 'Invalid user_id: access code not found or inactive' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate user can create jobs for this client
    if (!userHasClientAccess(accessCode, client_id)) {
      return new Response(
        JSON.stringify({ error: `User ${user_id} does not have access to client ${client_id}` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ---- Determine total job count ----
    let totalJobs = 0
    if (generation_type === 'full_pipeline') {
      // Each brief entry gets: 1 competitors job + 1 full_brief job (chained later)
      totalJobs = brief_entries!.length * 2
    } else {
      // full_brief or article: 1 job per brief
      totalJobs = brief_ids!.length
    }

    // ---- Create the batch row ----
    const { data: batch, error: batchError } = await supabase
      .from('generation_batches')
      .insert({
        client_id,
        created_by: user_id,
        name: batch_name || null,
        total_jobs: totalJobs,
        completed_jobs: 0,
        failed_jobs: 0,
        status: 'running',
      })
      .select('id')
      .single()

    if (batchError || !batch) {
      return new Response(
        JSON.stringify({ error: `Failed to create batch: ${batchError?.message || 'unknown'}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const batchId = batch.id
    const createdBriefIds: string[] = []
    const createdJobIds: string[] = []
    const warnings: string[] = []

    // ---- Process based on generation type ----

    if (generation_type === 'full_pipeline') {
      // Create new briefs and competitors jobs
      for (const entry of brief_entries!) {
        const subjectInfo = entry.subject_info || entry.keywords[0].kw

        // Create the brief row
        const { data: newBrief, error: briefError } = await supabase
          .from('briefs')
          .insert({
            client_id,
            created_by: user_id,
            name: subjectInfo,
            subject_info: subjectInfo,
            brief_data: {
              keyword: entry.keywords[0].kw,
              keywords: entry.keywords,
            },
            keywords: entry.keywords,
            status: 'draft',
            current_view: 'initial_input',
            current_step: 0,
            output_language: output_language,
            serp_language: serp_language,
            serp_country: country,
            model_settings: model_settings,
            stale_steps: [],
            user_feedbacks: {},
            paa_questions: [],
          })
          .select('id')
          .single()

        if (briefError || !newBrief) {
          console.error(`Failed to create brief for "${subjectInfo}":`, briefError?.message)
          warnings.push(`Failed to create brief for "${subjectInfo}": ${briefError?.message || 'unknown'}`)
          continue
        }

        createdBriefIds.push(newBrief.id)

        // Build competitors job config
        const competitorsConfig: Record<string, unknown> = {
          keywords: entry.keywords.map(k => k.kw),
          keyword_volumes: Object.fromEntries(entry.keywords.map(k => [k.kw, k.volume])),
          country,
          serp_language,
          output_language,
        }

        // Create the competitors job
        const { data: compJob, error: compJobError } = await supabase
          .from('generation_jobs')
          .insert({
            brief_id: newBrief.id,
            client_id,
            created_by: user_id,
            job_type: 'competitors',
            step_number: null,
            batch_id: batchId,
            config: competitorsConfig,
            status: 'pending',
            max_retries: 3,
            progress: {
              phase: 'serp',
              completed_keywords: 0,
              total_keywords: entry.keywords.length,
              completed_urls: 0,
              total_urls: 0,
              percentage: 0,
            },
          })
          .select('id')
          .single()

        if (compJobError || !compJob) {
          console.error(`Failed to create competitors job for brief ${newBrief.id}:`, compJobError?.message)
          warnings.push(`Failed to create competitors job for brief "${subjectInfo}": ${compJobError?.message || 'unknown'}`)
          continue
        }

        createdJobIds.push(compJob.id)

        // Set the brief's active_job_id to the competitors job
        await supabase
          .from('briefs')
          .update({ active_job_id: compJob.id })
          .eq('id', newBrief.id)
      }
    } else if (generation_type === 'full_brief') {
      // Create full_brief jobs for existing briefs
      for (const briefId of brief_ids!) {
        // Validate brief exists and has no active job
        const { data: brief, error: briefError } = await supabase
          .from('briefs')
          .select('id, status, active_job_id, client_id')
          .eq('id', briefId)
          .eq('client_id', client_id)
          .single()

        if (briefError || !brief) {
          warnings.push(`Brief ${briefId} not found`)
          continue
        }

        // Skip briefs with active jobs
        if (brief.active_job_id) {
          const { data: activeJob } = await supabase
            .from('generation_jobs')
            .select('id, status')
            .eq('id', brief.active_job_id)
            .in('status', ['pending', 'running'])
            .maybeSingle()

          if (activeJob) {
            warnings.push(`Brief ${briefId} already has an active job (${activeJob.id})`)
            continue
          }
        }

        // Snapshot config from the existing brief
        try {
          const config = await snapshotBriefConfig(supabase, briefId)

          const { data: job, error: jobError } = await supabase
            .from('generation_jobs')
            .insert({
              brief_id: briefId,
              client_id: brief.client_id,
              created_by: user_id,
              job_type: 'full_brief',
              step_number: 1,
              batch_id: batchId,
              config,
              status: 'pending',
              max_retries: 3,
              progress: {
                current_step: 1,
                total_steps: 7,
                step_name: 'Queued',
                percentage: 0,
              },
            })
            .select('id')
            .single()

          if (jobError || !job) {
            warnings.push(`Failed to create full_brief job for brief ${briefId}: ${jobError?.message || 'unknown'}`)
            continue
          }

          createdJobIds.push(job.id)

          // Set the brief's active_job_id
          await supabase
            .from('briefs')
            .update({ active_job_id: job.id })
            .eq('id', briefId)
        } catch (err) {
          warnings.push(`Failed to snapshot config for brief ${briefId}: ${(err as Error).message}`)
        }
      }
    } else if (generation_type === 'article') {
      // Create article jobs for existing briefs
      for (const briefId of brief_ids!) {
        // Validate brief exists and has complete brief_data
        const { data: brief, error: briefError } = await supabase
          .from('briefs')
          .select('id, status, active_job_id, client_id, brief_data')
          .eq('id', briefId)
          .eq('client_id', client_id)
          .single()

        if (briefError || !brief) {
          warnings.push(`Brief ${briefId} not found`)
          continue
        }

        // Skip briefs with active jobs
        if (brief.active_job_id) {
          const { data: activeJob } = await supabase
            .from('generation_jobs')
            .select('id, status')
            .eq('id', brief.active_job_id)
            .in('status', ['pending', 'running'])
            .maybeSingle()

          if (activeJob) {
            warnings.push(`Brief ${briefId} already has an active job (${activeJob.id})`)
            continue
          }
        }

        // Verify brief has enough data for article generation
        const briefData = brief.brief_data || {}
        if (!briefData.article_structure) {
          warnings.push(`Brief ${briefId} does not have an article structure — generate the brief first`)
          continue
        }

        // Snapshot config from the existing brief
        try {
          const config = await snapshotBriefConfig(supabase, briefId, writer_instructions)

          const { data: job, error: jobError } = await supabase
            .from('generation_jobs')
            .insert({
              brief_id: briefId,
              client_id: brief.client_id,
              created_by: user_id,
              job_type: 'article',
              step_number: null,
              batch_id: batchId,
              config,
              status: 'pending',
              max_retries: 6,
              progress: {
                current_section: 'Queued',
                current_index: 0,
                total_sections: 0,
                percentage: 0,
              },
            })
            .select('id')
            .single()

          if (jobError || !job) {
            warnings.push(`Failed to create article job for brief ${briefId}: ${jobError?.message || 'unknown'}`)
            continue
          }

          createdJobIds.push(job.id)

          // Set the brief's active_job_id
          await supabase
            .from('briefs')
            .update({ active_job_id: job.id })
            .eq('id', briefId)
        } catch (err) {
          warnings.push(`Failed to snapshot config for brief ${briefId}: ${(err as Error).message}`)
        }
      }
    }

    // If no jobs were created at all, update the batch to reflect that
    if (createdJobIds.length === 0) {
      await supabase
        .from('generation_batches')
        .update({
          total_jobs: 0,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', batchId)

      return new Response(
        JSON.stringify({
          batch_id: batchId,
          total_jobs: 0,
          created_brief_ids: createdBriefIds,
          warnings,
          error: 'No jobs were created. Check warnings for details.',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update batch total_jobs to actual count (in case some briefs were skipped)
    // For full_pipeline: actual total = created competitors jobs + same number of chained full_brief jobs
    const actualTotalJobs = generation_type === 'full_pipeline'
      ? createdJobIds.length * 2  // competitors + chained full_brief for each
      : createdJobIds.length

    if (actualTotalJobs !== totalJobs) {
      await supabase
        .from('generation_batches')
        .update({ total_jobs: actualTotalJobs })
        .eq('id', batchId)
    }

    const response: Record<string, unknown> = {
      batch_id: batchId,
      total_jobs: actualTotalJobs,
      jobs_created: createdJobIds.length,
    }

    if (createdBriefIds.length > 0) {
      response.created_brief_ids = createdBriefIds
    }

    if (warnings.length > 0) {
      response.warnings = warnings
    }

    return new Response(
      JSON.stringify(response),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('create-generation-batch error:', (err as Error).message)
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
