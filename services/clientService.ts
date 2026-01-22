// Client Service - CRUD operations for client folders
import { supabase } from './supabaseClient';
import { getCurrentUserId, isAdmin, getAccessibleClientIds, addClientToUser } from './authService';
import type { Client, ClientInsert, ClientUpdate, ClientWithBriefCount, ApiResponse } from '../types/database';

/**
 * Get all clients accessible to the current user
 */
export async function getAccessibleClients(): Promise<ApiResponse<ClientWithBriefCount[]>> {
  const userId = getCurrentUserId();
  if (!userId) {
    return { data: null, error: 'Not authenticated' };
  }

  try {
    let query = supabase
      .from('clients')
      .select(`
        *,
        briefs:briefs(count)
      `)
      .order('name', { ascending: true });

    // If not admin, filter by accessible client IDs or created by current user
    if (!isAdmin()) {
      const accessibleIds = getAccessibleClientIds();
      query = query.or(`id.in.(${accessibleIds.join(',')}),created_by.eq.${userId}`);
    }

    const { data, error } = await query;

    if (error) {
      return { data: null, error: error.message };
    }

    // Transform the data to include brief_count
    const clientsWithCount: ClientWithBriefCount[] = (data || []).map((client: any) => ({
      ...client,
      brief_count: client.briefs?.[0]?.count || 0,
      briefs: undefined, // Remove the briefs relation from the object
    }));

    return { data: clientsWithCount, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Get a single client by ID
 */
export async function getClient(clientId: string): Promise<ApiResponse<Client>> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Client, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Create a new client
 */
export async function createClient(
  name: string,
  description?: string
): Promise<ApiResponse<Client>> {
  const userId = getCurrentUserId();
  if (!userId) {
    return { data: null, error: 'Not authenticated' };
  }

  try {
    // Generate a URL-safe slug from the name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      + '-' + Date.now().toString(36);

    const newClient: ClientInsert = {
      name,
      slug,
      description: description || null,
      created_by: userId,
    };

    const { data, error } = await supabase
      .from('clients')
      .insert(newClient)
      .select()
      .single();

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        return { data: null, error: 'A client with this name already exists' };
      }
      return { data: null, error: error.message };
    }

    // Add the new client to the user's accessible clients
    await addClientToUser(data.id);

    return { data: data as Client, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Update a client
 */
export async function updateClient(
  clientId: string,
  updates: ClientUpdate
): Promise<ApiResponse<Client>> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', clientId)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as Client, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Delete a client (and all related briefs via CASCADE)
 */
export async function deleteClient(clientId: string): Promise<ApiResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', clientId);

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
 * Check if a client name already exists
 */
export async function isClientNameTaken(name: string): Promise<boolean> {
  const { data } = await supabase
    .from('clients')
    .select('id')
    .ilike('name', name)
    .limit(1);

  return (data?.length ?? 0) > 0;
}
