// Competitor Service - CRUD operations for brief competitors
import { supabase } from './supabaseClient';
import type {
  BriefCompetitor,
  BriefCompetitorInsert,
  BriefCompetitorUpdate,
  ApiResponse,
} from '../types/database';
import type { CompetitorPage, CompetitorRanking } from '../types';

/**
 * Get all competitors for a brief
 */
export async function getCompetitorsForBrief(briefId: string): Promise<ApiResponse<BriefCompetitor[]>> {
  try {
    const { data, error } = await supabase
      .from('brief_competitors')
      .select('*')
      .eq('brief_id', briefId)
      .order('weighted_score', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as BriefCompetitor[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Save competitors for a brief (bulk insert/replace)
 */
export async function saveCompetitors(
  briefId: string,
  competitors: CompetitorPage[]
): Promise<ApiResponse<BriefCompetitor[]>> {
  try {
    // First, delete existing competitors for this brief
    await supabase
      .from('brief_competitors')
      .delete()
      .eq('brief_id', briefId);

    // Convert CompetitorPage[] to BriefCompetitorInsert[]
    const competitorInserts: BriefCompetitorInsert[] = competitors.map((comp) => ({
      brief_id: briefId,
      url: comp.URL,
      weighted_score: comp.Weighted_Score,
      rankings: comp.rankings as CompetitorRanking[],
      h1s: comp.H1s,
      h2s: comp.H2s,
      h3s: comp.H3s,
      word_count: comp.Word_Count,
      full_text: comp.Full_Text,
      is_starred: comp.is_starred || false,
    }));

    // Insert new competitors
    const { data, error } = await supabase
      .from('brief_competitors')
      .insert(competitorInserts)
      .select();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as BriefCompetitor[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Toggle star status for a competitor
 */
export async function toggleCompetitorStar(competitorId: string): Promise<ApiResponse<BriefCompetitor>> {
  try {
    // Get current status
    const { data: current, error: fetchError } = await supabase
      .from('brief_competitors')
      .select('is_starred')
      .eq('id', competitorId)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError.message };
    }

    // Toggle the status
    const { data, error } = await supabase
      .from('brief_competitors')
      .update({ is_starred: !current.is_starred })
      .eq('id', competitorId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as BriefCompetitor, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Update a competitor
 */
export async function updateCompetitor(
  competitorId: string,
  updates: BriefCompetitorUpdate
): Promise<ApiResponse<BriefCompetitor>> {
  try {
    const { data, error } = await supabase
      .from('brief_competitors')
      .update(updates)
      .eq('id', competitorId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as BriefCompetitor, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Convert BriefCompetitor[] back to CompetitorPage[] format for the app
 */
export function toCompetitorPages(competitors: BriefCompetitor[]): CompetitorPage[] {
  return competitors.map((comp) => ({
    URL: comp.url,
    Weighted_Score: comp.weighted_score || 0,
    rankings: (comp.rankings || []) as CompetitorRanking[],
    H1s: comp.h1s || [],
    H2s: comp.h2s || [],
    H3s: comp.h3s || [],
    Word_Count: comp.word_count || 0,
    Full_Text: comp.full_text || '',
    is_starred: comp.is_starred,
  }));
}

/**
 * Delete a competitor
 */
export async function deleteCompetitor(competitorId: string): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('brief_competitors')
      .delete()
      .eq('id', competitorId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}
