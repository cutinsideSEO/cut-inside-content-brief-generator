// Edge Function: dataforseo-proxy
// Proxies DataForSEO on-page API calls so frontend doesn't need credentials.
// verify_jwt: true — requires Supabase anon key auth.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { getOnPageElements } from '../_shared/dataforseo-client.ts'

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, url, user_id } = await req.json()

    if (!action || !url) {
      return new Response(
        JSON.stringify({ error: 'action and url are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action !== 'on_page_elements') {
      return new Response(
        JSON.stringify({ error: `Unsupported action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate user_id if provided (defense in depth — JWT already verified)
    if (user_id) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      const { data: accessCode } = await supabase
        .from('access_codes')
        .select('id')
        .eq('id', user_id)
        .eq('is_active', true)
        .maybeSingle()

      if (!accessCode) {
        return new Response(
          JSON.stringify({ error: 'Invalid user_id' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Call DataForSEO via the shared client (uses server-side credentials)
    // getOnPageElements takes a single URL string and returns OnPageElements
    const result = await getOnPageElements(url)

    return new Response(
      JSON.stringify({ data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
