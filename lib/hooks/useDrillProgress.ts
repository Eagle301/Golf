import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface DrillProgressPoint {
  sessionId: string;
  date: string;
  value: number;
}

export interface DrillProgress {
  drillId: string;
  name: string;
  targetValue: number | null;
  points: DrillProgressPoint[];
}

export interface UseDrillProgressResult {
  routineName: string | null;
  drills: DrillProgress[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Every logged value for each of a routine's drills, grouped per drill and
 * ordered oldest session first, so a chart can draw the trend left to right.
 * Sessions where a drill was left blank contribute no point for it.
 */
export function useDrillProgress(routineId: string): UseDrillProgressResult {
  const [routineName, setRoutineName] = useState<string | null>(null);
  const [drills, setDrills] = useState<DrillProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [routineRes, drillsRes, sessionsRes] = await Promise.all([
      supabase.from('training_routines').select('name').eq('id', routineId).single(),
      supabase.from('training_drills').select('id, name, target_value, sort_order').eq('routine_id', routineId).order('sort_order'),
      supabase
        .from('training_sessions')
        .select('id, date_played, training_drill_logs(drill_id, value)')
        .eq('routine_id', routineId)
        .order('date_played', { ascending: true }),
    ]);

    const firstError = routineRes.error ?? drillsRes.error ?? sessionsRes.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    const drillRows = (drillsRes.data as any[]) ?? [];
    const sessionRows = [...((sessionsRes.data as any[]) ?? [])].sort((a, b) =>
      a.date_played < b.date_played ? -1 : a.date_played > b.date_played ? 1 : 0
    );

    setRoutineName((routineRes.data as any)?.name ?? null);
    setDrills(
      drillRows.map((drill) => ({
        drillId: drill.id,
        name: drill.name,
        targetValue: drill.target_value,
        points: sessionRows.flatMap((session) => {
          const log = (session.training_drill_logs as any[] | null)?.find((l) => l.drill_id === drill.id);
          if (log?.value == null) return [];
          return [{ sessionId: session.id, date: session.date_played, value: log.value }];
        }),
      }))
    );
    setLoading(false);
  }, [routineId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  return { routineName, drills, loading, error, refetch: fetchProgress };
}
