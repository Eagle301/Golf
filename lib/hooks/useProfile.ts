import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export async function getCurrentHandicap(): Promise<number | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from('profiles').select('handicap').eq('id', user.id).single();
  if (error || !data) return null;
  return (data as { handicap: number | null }).handicap;
}

export interface UseProfileResult {
  handicap: number | null;
  fullName: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProfile(): UseProfileResult {
  const [handicap, setHandicap] = useState<number | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('handicap, full_name')
      .eq('id', user.id)
      .single();

    if (fetchError) {
      setError(fetchError.message);
    } else {
      const profile = data as { handicap: number | null; full_name: string | null };
      setHandicap(profile.handicap);
      setFullName(profile.full_name);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { handicap, fullName, loading, error, refetch: fetchProfile };
}
