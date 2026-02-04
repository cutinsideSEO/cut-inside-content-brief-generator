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
 * Save competitors for a brief using upsert pattern
 * This prevents data loss compared to delete-all + insert
 * Requires unique index on (brief_id, url) - see migrations/001_add_competitor_unique_constraint.sql
 */
export async function saveCompetitors(
  briefId: string,
  competitors: CompetitorPage[]
): Promise<ApiResponse<BriefCompetitor[]>> {
  try {
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

    // Use upsert to insert or update competitors
    // onConflict on (brief_id, url) requires the unique index from migration
    const { data, error } = await supabase
      .from('brief_competitors')
      .upsert(competitorInserts, {
        onConflict: 'brief_id,url',
        ignoreDuplicates: false, // Update existing records
      })
      .select();

    if (error) {
      // If the unique constraint doesn't exist yet, fall back to delete + insert
      if (error.message.includes('unique') || error.message.includes('constraint')) {
        console.warn('Upsert failed, falling back to delete + insert:', error.message);

        // Delete existing competitors
        await supabase
          .from('brief_competitors')
          .delete()
          .eq('brief_id', briefId);

        // Insert new competitors
        const { data: insertData, error: insertError } = await supabase
          .from('brief_competitors')
          .insert(competitorInserts)
          .select();

        if (insertError) {
          return { data: null, error: insertError.message };
        }

        return { data: insertData as BriefCompetitor[], error: null };
      }
      return { data: null, error: error.message };
    }

    // Remove competitors that are no longer in the list
    const currentUrls = competitors.map((c) => c.URL);
    await supabase
      .from('brief_competitors')
      .delete()
      .eq('brief_id', briefId)
      .not('url', 'in', `(${currentUrls.map((u) => `"${u.replace(/"/g, '\\"')}"`).join(',')})`);

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
