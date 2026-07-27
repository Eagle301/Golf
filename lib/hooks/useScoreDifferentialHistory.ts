import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { DIFFERENTIAL_HISTORY_LIMIT, type DifferentialRound } from '@/lib/differential';

export type { DifferentialRound };
export { DIFFERENTIAL_HISTORY_LIMIT };

export interface UseScoreDifferentialHistoryResult {
  rounds: DifferentialRound[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Last 20 rated rounds' score differentials, oldest to newest, for charting
 * the handicap trend over time.
 */
export function useScoreDifferentialHistory(): UseScoreDifferentialHistoryResult {
  const [rounds, setRounds] = useState<DifferentialRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRounds = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('rounds')
      .select('id, date_played, score_differential, total_score, handicap_at_time, courses(name)')
      .not('score_differential', 'is', null)
      .order('date_played', { ascending: false })
      .limit(DIFFERENTIAL_HISTORY_LIMIT);

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const rows = (data as any[]) ?? [];
    const chronological: DifferentialRound[] = rows
      .map((r) => ({
        id: r.id,
        date_played: r.date_played,
        score_differential: r.score_differential as number,
        courseName: r.courses?.name ?? 'Unknown course',
        totalScore: r.total_score,
        handicapAtTime: r.handicap_at_time,
      }))
      .reverse();

    setRounds(chronological);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRounds();
  }, [fetchRounds]);

  return { rounds, loading, error, refetch: fetchRounds };
}
