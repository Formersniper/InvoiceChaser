import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;
let cachedConfig: { url: string; anonKey: string } | null = null;

/**
 * Resolves public Supabase configuration.
 * Checked in order:
 * 1. Build-time defined env vars (process.env / import.meta.env)
 * 2. Cached runtime config from /api/auth/config
 */
function resolveConfig(): { url: string; anonKey: string } {
  if (cachedConfig) return cachedConfig;

  const url =
    (typeof process !== 'undefined' && process.env?.SUPABASE_URL) ||
    (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_URL) ||
    '';

  const anonKey =
    (typeof process !== 'undefined' && (process.env?.SUPABASE_ANON_KEY || process.env?.SUPABASE_PUBLISHABLE_KEY)) ||
    (typeof import.meta !== 'undefined' &&
      ((import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY ||
        (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_SUPABASE_PUBLISHABLE_KEY)) ||
    '';

  return { url, anonKey };
}

/**
 * Returns the client-side Supabase client instance.
 * Configured with persistSession: false to guarantee that access tokens
 * are never stored in localStorage, preserving the authoritative secure session model.
 */
export function getClientSupabase(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const { url, anonKey } = resolveConfig();

  if (!url || !anonKey) {
    console.warn('[Supabase Client] Public credentials not yet loaded. Client will be lazily initialized.');
  }

  supabaseClient = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder', {
    auth: {
      persistSession: false, // Strictly avoids localStorage token storage
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseClient;
}

/**
 * Async initialization helper: ensures valid Supabase client credentials
 * by requesting public config from /api/auth/config if necessary.
 */
export async function ensureClientSupabase(): Promise<SupabaseClient> {
  const current = resolveConfig();
  if (current.url && current.anonKey && !current.url.includes('placeholder')) {
    return getClientSupabase();
  }

  try {
    const res = await fetch('/api/auth/config');
    if (res.ok) {
      const data = await res.json();
      if (data.supabaseUrl && data.supabaseAnonKey) {
        cachedConfig = {
          url: data.supabaseUrl,
          anonKey: data.supabaseAnonKey,
        };
        // Re-initialize client with live credentials
        supabaseClient = createClient(cachedConfig.url, cachedConfig.anonKey, {
          auth: {
            persistSession: false,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        });
        return supabaseClient;
      }
    }
  } catch (err) {
    console.error('[Supabase Client] Failed to fetch auth config:', err);
  }

  return getClientSupabase();
}
