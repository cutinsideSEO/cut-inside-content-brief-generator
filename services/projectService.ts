import { supabase } from './supabaseClient';
import { getCurrentUserId } from './authService';
import type {
  ApiResponse,
  Brief,
  ClientProject,
  ClientProjectInsert,
  ClientProjectUpdate,
} from '../types/database';

export async function getProjectsForClient(clientId: string): Promise<ApiResponse<ClientProject[]>> {
  try {
    const { data, error } = await supabase
      .from('client_projects')
      .select('*')
      .eq('client_id', clientId)
      .order('status', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data || []) as ClientProject[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

export async function createProject(
  clientId: string,
  name: string,
  description?: string
): Promise<ApiResponse<ClientProject>> {
  const userId = getCurrentUserId();
  if (!userId) {
    return { data: null, error: 'Not authenticated' };
  }

  try {
    const newProject: ClientProjectInsert = {
      client_id: clientId,
      created_by: userId,
      name,
      description: description || null,
      status: 'active',
    };

    const { data, error } = await supabase
      .from('client_projects')
      .insert(newProject)
      .select('*')
      .single();

    if (error) {
      if (error.code === '23505') {
        return { data: null, error: 'A project with this name already exists for this client' };
      }
      return { data: null, error: error.message };
    }

    return { data: data as ClientProject, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

export async function updateProject(
  projectId: string,
  updates: ClientProjectUpdate
): Promise<ApiResponse<ClientProject>> {
  try {
    const { data, error } = await supabase
      .from('client_projects')
      .update(updates)
      .eq('id', projectId)
      .select('*')
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: data as ClientProject, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

export async function archiveProject(projectId: string): Promise<ApiResponse<ClientProject>> {
  return updateProject(projectId, { status: 'archived' });
}

async function validateProjectBelongsToClient(projectId: string, clientId: string): Promise<string | null> {
  const { data: project, error } = await supabase
    .from('client_projects')
    .select('client_id')
    .eq('id', projectId)
    .single();

  if (error) {
    return error.message;
  }

  if (!project || project.client_id !== clientId) {
    return 'Project does not belong to this client';
  }

  return null;
}

export async function assignBriefToProject(
  briefId: string,
  projectId: string | null
): Promise<ApiResponse<Brief>> {
  try {
    const { data: brief, error: briefError } = await supabase
      .from('briefs')
      .select('client_id')
      .eq('id', briefId)
      .single();

    if (briefError) {
      return { data: null, error: briefError.message };
    }

    if (projectId) {
      const projectValidationError = await validateProjectBelongsToClient(projectId, brief.client_id);
      if (projectValidationError) {
        return { data: null, error: projectValidationError };
      }
    }

    const { data, error } = await supabase
      .from('briefs')
      .update({ project_id: projectId })
      .eq('id', briefId)
      .select('*')
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

export async function assignArticleToProject(
  articleId: string,
  projectId: string | null
): Promise<ApiResponse<Brief>> {
  try {
    const { data: article, error } = await supabase
      .from('brief_articles')
      .select('brief_id')
      .eq('id', articleId)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    return assignBriefToProject(article.brief_id, projectId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}
