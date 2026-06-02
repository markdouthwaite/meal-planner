import { useState, type FormEvent } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import type { AuthApi } from './useAuth';
import { ALLOWED_EMAIL } from './useAuth';

interface LockScreenProps {
  signIn: AuthApi['signIn'];
}

export function LockScreen({ signIn }: LockScreenProps) {
  const [email, setEmail] = useState(ALLOWED_EMAIL);
  const [password, setPassword] = useState('');
  const [reveal, setReveal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      setShake(true);
      setTimeout(() => setShake(false), 400);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-gradient-to-br from-brand-50 via-white to-accent-50">
      {/* Subtle decorative blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full bg-accent-200/40 blur-3xl" />
      </div>

      <form
        onSubmit={handleSubmit}
        className={`relative w-full max-w-sm bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-3xl p-8 ${
          shake ? 'animate-[shake_400ms_ease-in-out]' : ''
        }`}
      >
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-600/20 mb-4">
            <Lock size={24} strokeWidth={2.25} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Family Meal Planner</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to continue.</p>
        </div>

        <label htmlFor="lock-email" className="sr-only">
          Email
        </label>
        <input
          id="lock-email"
          type="email"
          value={email}
          onChange={e => {
            setEmail(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Email"
          autoComplete="username"
          className="w-full mb-3 px-4 py-3 rounded-xl border border-gray-200 bg-white text-base focus:outline-none focus:ring-2 focus:ring-brand-500 transition-shadow"
        />

        <label htmlFor="lock-password" className="sr-only">
          Password
        </label>
        <div className="relative mb-3">
          <input
            id="lock-password"
            type={reveal ? 'text' : 'password'}
            autoFocus
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Password"
            autoComplete="current-password"
            className={`w-full pl-4 pr-12 py-3 rounded-xl border bg-white text-base focus:outline-none focus:ring-2 transition-shadow ${
              error
                ? 'border-red-300 focus:ring-red-400'
                : 'border-gray-200 focus:ring-brand-500'
            }`}
          />
          <button
            type="button"
            onClick={() => setReveal(v => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-50"
            aria-label={reveal ? 'Hide password' : 'Show password'}
          >
            {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {error && (
          <p role="alert" className="text-xs text-red-600 mb-3 -mt-1">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={password.length === 0 || submitting}
          className="w-full py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 active:bg-brand-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
