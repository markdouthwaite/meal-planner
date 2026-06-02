import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/**
 * The single permitted user for now. Real enforcement is in Supabase (only this
 * user exists and signups are disabled); this constant is defence-in-depth on
 * the client — any other authenticated email is immediately signed out.
 */
export const ALLOWED_EMAIL = 'hello@douthwaite-green.com';

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out';

export interface AuthApi {
  status: AuthStatus;
  email: string | null;
  signIn: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  signOut: () => Promise<void>;
}

export function useAuth(): AuthApi {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    function apply(session: Session | null) {
      if (!active) return;
      const userEmail = session?.user.email?.toLowerCase() ?? null;
      if (session && userEmail !== ALLOWED_EMAIL) {
        // Authenticated, but not the permitted user — reject and sign out.
        void supabase.auth.signOut();
        setStatus('signed-out');
        setEmail(null);
        return;
      }
      setStatus(session ? 'signed-in' : 'signed-out');
      setEmail(userEmail);
    }

    supabase.auth.getSession().then(({ data }) => apply(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => apply(session));

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (emailInput: string, password: string) => {
    const normalized = emailInput.trim().toLowerCase();
    if (normalized !== ALLOWED_EMAIL) {
      return { ok: false as const, error: 'This app is private.' };
    }
    const { error } = await supabase.auth.signInWithPassword({ email: normalized, password });
    if (error) return { ok: false as const, error: error.message };
    return { ok: true as const };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { status, email, signIn, signOut };
}
