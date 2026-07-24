import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/lib/supabase';
import { getPendingRounds, removePendingRound } from '@/lib/offline/pendingRounds';

export async function syncPendingRounds(): Promise<void> {
  const pending = await getPendingRounds();

  for (const round of pending) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: roundRow, error: roundError } = await (supabase.from('rounds') as any)
      .insert({
        user_id: user.id,
        course_id: round.course_id,
        date_played: round.date_played,
        total_score: round.total_score,
        total_putts: round.total_putts,
        notes: round.notes || null,
        score_differential: round.score_differential,
      })
      .select('id')
      .single();

    if (roundError || !roundRow) return;

    const { error: holeLogsError } = await (supabase.from('hole_logs') as any).insert(
      round.holeLogs.map((h) => ({
        round_id: roundRow.id,
        hole_id: h.hole_id,
        score: h.score,
        putts: h.putts,
        fairway_hit: h.fairway_hit,
        gir: h.gir,
        gir_overridden: h.gir_overridden,
        penalties: h.penalties,
        chip_shots: h.chip_shots,
      }))
    );

    if (holeLogsError) return;

    await removePendingRound(round.localId);
  }
}

export function useRoundSync(): void {
  useEffect(() => {
    syncPendingRounds();

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        syncPendingRounds();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);
}
