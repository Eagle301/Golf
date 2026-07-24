import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface UseDevAutoSignInResult {
  ready: boolean;
  error: string | null;
}

export function useDevAutoSignIn(): UseDevAutoSignInResult {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function signIn() {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        if (!cancelled) setReady(true);
        return;
      }

      const email = process.env.EXPO_PUBLIC_DEV_USER_EMAIL;
      const password = process.env.EXPO_PUBLIC_DEV_USER_PASSWORD;

      if (!email || !password) {
        if (!cancelled) {
          setError('Missing EXPO_PUBLIC_DEV_USER_EMAIL / EXPO_PUBLIC_DEV_USER_PASSWORD.');
          setReady(true);
        }
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (!cancelled) {
        if (signInError) {
          setError(signInError.message);
        }
        setReady(true);
      }
    }

    signIn();

    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, error };
}
