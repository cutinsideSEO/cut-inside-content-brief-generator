// Auth Service - Access Code Authentication
import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { AccessCode, AuthSession, ApiResponse } from '../types/database';

const SESSION_KEY = 'cutinside_auth_session';

/**
 * Validate an access code and create a session
 */
export async function loginWithAccessCode(code: string): Promise<ApiResponse<AuthSession>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: 'Supabase is not configured' };
  }

  try {
    // Look up the access code
    const { data: accessCode, error } = await supabase
      .from('access_codes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (error || !accessCode) {
      return { data: null, error: 'Invalid access code' };
    }

    // Check if code has expired
    if (accessCode.expires_at && new Date(accessCode.expires_at) < new Date()) {
      return { data: null, error: 'Access code has expired' };
    }

    // Update last login time
    await supabase
      .from('access_codes')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', accessCode.id);

    // Create session
    const session: AuthSession = {
      accessCode: accessCode as AccessCode,
      loginTime: new Date().toISOString(),
    };

    // Store session in sessionStorage
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return { data: session, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}

/**
 * Get the current session from storage
 */
export function getCurrentSession(): AuthSession | null {
  try {
    const sessionData = sessionStorage.getItem(SESSION_KEY);
    if (!sessionData) return null;

    const session = JSON.parse(sessionData) as AuthSession;

    // Validate session structure
    if (!session.accessCode || !session.loginTime) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

/**
 * Log out and clear the session
 */
export function logout(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Check if the current user is an admin
 */
export function isAdmin(): boolean {
  const session = getCurrentSession();
  return session?.accessCode?.is_admin ?? false;
}

/**
 * Get the current user's accessible client IDs
 */
export function getAccessibleClientIds(): string[] {
  const session = getCurrentSession();
  return session?.accessCode?.client_ids ?? [];
}

/**
 * Get the current user's ID
 */
export function getCurrentUserId(): string | null {
  const session = getCurrentSession();
  return session?.accessCode?.id ?? null;
}

/**
 * Get the current user's name
 */
export function getCurrentUserName(): string | null {
  const session = getCurrentSession();
  return session?.accessCode?.name ?? null;
}

/**
 * Check if the user has access to a specific client
 */
export function hasClientAccess(clientId: string): boolean {
  const session = getCurrentSession();
  if (!session?.accessCode) return false;

  // Admins have access to all clients
  if (session.accessCode.is_admin) return true;

  // Check if client is in user's client_ids
  return session.accessCode.client_ids.includes(clientId);
}

/**
 * Add a new client ID to the user's accessible clients
 * (Called when user creates a new client)
 */
export async function addClientToUser(clientId: string): Promise<boolean> {
  const session = getCurrentSession();
  if (!session?.accessCode) return false;

  try {
    // Get current client_ids
    const currentIds = session.accessCode.client_ids || [];

    // Add new client ID if not already present
    if (!currentIds.includes(clientId)) {
      const updatedIds = [...currentIds, clientId];

      // Update in database
      const { error } = await supabase
        .from('access_codes')
        .update({ client_ids: updatedIds })
        .eq('id', session.accessCode.id);

      if (error) {
        console.error('Failed to update client_ids:', error);
        return false;
      }

      // Update local session
      session.accessCode.client_ids = updatedIds;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    return true;
  } catch (err) {
    console.error('Error adding client to user:', err);
    return false;
  }
}

/**
 * Refresh the current session from the database
 */
export async function refreshSession(): Promise<ApiResponse<AuthSession>> {
  const currentSession = getCurrentSession();
  if (!currentSession) {
    return { data: null, error: 'No active session' };
  }

  try {
    const { data: accessCode, error } = await supabase
      .from('access_codes')
      .select('*')
      .eq('id', currentSession.accessCode.id)
      .eq('is_active', true)
      .single();

    if (error || !accessCode) {
      logout();
      return { data: null, error: 'Session invalid' };
    }

    // Update session with fresh data
    const session: AuthSession = {
      accessCode: accessCode as AccessCode,
      loginTime: currentSession.loginTime,
    };

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return { data: session, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred';
    return { data: null, error: message };
  }
}
