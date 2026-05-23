import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'mp.auth.v1';
const EXPECTED_PASSWORD = (import.meta.env.VITE_APP_PASSWORD as string | undefined) ?? 'meals';

if (!import.meta.env.VITE_APP_PASSWORD && import.meta.env.PROD) {
  // Production build with no password configured — surface a clear warning.
  console.warn(
    '[auth] VITE_APP_PASSWORD is not set; falling back to the default password. ' +
    'Set VITE_APP_PASSWORD in your Vercel project settings and redeploy.',
  );
}

function readStoredToken(): boolean {
  try {
    if (localStorage.getItem(STORAGE_KEY) === 'ok') return true;
    if (sessionStorage.getItem(STORAGE_KEY) === 'ok') return true;
  } catch {
    // Storage may be unavailable (private mode, etc.) — treat as logged out.
  }
  return false;
}

export interface AuthApi {
  authenticated: boolean;
  signIn: (password: string, remember: boolean) => { ok: true } | { ok: false; error: string };
  signOut: () => void;
}

export function useAuth(): AuthApi {
  const [authenticated, setAuthenticated] = useState<boolean>(() => readStoredToken());

  // Keep tabs in sync — if another tab logs out, this one follows.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setAuthenticated(readStoredToken());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const signIn = useCallback((password: string, remember: boolean) => {
    if (password !== EXPECTED_PASSWORD) {
      return { ok: false, error: 'Incorrect password.' } as const;
    }
    try {
      if (remember) {
        localStorage.setItem(STORAGE_KEY, 'ok');
        sessionStorage.removeItem(STORAGE_KEY);
      } else {
        sessionStorage.setItem(STORAGE_KEY, 'ok');
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Best-effort; still mark this tab as authenticated.
    }
    setAuthenticated(true);
    return { ok: true } as const;
  }, []);

  const signOut = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore.
    }
    setAuthenticated(false);
  }, []);

  return { authenticated, signIn, signOut };
}
