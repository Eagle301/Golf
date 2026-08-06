import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { TrainingCategory } from '@/types/database';

export interface TrainingSessionListItem {
  id: string;
  date_played: string;
  note: string | null;
  training_routines: { name: string; category: TrainingCategory } | null;
}

export interface UseTrainingSessionsResult {
  sessions: TrainingSessionListItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTrainingSessions(): UseTrainingSessionsResult {
  const [sessions, setSessions] = useState<TrainingSessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('training_sessions')
      .select('id, date_played, note, training_routines(name, category)')
      .order('date_played', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setSessions((data as any as TrainingSessionListItem[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return { sessions, loading, error, refetch: fetchSessions };
}
