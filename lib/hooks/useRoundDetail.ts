import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { FairwayHit } from '@/types/database';

export interface RoundDetailHole {
  hole_number: number;
  par: number;
  stroke_index: number | null;
  score: number | null;
  putts: number | null;
  fairway_hit: FairwayHit | null;
  gir: boolean | null;
}

export interface RoundDetail {
  courseName: string;
  totalPar: number;
  courseRating: number | null;
  slopeRating: number | null;
  handicapAtTime: number | null;
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
      .select('handicap_at_time, courses(name, total_par, course_rating, slope_rating)')
      .eq('id', roundId)
      .single();

    if (roundError || !round) {
      setError(roundError?.message ?? 'Round not found.');
      setLoading(false);
      return;
    }

    const { data: holeLogs, error: holeLogsError } = await supabase
      .from('hole_logs')
      .select('score, putts, fairway_hit, gir, holes(hole_number, par, stroke_index)')
      .eq('round_id', roundId);

    if (holeLogsError || !holeLogs) {
      setError(holeLogsError?.message ?? 'Failed to load hole data.');
      setLoading(false);
      return;
    }

    const roundData = round as any;
    const course = roundData.courses;

    const holes: RoundDetailHole[] = (holeLogs as any[])
      .map((h) => ({
        hole_number: h.holes.hole_number,
        par: h.holes.par,
        stroke_index: h.holes.stroke_index,
        score: h.score,
        putts: h.putts,
        fairway_hit: h.fairway_hit,
        gir: h.gir,
      }))
      .sort((a, b) => a.hole_number - b.hole_number);

    setRoundDetail({
      courseName: course?.name ?? 'Unknown course',
      totalPar: course?.total_par ?? 0,
      courseRating: course?.course_rating ?? null,
      slopeRating: course?.slope_rating ?? null,
      handicapAtTime: roundData.handicap_at_time,
      holes,
    });
    setLoading(false);
  }, [roundId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { roundDetail, loading, error };
}
