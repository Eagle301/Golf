import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface RoundListItem {
  id: string;
  date_played: string;
  total_score: number | null;
  total_putts: number | null;
  courses: { name: string } | null;
}

export interface UseRoundsResult {
  rounds: RoundListItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useRounds(): UseRoundsResult {
  const [rounds, setRounds] = useState<RoundListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRounds = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('rounds')
      .select('id, date_played, total_score, total_putts, courses(name)')
      .order('date_played', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setRounds((data as any as RoundListItem[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRounds();
  }, [fetchRounds]);

  return { rounds, loading, error, refetch: fetchRounds };
}
