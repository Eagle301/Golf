import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { computeLeaks, type Leak } from '@/lib/training/leaks';
import { ROUND_STATS_LIMIT } from '@/lib/hooks/useRoundStats';

export interface UseLeaksResult {
  /** All five leaks, ranked biggest first; empty until a round exists. */
  leaks: Leak[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Ranked stroke leaks over the same rolling window the dashboard stats use
 * (last ROUND_STATS_LIMIT rounds), for the Training tab's leaks card.
 */
export function useLeaks(): UseLeaksResult {
  const [leaks, setLeaks] = useState<Leak[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaks = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Imported score-only rounds (no putts recorded) carry no leak
    // information; including them would only inflate the per-round divisor.
    const { data: rounds, error: roundsError } = await supabase
      .from('rounds')
      .select('id, courses(hole_count)')
      .not('total_putts', 'is', null)
      .order('date_played', { ascending: false })
      .limit(ROUND_STATS_LIMIT);

    if (roundsError) {
      setError(roundsError.message);
      setLeaks([]);
      setLoading(false);
      return;
    }

    const roundRows = (rounds as any[]) ?? [];
    const roundIds = roundRows.map((r) => r.id);
    // "Per round" means per 18 holes: a 9-hole round only offers half the
    // opportunities, so it counts as half a round in every rate.
    const eighteenHoleRounds = roundRows.reduce(
      (sum, r) => sum + (r.courses?.hole_count ?? 18) / 18,
      0
    );
    if (roundIds.length === 0) {
      setLeaks([]);
      setLoading(false);
      return;
    }

    const { data: holeLogs, error: holeLogsError } = await supabase
      .from('hole_logs')
      .select('putts, penalties, chip_shots, gir, score, fairway_hit, holes(par)')
      .in('round_id', roundIds);

    if (holeLogsError) {
      setError(holeLogsError.message);
      setLeaks([]);
      setLoading(false);
      return;
    }

    const logs = ((holeLogs as any[]) ?? []).map((h) => ({
      putts: h.putts,
      penalties: h.penalties,
      chip_shots: h.chip_shots,
      gir: h.gir,
      score: h.score,
      fairway_hit: h.fairway_hit,
      par: h.holes?.par ?? 0,
    }));
    setLeaks(computeLeaks(logs, eighteenHoleRounds));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeaks();
  }, [fetchLeaks]);

  return { leaks, loading, error, refetch: fetchLeaks };
}
