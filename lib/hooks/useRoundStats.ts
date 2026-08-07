import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  averageEighteenHoleScore,
  averagePuttsPerRound,
  averageScoreByPar,
  averageScoringCategoriesPerRound,
  fairwayDistribution,
  girPercentage,
  puttsDistribution,
  type PuttsDistribution,
  type ScoringCategoryAverages,
} from '@/lib/calculations';

/** Matches the rolling window used for the handicap and differential chart. */
export const ROUND_STATS_LIMIT = 20;

export interface RoundStats {
  averageScore: number | null;
  fairwayDistribution: { leftPct: number; hitPct: number; rightPct: number; naPct: number };
  girPercentage: number;
  scoreByPar: { par3: number | null; par4: number | null; par5: number | null };
  scoringCategoryAverages: ScoringCategoryAverages;
  averagePutts: number | null;
  puttsDistribution: PuttsDistribution;
}

export interface UseRoundStatsResult {
  stats: RoundStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Aggregate stats (average score, fairway direction, GIR%, scoring by par)
 * over the last ROUND_STATS_LIMIT rounds, for the dashboard charts.
 */
export function useRoundStats(): UseRoundStatsResult {
  const [stats, setStats] = useState<RoundStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: rounds, error: roundsError } = await supabase
      .from('rounds')
      .select('id, total_score, total_putts, courses(hole_count)')
      .order('date_played', { ascending: false })
      .limit(ROUND_STATS_LIMIT);

    if (roundsError) {
      setError(roundsError.message);
      setLoading(false);
      return;
    }

    const roundRows = (rounds as any[]) ?? [];
    const roundIds = roundRows.map((r) => r.id);

    const { data: holeLogs, error: holeLogsError } =
      roundIds.length > 0
        ? await supabase
            .from('hole_logs')
            .select('score, putts, fairway_hit, gir, holes(par)')
            .in('round_id', roundIds)
        : { data: [] as any[], error: null };

    if (holeLogsError) {
      setError(holeLogsError.message);
      setLoading(false);
      return;
    }

    const holeLogRows = (holeLogs as any[]) ?? [];

    setStats({
      averageScore: averageEighteenHoleScore(
        roundRows.map((r) => ({ total_score: r.total_score, hole_count: r.courses?.hole_count ?? 18 }))
      ),
      fairwayDistribution: fairwayDistribution(
        holeLogRows.map((h) => ({ fairway_hit: h.fairway_hit, par: h.holes?.par ?? 0 }))
      ),
      girPercentage: girPercentage(holeLogRows.map((h) => ({ gir: h.gir }))),
      scoreByPar: averageScoreByPar(holeLogRows.map((h) => ({ par: h.holes?.par ?? 0, score: h.score }))),
      scoringCategoryAverages: averageScoringCategoriesPerRound(
        holeLogRows.map((h) => ({ par: h.holes?.par ?? 0, score: h.score })),
        roundRows.length
      ),
      averagePutts: averagePuttsPerRound(
        roundRows.map((r) => ({ total_putts: r.total_putts, hole_count: r.courses?.hole_count ?? 18 }))
      ),
      puttsDistribution: puttsDistribution(holeLogRows.map((h) => ({ putts: h.putts }))),
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
