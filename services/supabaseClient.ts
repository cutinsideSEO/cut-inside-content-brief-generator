// Supabase Client Configuration - Build: 2026-01-22
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: Log configuration status
if (import.meta.env.DEV) {
  console.log('[Supabase Config]', {
    urlConfigured: Boolean(supabaseUrl),
    keyConfigured: Boolean(supabaseAnonKey),
    url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'NOT SET',
  });
}

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase environment variables not configured. ' +
    'Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local file.'
  );
}

// Create and export the Supabase client
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      // We use custom access code auth, not Supabase Auth
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: 'public',
    },
  }
);

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Export the client as default as well
export default supabase;
