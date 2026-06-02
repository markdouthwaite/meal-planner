import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error(
    'Missing Supabase configuration. Copy .env.example to .env.local and set ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (Project Settings → API).',
  );
}

/**
 * Shared Supabase browser client. We sign in with email + password and use
 * HashRouter, so there's no magic-link hash to parse on load
 * (`detectSessionInUrl: false`). The session is persisted to localStorage and
 * auto-refreshed by supabase-js.
 */
export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
