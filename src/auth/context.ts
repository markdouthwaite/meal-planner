import { createContext, useContext } from 'react';
import type { AuthApi } from './useAuth';

export const AuthContext = createContext<AuthApi | null>(null);

export function useAuthApi(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthApi must be used within AuthGate');
  return ctx;
}
