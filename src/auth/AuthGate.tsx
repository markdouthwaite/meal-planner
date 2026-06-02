import { type ReactNode } from 'react';
import { Carrot } from 'lucide-react';
import { useAuth } from './useAuth';
import { LockScreen } from './LockScreen';
import { AuthContext } from './context';

export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();

  if (auth.status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50">
        <Carrot size={28} className="text-brand-600 animate-pulse" strokeWidth={2.25} />
      </div>
    );
  }

  if (auth.status === 'signed-out') {
    return <LockScreen signIn={auth.signIn} />;
  }

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}
