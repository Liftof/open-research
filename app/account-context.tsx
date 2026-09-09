'use client';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import type { Session } from '@/lib/research';
type AccountState = {
  session: Session | null;
  error: string;
  refresh: () => Promise<Session>;
};
const Context = createContext<AccountState>({
  session: null,
  error: '',
  refresh: async () => {
    throw Error('Account unavailable.');
  },
});
export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [error, setError] = useState('');
  const refresh = useCallback(async () => {
    const r = await fetch('/api/account');
    const data = (await r.json()) as Session & { error?: string };
    if (!r.ok) throw Error(data.error || 'Could not load account.');
    setSession(data);
    setError('');
    return data as Session;
  }, []);
  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [refresh]);
  return (
    <Context.Provider value={{ session, error, refresh }}>
      {children}
    </Context.Provider>
  );
}
export function useAccount() {
  return useContext(Context);
}
export function AccountGate({
  children,
  returnTo = '/publish',
}: {
  children: React.ReactNode;
  returnTo?: string;
}) {
  const { session, error } = useAccount();
  if (error)
    return (
      <p role="alert" className="error">
        {error} <a href="/account">Try again</a>
      </p>
    );
  if (!session) return <p role="status">Loading account…</p>;
  if (!session.author)
    return (
      <div className="account-gate">
        <p>Create an account to contribute.</p>
        <a
          className="button primary"
          href={
            session.signedIn
              ? '/account?returnTo=' + encodeURIComponent(returnTo)
              : '/login?returnTo=' + encodeURIComponent(returnTo)
          }
        >
          {session.signedIn ? 'Create account' : 'Sign in / Sign up'}
        </a>
      </div>
    );
  return <>{children}</>;
}
