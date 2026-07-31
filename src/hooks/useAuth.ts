import { useCallback, useEffect, useState } from 'react';
import { authApi, type CurrentUser } from '../lib/api';

export function useAuth() {
  const [session, setSession] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    authApi.me()
      .then(({ user }) => { if (active) setSession(user); })
      .catch(() => { if (active) setSession(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { user } = await authApi.login(email, password);
    setSession(user);
  }, []);
  const signUp = useCallback(async (email: string, password: string) => {
    const { user } = await authApi.register(email, password);
    setSession(user);
  }, []);
  const signOut = useCallback(async () => {
    await authApi.logout();
    setSession(null);
  }, []);

  return { session, loading, signIn, signUp, signOut };
}
