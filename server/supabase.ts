import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

/**
 * Returns the authoritative server-side Supabase client.
 * Uses SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY).
 * FAILS CLOSED: Never silently falls back to publishable or anon keys.
 * Secret keys are strictly server-side and never exposed to the client.
 */
export function getSupabase(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const url = process.env.SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !secretKey) {
    throw new Error(
      'SUPABASE_CONFIGURATION_ERROR: SUPABASE_URL and SUPABASE_SECRET_KEY must be configured in environment variables. Server operations fail-closed.'
    );
  }

  try {
    supabaseClient = createClient(url, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    return supabaseClient;
  } catch (err) {
    console.error('Failed to initialize server Supabase client:', err);
    throw new Error('Supabase client initialization failed.');
  }
}
