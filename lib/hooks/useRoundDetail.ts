import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { updateUserHandicap } from '@/lib/hooks/useRoundSync';
import type { FairwayHit } from '@/types/database';

export interface RoundDetailHole {
  hole_number: number;
  par: number;
  stroke_index: number | null;
  score: number | null;
  putts: number | null;
  fairway_hit: FairwayHit | null;
  gir: boolean | null;
  penalties: number | null;
}

export interface RoundDetail {
  courseName: string;
  teeName: string | null;
  totalPar: number;
  courseRating: number | null;
  slopeRating: number | null;
  holeCount: 9 | 18;
  handicapAtTime: number | null;
  scoreDifferential: number | null;
  holes: RoundDetailHole[];
}

export interface UseRoundDetailResult {
  roundDetail: RoundDetail | null;
  loading: boolean;
  error: string | null;
}

export function useRoundDetail(roundId: string): UseRoundDetailResult {
  const [roundDetail, setRoundDetail] = useState<RoundDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select(
        'handicap_at_time, score_differential, tee_boxes(name, course_rating, slope_rating), courses(name, total_par, hole_count)'
      )
      .eq('id', roundId)
      .single();

    if (roundError || !round) {
      setError(roundError?.message ?? 'Round not found.');
      setLoading(false);
      return;
    }

    const { data: holeLogs, error: holeLogsError } = await supabase
      .from('hole_logs')
      .select('score, putts, fairway_hit, gir, penalties, holes(hole_number, par, stroke_index)')
      .eq('round_id', roundId);

    if (holeLogsError || !holeLogs) {
      setError(holeLogsError?.message ?? 'Failed to load hole data.');
      setLoading(false);
      return;
    }

    const roundData = round as any;
    const course = roundData.courses;
    const tee = roundData.tee_boxes;

    const holes: RoundDetailHole[] = (holeLogs as any[])
      .map((h) => ({
        hole_number: h.holes.hole_number,
        par: h.holes.par,
        stroke_index: h.holes.stroke_index,
        score: h.score,
        putts: h.putts,
        fairway_hit: h.fairway_hit,
        gir: h.gir,
        penalties: h.penalties,
      }))
      .sort((a, b) => a.hole_number - b.hole_number);

    setRoundDetail({
      courseName: course?.name ?? 'Unknown course',
      teeName: tee?.name ?? null,
      totalPar: course?.total_par ?? 0,
      courseRating: tee?.course_rating ?? null,
      slopeRating: tee?.slope_rating ?? null,
      holeCount: course?.hole_count ?? 18,
      handicapAtTime: roundData.handicap_at_time,
      scoreDifferential: roundData.score_differential,
      holes,
    });
    setLoading(false);
  }, [roundId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { roundDetail, loading, error };
}

/** Deletes a round (its hole_logs cascade-delete with it) and recalculates the user's handicap. */
export async function deleteRound(roundId: string): Promise<void> {
  const { error } = await supabase.from('rounds').delete().eq('id', roundId);
  if (error) throw error;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await updateUserHandicap(user.id);
  }
}
