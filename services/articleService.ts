// Article Service - CRUD operations for generated articles
import { supabase } from './supabaseClient';
import type {
  BriefArticle,
  BriefArticleInsert,
  BriefArticleUpdate,
  ArticleWithBrief,
  ApiResponse,
} from '../types/database';
import type { ModelSettings, LengthConstraints } from '../types';

/**
 * Get all articles for a brief (all versions)
 */
export async function getArticlesForBrief(briefId: string): Promise<ApiResponse<BriefArticle[]>> {
  try {
    const { data, error } = await supabase
      .from('brief_articles')
      .select('*')
      .eq('brief_id', briefId)
      .order('version', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as BriefArticle[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Get the current (latest) article for a brief
 */
export async function getCurrentArticle(briefId: string): Promise<ApiResponse<BriefArticle | null>> {
  try {
    const { data, error } = await supabase
      .from('brief_articles')
      .select('*')
      .eq('brief_id', briefId)
      .eq('is_current', true)
      .single();

    if (error) {
      // No article found is not an error
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      return { data: null, error: error.message };
    }

    return { data: data as BriefArticle, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Get a specific article by ID
 */
export async function getArticle(articleId: string): Promise<ApiResponse<BriefArticle>> {
  try {
    const { data, error } = await supabase
      .from('brief_articles')
      .select('*')
      .eq('id', articleId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as BriefArticle, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Get an article by version number
 */
export async function getArticleByVersion(
  briefId: string,
  version: number
): Promise<ApiResponse<BriefArticle>> {
  try {
    const { data, error } = await supabase
      .from('brief_articles')
      .select('*')
      .eq('brief_id', briefId)
      .eq('version', version)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as BriefArticle, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Create a new article (new version)
 */
export async function createArticle(
  briefId: string,
  title: string,
  content: string,
  settings?: {
    model_settings?: ModelSettings;
    length_constraints?: LengthConstraints;
    writer_instructions?: string;
  }
): Promise<ApiResponse<BriefArticle>> {
  try {
    // Get the latest version number for this brief
    const { data: existingArticles } = await supabase
      .from('brief_articles')
      .select('version')
      .eq('brief_id', briefId)
      .order('version', { ascending: false })
      .limit(1);

    const latestVersion = existingArticles?.[0]?.version || 0;
    const newVersion = latestVersion + 1;

    const newArticle: BriefArticleInsert = {
      brief_id: briefId,
      title,
      content,
      version: newVersion,
      is_current: true,
      generation_settings: settings ? {
        model_settings: settings.model_settings,
        length_constraints: settings.length_constraints,
      } : null,
      writer_instructions: settings?.writer_instructions || null,
    };

    const { data, error } = await supabase
      .from('brief_articles')
      .insert(newArticle)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    // The trigger will automatically mark previous versions as not current

    return { data: data as BriefArticle, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Update an existing article
 */
export async function updateArticle(
  articleId: string,
  updates: BriefArticleUpdate
): Promise<ApiResponse<BriefArticle>> {
  try {
    const { data, error } = await supabase
      .from('brief_articles')
      .update(updates)
      .eq('id', articleId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as BriefArticle, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Update article content (for edits after generation)
 */
export async function updateArticleContent(
  articleId: string,
  title: string,
  content: string
): Promise<ApiResponse<BriefArticle>> {
  return updateArticle(articleId, { title, content });
}

/**
 * Set a specific version as the current article
 */
export async function setCurrentArticle(
  briefId: string,
  articleId: string
): Promise<ApiResponse<BriefArticle>> {
  try {
    // Set the target article as current first (safe: if this fails, nothing changes)
    const { data, error: setError } = await supabase
      .from('brief_articles')
      .update({ is_current: true })
      .eq('id', articleId)
      .select()
      .single();

    if (setError) {
      return { data: null, error: setError.message };
    }

    // Then clear all other articles for this brief (safe: target is already set)
    await supabase
      .from('brief_articles')
      .update({ is_current: false })
      .eq('brief_id', briefId)
      .neq('id', articleId);

    return { data: data as BriefArticle, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Delete an article
 */
export async function deleteArticle(articleId: string): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('brief_articles')
      .delete()
      .eq('id', articleId);

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
 * Delete all articles for a brief except the current one
 */
export async function deleteOldArticleVersions(briefId: string): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('brief_articles')
      .delete()
      .eq('brief_id', briefId)
      .eq('is_current', false);

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
 * Get article version count
 */
export async function getArticleVersionCount(briefId: string): Promise<number> {
  const { count } = await supabase
    .from('brief_articles')
    .select('*', { count: 'exact', head: true })
    .eq('brief_id', briefId);

  return count || 0;
}

/**
 * Get all articles for a client (across all briefs)
 */
export async function getArticlesForClient(clientId: string): Promise<ApiResponse<ArticleWithBrief[]>> {
  try {
    const { data, error } = await supabase
      .from('brief_articles')
      .select(`
        *,
        brief:briefs!inner(name, status, client_id)
      `)
      .eq('brief.client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    // Transform to flatten the brief join
    const articles: ArticleWithBrief[] = (data || []).map((item: any) => ({
      id: item.id,
      brief_id: item.brief_id,
      title: item.title,
      content: item.content,
      version: item.version,
      is_current: item.is_current,
      generation_settings: item.generation_settings,
      writer_instructions: item.writer_instructions,
      created_at: item.created_at,
      brief_name: item.brief?.name || 'Unknown Brief',
      brief_status: item.brief?.status || 'draft',
    }));

    return { data: articles, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Get total article count for a client
 */
export async function getArticleCountForClient(clientId: string): Promise<number> {
  try {
    const { count } = await supabase
      .from('brief_articles')
      .select('*, brief:briefs!inner(client_id)', { count: 'exact', head: true })
      .eq('brief.client_id', clientId);
    return count || 0;
  } catch {
    return 0;
  }
}
