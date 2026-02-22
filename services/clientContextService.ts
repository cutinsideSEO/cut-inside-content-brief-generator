// Client Context Service - CRUD for client-level context files and URLs
import { supabase } from './supabaseClient';
import type { ApiResponse } from '../types/database';
import type {
  ClientContextFile,
  ClientContextFileInsert,
  ClientContextFileUpdate,
  ClientContextUrl,
  ClientContextUrlInsert,
  ClientContextUrlUpdate,
  ContextFileCategory,
} from '../types/clientProfile';

// ============================================
// Client Context Files
// ============================================

export async function getClientContextFiles(clientId: string): Promise<ApiResponse<ClientContextFile[]>> {
  try {
    const { data, error } = await supabase
      .from('client_context_files')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as ClientContextFile[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

export async function uploadClientContextFile(
  clientId: string,
  file: File,
  category: ContextFileCategory = 'general',
  description?: string,
  parsedContent?: string
): Promise<ApiResponse<ClientContextFile>> {
  try {
    const storagePath = `clients/${clientId}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase
      .storage
      .from('client-context-files')
      .upload(storagePath, file);

    if (uploadError) {
      return { data: null, error: `Upload failed: ${uploadError.message}` };
    }

    const contextFile: ClientContextFileInsert = {
      client_id: clientId,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type || file.name.split('.').pop() || 'unknown',
      storage_path: storagePath,
      parsed_content: parsedContent || null,
      parse_status: parsedContent ? 'done' : 'pending',
      parse_error: null,
      category,
      description: description || null,
    };

    const { data, error } = await supabase
      .from('client_context_files')
      .insert(contextFile)
      .select()
      .single();

    if (error) {
      await supabase.storage.from('client-context-files').remove([storagePath]);
      return { data: null, error: error.message };
    }

    return { data: data as ClientContextFile, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

export async function updateClientContextFile(
  fileId: string,
  updates: ClientContextFileUpdate
): Promise<ApiResponse<ClientContextFile>> {
  try {
    const { data, error } = await supabase
      .from('client_context_files')
      .update(updates)
      .eq('id', fileId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as ClientContextFile, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

export async function deleteClientContextFile(fileId: string): Promise<ApiResponse<boolean>> {
  try {
    const { data: file, error: fetchError } = await supabase
      .from('client_context_files')
      .select('storage_path')
      .eq('id', fileId)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError.message };
    }

    if (file?.storage_path) {
      await supabase.storage.from('client-context-files').remove([file.storage_path]);
    }

    const { error } = await supabase
      .from('client_context_files')
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

// ============================================
// Client Context URLs
// ============================================

export async function getClientContextUrls(clientId: string): Promise<ApiResponse<ClientContextUrl[]>> {
  try {
    const { data, error } = await supabase
      .from('client_context_urls')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as ClientContextUrl[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

export async function addClientContextUrl(
  clientId: string,
  url: string,
  label?: string,
  scrapedContent?: string
): Promise<ApiResponse<ClientContextUrl>> {
  try {
    const contextUrl: ClientContextUrlInsert = {
      client_id: clientId,
      url,
      label: label || null,
      scraped_content: scrapedContent || null,
      scrape_status: scrapedContent ? 'done' : 'pending',
      scrape_error: null,
    };

    const { data, error } = await supabase
      .from('client_context_urls')
      .insert(contextUrl)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as ClientContextUrl, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

export async function updateClientContextUrl(
  urlId: string,
  updates: ClientContextUrlUpdate
): Promise<ApiResponse<ClientContextUrl>> {
  try {
    const { data, error } = await supabase
      .from('client_context_urls')
      .update(updates)
      .eq('id', urlId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as ClientContextUrl, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

export async function deleteClientContextUrl(urlId: string): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('client_context_urls')
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
