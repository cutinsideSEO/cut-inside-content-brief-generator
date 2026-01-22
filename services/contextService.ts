// Context Service - Manage context files and URLs for briefs
import { supabase } from './supabaseClient';
import type {
  BriefContextFile,
  BriefContextFileInsert,
  BriefContextFileUpdate,
  BriefContextUrl,
  BriefContextUrlInsert,
  BriefContextUrlUpdate,
  ParseStatus,
  ScrapeStatus,
  ApiResponse,
} from '../types/database';

// ============================================
// Context Files
// ============================================

/**
 * Get all context files for a brief
 */
export async function getContextFilesForBrief(briefId: string): Promise<ApiResponse<BriefContextFile[]>> {
  try {
    const { data, error } = await supabase
      .from('brief_context_files')
      .select('*')
      .eq('brief_id', briefId)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as BriefContextFile[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Upload a file to storage and create a context file record
 */
export async function uploadContextFile(
  briefId: string,
  file: File,
  parsedContent?: string
): Promise<ApiResponse<BriefContextFile>> {
  try {
    const storagePath = `${briefId}/${Date.now()}-${file.name}`;

    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase
      .storage
      .from('context-files')
      .upload(storagePath, file);

    if (uploadError) {
      return { data: null, error: `Upload failed: ${uploadError.message}` };
    }

    // Create database record
    const contextFile: BriefContextFileInsert = {
      brief_id: briefId,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type || file.name.split('.').pop() || 'unknown',
      storage_path: storagePath,
      parsed_content: parsedContent || null,
      parse_status: parsedContent ? 'done' : 'pending',
      parse_error: null,
    };

    const { data, error } = await supabase
      .from('brief_context_files')
      .insert(contextFile)
      .select()
      .single();

    if (error) {
      // Clean up uploaded file if database insert fails
      await supabase.storage.from('context-files').remove([storagePath]);
      return { data: null, error: error.message };
    }

    return { data: data as BriefContextFile, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Update context file parse status and content
 */
export async function updateContextFileParse(
  fileId: string,
  status: ParseStatus,
  content?: string,
  error?: string
): Promise<ApiResponse<BriefContextFile>> {
  try {
    const updates: BriefContextFileUpdate = {
      parse_status: status,
      parsed_content: content || null,
      parse_error: error || null,
    };

    const { data, error: dbError } = await supabase
      .from('brief_context_files')
      .update(updates)
      .eq('id', fileId)
      .select()
      .single();

    if (dbError) {
      return { data: null, error: dbError.message };
    }

    return { data: data as BriefContextFile, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Delete a context file (from storage and database)
 */
export async function deleteContextFile(fileId: string): Promise<ApiResponse<boolean>> {
  try {
    // Get the file record to find the storage path
    const { data: file, error: fetchError } = await supabase
      .from('brief_context_files')
      .select('storage_path')
      .eq('id', fileId)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError.message };
    }

    // Delete from storage
    if (file?.storage_path) {
      await supabase.storage.from('context-files').remove([file.storage_path]);
    }

    // Delete from database
    const { error } = await supabase
      .from('brief_context_files')
      .delete()
      .eq('id', fileId);

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
 * Get download URL for a context file
 */
export async function getContextFileUrl(storagePath: string): Promise<string | null> {
  const { data } = await supabase
    .storage
    .from('context-files')
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  return data?.signedUrl || null;
}

// ============================================
// Context URLs
// ============================================

/**
 * Get all context URLs for a brief
 */
export async function getContextUrlsForBrief(briefId: string): Promise<ApiResponse<BriefContextUrl[]>> {
  try {
    const { data, error } = await supabase
      .from('brief_context_urls')
      .select('*')
      .eq('brief_id', briefId)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as BriefContextUrl[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Add a context URL
 */
export async function addContextUrl(
  briefId: string,
  url: string,
  scrapedContent?: string
): Promise<ApiResponse<BriefContextUrl>> {
  try {
    const contextUrl: BriefContextUrlInsert = {
      brief_id: briefId,
      url,
      scraped_content: scrapedContent || null,
      scrape_status: scrapedContent ? 'done' : 'pending',
      scrape_error: null,
    };

    const { data, error } = await supabase
      .from('brief_context_urls')
      .insert(contextUrl)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as BriefContextUrl, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Update context URL scrape status and content
 */
export async function updateContextUrlScrape(
  urlId: string,
  status: ScrapeStatus,
  content?: string,
  error?: string
): Promise<ApiResponse<BriefContextUrl>> {
  try {
    const updates: BriefContextUrlUpdate = {
      scrape_status: status,
      scraped_content: content || null,
      scrape_error: error || null,
    };

    const { data, error: dbError } = await supabase
      .from('brief_context_urls')
      .update(updates)
      .eq('id', urlId)
      .select()
      .single();

    if (dbError) {
      return { data: null, error: dbError.message };
    }

    return { data: data as BriefContextUrl, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Delete a context URL
 */
export async function deleteContextUrl(urlId: string): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('brief_context_urls')
      .delete()
      .eq('id', urlId);

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

// ============================================
// Bulk Operations
// ============================================

/**
 * Save all context files for a brief (bulk)
 */
export async function saveContextFiles(
  briefId: string,
  files: Array<{ file: File; content: string | null; error: string | null; status: ParseStatus }>
): Promise<ApiResponse<BriefContextFile[]>> {
  const results: BriefContextFile[] = [];
  const errors: string[] = [];

  for (const { file, content, error, status } of files) {
    const result = await uploadContextFile(briefId, file, content || undefined);
    if (result.data) {
      // Update status if needed
      if (status !== 'pending' && status !== 'done') {
        await updateContextFileParse(result.data.id, status, content || undefined, error || undefined);
      }
      results.push(result.data);
    } else if (result.error) {
      errors.push(`${file.name}: ${result.error}`);
    }
  }

  if (errors.length > 0) {
    return { data: results, error: errors.join('; ') };
  }

  return { data: results, error: null };
}

/**
 * Save all context URLs for a brief (bulk)
 */
export async function saveContextUrls(
  briefId: string,
  urls: Array<{ url: string; content: string | null; error: string | null; status: ScrapeStatus }>
): Promise<ApiResponse<BriefContextUrl[]>> {
  const results: BriefContextUrl[] = [];
  const errors: string[] = [];

  for (const { url, content, error, status } of urls) {
    const result = await addContextUrl(briefId, url, content || undefined);
    if (result.data) {
      // Update status if needed
      if (status !== 'pending' && status !== 'done') {
        await updateContextUrlScrape(result.data.id, status, content || undefined, error || undefined);
      }
      results.push(result.data);
    } else if (result.error) {
      errors.push(`${url}: ${result.error}`);
    }
  }

  if (errors.length > 0) {
    return { data: results, error: errors.join('; ') };
  }

  return { data: results, error: null };
}
