// Brief Service - CRUD operations for briefs
import { supabase } from './supabaseClient';
import { getCurrentUserId } from './authService';
import type {
  Brief,
  BriefInsert,
  BriefUpdate,
  BriefWithClient,
  BriefWithRelations,
  BriefStatus,
  AppView,
  KeywordInput,
  ApiResponse,
} from '../types/database';
import type { ContentBrief, ModelSettings, LengthConstraints, ExtractedTemplate } from '../types';

/**
 * Get all briefs for a specific client
 */
export async function getBriefsForClient(clientId: string): Promise<ApiResponse<BriefWithClient[]>> {
  try {
    const { data, error } = await supabase
      .from('briefs')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('client_id', clientId)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as BriefWithClient[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Get a single brief by ID
 */
export async function getBrief(briefId: string): Promise<ApiResponse<Brief>> {
  try {
    const { data, error } = await supabase
      .from('briefs')
      .select('*')
      .eq('id', briefId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    // Update last accessed timestamp
    await supabase
      .from('briefs')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', briefId);

    return { data: data as Brief, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Get a brief with all related data (competitors, context files, URLs, articles)
 */
export async function getBriefWithRelations(briefId: string): Promise<ApiResponse<BriefWithRelations>> {
  try {
    const { data, error } = await supabase
      .from('briefs')
      .select(`
        *,
        client:clients(*),
        competitors:brief_competitors(*),
        context_files:brief_context_files(*),
        context_urls:brief_context_urls(*),
        articles:brief_articles(*)
      `)
      .eq('id', briefId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    // Update last accessed timestamp
    await supabase
      .from('briefs')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', briefId);

    return { data: data as BriefWithRelations, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Create a new brief
 */
export async function createBrief(
  clientId: string,
  name: string,
  initialData?: Partial<{
    keywords: KeywordInput[];
    subject_info: string;
    brand_info: string;
    output_language: string;
    serp_language: string;
    serp_country: string;
    model_settings: ModelSettings;
    length_constraints: LengthConstraints;
    template_url: string;
  }>
): Promise<ApiResponse<Brief>> {
  const userId = getCurrentUserId();
  if (!userId) {
    return { data: null, error: 'Not authenticated' };
  }

  try {
    const newBrief: BriefInsert = {
      client_id: clientId,
      created_by: userId,
      name,
      status: 'draft',
      current_view: 'initial_input',
      current_step: 1,
      keywords: initialData?.keywords || null,
      subject_info: initialData?.subject_info || null,
      brand_info: initialData?.brand_info || null,
      output_language: initialData?.output_language || 'English',
      serp_language: initialData?.serp_language || 'English',
      serp_country: initialData?.serp_country || 'United States',
      model_settings: initialData?.model_settings || null,
      length_constraints: initialData?.length_constraints || null,
      template_url: initialData?.template_url || null,
      extracted_template: null,
      brief_data: {},
      stale_steps: [],
      user_feedbacks: {},
      paa_questions: [],
    };

    const { data, error } = await supabase
      .from('briefs')
      .insert(newBrief)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Brief, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Update a brief
 */
export async function updateBrief(
  briefId: string,
  updates: BriefUpdate
): Promise<ApiResponse<Brief>> {
  try {
    const { data, error } = await supabase
      .from('briefs')
      .update(updates)
      .eq('id', briefId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Brief, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Update brief status
 */
export async function updateBriefStatus(
  briefId: string,
  status: BriefStatus
): Promise<ApiResponse<Brief>> {
  return updateBrief(briefId, { status });
}

/**
 * Update brief view and step (for resume functionality)
 */
export async function updateBriefProgress(
  briefId: string,
  currentView: AppView,
  currentStep: number
): Promise<ApiResponse<Brief>> {
  return updateBrief(briefId, {
    current_view: currentView,
    current_step: currentStep,
    status: 'in_progress',
  });
}

/**
 * Save brief data (the generated ContentBrief)
 */
export async function saveBriefData(
  briefId: string,
  briefData: Partial<ContentBrief>
): Promise<ApiResponse<Brief>> {
  return updateBrief(briefId, { brief_data: briefData });
}

/**
 * Save complete brief state (for auto-save)
 */
export async function saveBriefState(
  briefId: string,
  state: {
    current_view?: AppView;
    current_step?: number;
    brief_data?: Partial<ContentBrief>;
    stale_steps?: number[];
    user_feedbacks?: { [key: number]: string };
    paa_questions?: string[];
    subject_info?: string;
    brand_info?: string;
    extracted_template?: ExtractedTemplate | null;
  }
): Promise<ApiResponse<Brief>> {
  return updateBrief(briefId, state);
}

/**
 * Archive a brief (soft delete)
 */
export async function archiveBrief(briefId: string): Promise<ApiResponse<Brief>> {
  return updateBrief(briefId, { status: 'archived' });
}

/**
 * Delete a brief permanently
 */
export async function deleteBrief(briefId: string): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('briefs')
      .delete()
      .eq('id', briefId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Clone a brief as a template for a new brief
 */
export async function cloneBriefAsTemplate(
  sourceBriefId: string,
  newClientId: string,
  newName: string
): Promise<ApiResponse<Brief>> {
  const userId = getCurrentUserId();
  if (!userId) {
    return { data: null, error: 'Not authenticated' };
  }

  try {
    // Get the source brief
    const { data: sourceBrief, error: fetchError } = await getBrief(sourceBriefId);
    if (fetchError || !sourceBrief) {
      return { data: null, error: fetchError || 'Source brief not found' };
    }

    // Create new brief with structure from source
    const newBrief: BriefInsert = {
      client_id: newClientId,
      created_by: userId,
      name: newName,
      status: 'draft',
      current_view: 'initial_input',
      current_step: 1,
      keywords: null, // User will provide new keywords
      subject_info: null,
      brand_info: sourceBrief.brand_info, // Keep brand info
      output_language: sourceBrief.output_language,
      serp_language: sourceBrief.serp_language,
      serp_country: sourceBrief.serp_country,
      model_settings: sourceBrief.model_settings,
      length_constraints: sourceBrief.length_constraints,
      template_url: null,
      // Clone the article structure as a template
      extracted_template: sourceBrief.brief_data?.article_structure ? {
        sourceUrl: `brief:${sourceBriefId}`,
        headingStructure: [], // Will be populated during generation
        extractedAt: new Date(),
      } : null,
      brief_data: {}, // Start fresh, but could optionally copy structure
      stale_steps: [],
      user_feedbacks: {},
      paa_questions: [],
    };

    const { data, error } = await supabase
      .from('briefs')
      .insert(newBrief)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Brief, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Get recent briefs across all clients (for dashboard)
 */
export async function getRecentBriefs(limit: number = 10): Promise<ApiResponse<BriefWithClient[]>> {
  try {
    const { data, error } = await supabase
      .from('briefs')
      .select(`
        *,
        client:clients(*)
      `)
      .neq('status', 'archived')
      .order('last_accessed_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as BriefWithClient[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Search briefs by name
 */
export async function searchBriefs(
  query: string,
  clientId?: string
): Promise<ApiResponse<BriefWithClient[]>> {
  try {
    let dbQuery = supabase
      .from('briefs')
      .select(`
        *,
        client:clients(*)
      `)
      .ilike('name', `%${query}%`)
      .neq('status', 'archived')
      .order('updated_at', { ascending: false })
      .limit(20);

    if (clientId) {
      dbQuery = dbQuery.eq('client_id', clientId);
    }

    const { data, error } = await dbQuery;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as BriefWithClient[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}
