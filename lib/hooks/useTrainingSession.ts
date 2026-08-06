import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface TrainingSessionDetailDrill {
  drill_id: string;
  name: string;
  target_value: number | null;
  photo_url: string | null;
  value: number | null;
}

export interface TrainingSessionDetail {
  routineName: string;
  datePlayed: string;
  note: string | null;
  drills: TrainingSessionDetailDrill[];
}

export interface UseTrainingSessionResult {
  session: TrainingSessionDetail | null;
  loading: boolean;
  error: string | null;
}

export function useTrainingSession(sessionId: string): UseTrainingSessionResult {
  const [session, setSession] = useState<TrainingSessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data: sessionRow, error: sessionError } = await supabase
      .from('training_sessions')
      .select('date_played, note, training_routines(name)')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionRow) {
      setError(sessionError?.message ?? 'Session not found.');
      setLoading(false);
      return;
    }

    const { data: drillLogs, error: drillLogsError } = await supabase
      .from('training_drill_logs')
      .select('value, training_drills(id, name, target_value, photo_url, sort_order)')
      .eq('session_id', sessionId);

    if (drillLogsError) {
      setError(drillLogsError.message);
      setLoading(false);
      return;
    }

    const row = sessionRow as any;
    const drills: TrainingSessionDetailDrill[] = ((drillLogs as any[]) ?? [])
      .map((log) => ({
        drill_id: log.training_drills.id,
        name: log.training_drills.name,
        target_value: log.training_drills.target_value,
        photo_url: log.training_drills.photo_url,
        value: log.value,
        sort_order: log.training_drills.sort_order,
      }))
      .sort((a, b) => a.sort_order - b.sort_order);

    setSession({
      routineName: row.training_routines?.name ?? 'Unknown routine',
      datePlayed: row.date_played,
      note: row.note,
      drills,
    });
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  return { session, loading, error };
}

export interface SaveTrainingSessionInput {
  routineId: string;
  datePlayed: string;
  note: string | null;
  results: { drillId: string; value: number | null }[];
}

export async function saveTrainingSession(input: SaveTrainingSessionInput): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Not authenticated.');
  }

  const { data, error } = await (supabase.from('training_sessions') as any)
    .insert({
      user_id: user.id,
      routine_id: input.routineId,
      date_played: input.datePlayed,
      note: input.note,
    })
    .select('id')
    .single();

  if (error) throw error;
  const sessionId = (data as { id: string }).id;

  const { error: logsError } = await (supabase.from('training_drill_logs') as any).insert(
    input.results.map((r) => ({
      session_id: sessionId,
      drill_id: r.drillId,
      value: r.value,
    }))
  );

  if (logsError) throw logsError;

  return sessionId;
}

export async function deleteTrainingSession(id: string): Promise<void> {
  const { error } = await supabase.from('training_sessions').delete().eq('id', id);
  if (error) throw error;
}
