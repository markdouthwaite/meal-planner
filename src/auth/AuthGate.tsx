import { type ReactNode } from 'react';
import { useAuth } from './useAuth';
import { LockScreen } from './LockScreen';
import { AuthContext } from './context';

export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (!auth.authenticated) {
    return <LockScreen signIn={auth.signIn} />;
  }

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
