import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { userHasClientAccess } from '../_shared/generation-guards.ts'

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
    const { brief_id, job_type, step_number, batch_id, user_id, user_feedback, writer_instructions, keywords, keyword_volumes, country, serp_language, output_language } = await req.json()

    // Validate required fields
    if (!brief_id || !job_type) {
      return new Response(
        JSON.stringify({ error: 'brief_id and job_type are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate job_type
    const validJobTypes = ['competitors', 'brief_step', 'full_brief', 'regenerate', 'article']
    if (!validJobTypes.includes(job_type)) {
      return new Response(
        JSON.stringify({ error: `Invalid job_type: ${job_type}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate step_number for step-based job types
    if ((job_type === 'brief_step' || job_type === 'regenerate') && (!step_number || step_number < 1 || step_number > 7)) {
      return new Response(
        JSON.stringify({ error: 'step_number (1-7) is required for brief_step and regenerate job types' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check for existing active job on this brief
    const { data: existingJob } = await supabase
      .from('generation_jobs')
      .select('id, status, job_type')
      .eq('brief_id', brief_id)
      .in('status', ['pending', 'running'])
      .limit(1)
      .maybeSingle()

    if (existingJob) {
      return new Response(
        JSON.stringify({ error: 'Brief already has an active generation job', existing_job_id: existingJob.id }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch brief with all related data to snapshot into config
    const { data: brief, error: briefError } = await supabase
      .from('briefs')
      .select('*, clients(*)')
      .eq('id', brief_id)
      .single()

    if (briefError || !brief) {
      return new Response(
        JSON.stringify({ error: 'Brief not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate user ownership
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user exists and is active
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

    // Validate user has access to this brief's client
    if (!userHasClientAccess(accessCode, brief.client_id)) {
      return new Response(
        JSON.stringify({ error: `User does not have access to client ${brief.client_id}` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch competitors
    const { data: competitors } = await supabase
      .from('brief_competitors')
      .select('*')
      .eq('brief_id', brief_id)
      .order('weighted_score', { ascending: false })

    // Fetch context files (parsed content)
    const { data: contextFiles } = await supabase
      .from('brief_context_files')
      .select('file_name, parsed_content')
      .eq('brief_id', brief_id)
      .eq('parse_status', 'done')

    // Fetch context URLs (scraped content)
    const { data: contextUrls } = await supabase
      .from('brief_context_urls')
      .select('url, scraped_content')
      .eq('brief_id', brief_id)
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

    // Build config snapshot — everything the worker needs to run generation
    const config: Record<string, unknown> = {
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
      user_feedback: user_feedback || null,
      writer_instructions: writer_instructions || null,
    }

    // For competitors jobs, override the config with competitor-specific fields
    if (job_type === 'competitors') {
      config.keywords = keywords || (brief.keywords as Array<{ kw: string; volume: number }> || []).map((k: { kw: string }) => k.kw);
      config.keyword_volumes = keyword_volumes || {};
      // If keyword_volumes not provided, build from brief.keywords
      if (!keyword_volumes && brief.keywords) {
        const volumes: Record<string, number> = {};
        for (const k of (brief.keywords as Array<{ kw: string; volume: number }>)) {
          volumes[k.kw] = k.volume;
        }
        config.keyword_volumes = volumes;
      }
      config.country = country || brief.serp_country || 'United States';
      config.serp_language = serp_language || brief.serp_language || 'English';
      config.output_language = output_language || brief.output_language || 'English';
    }

    // Determine initial step_number
    let initialStep = step_number || null
    if (job_type === 'full_brief' && !initialStep) {
      initialStep = 1 // Start from step 1
    }

    // Create the job
    const { data: job, error: jobError } = await supabase
      .from('generation_jobs')
      .insert({
        brief_id,
        client_id: brief.client_id,
        created_by: user_id,
        batch_id: batch_id || null,
        job_type,
        step_number: initialStep,
        config,
        status: 'pending',
        progress: job_type === 'competitors'
          ? { phase: 'serp', completed_keywords: 0, total_keywords: (config.keywords as string[] || []).length, completed_urls: 0, total_urls: 0, percentage: 0 }
          : job_type === 'full_brief'
          ? { current_step: initialStep, total_steps: 7, step_name: 'Queued' }
          : job_type === 'article'
          ? { current_section: 'Queued', current_index: 0, total_sections: 0, percentage: 0 }
          : {},
      })
      .select('id')
      .single()

    if (jobError) {
      return new Response(
        JSON.stringify({ error: `Failed to create job: ${jobError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update brief's active_job_id
    await supabase
      .from('briefs')
      .update({ active_job_id: job.id })
      .eq('id', brief_id)

    return new Response(
      JSON.stringify({ job_id: job.id, status: 'pending' }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
