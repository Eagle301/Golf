import { useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from '@/lib/supabase';
import { getPendingRounds, removePendingRound } from '@/lib/offline/pendingRounds';
import { calculateHandicap } from '@/lib/calculations';
import type { Round } from '@/types/database';

async function updateUserHandicap(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('rounds')
    .select('date_played, score_differential')
    .eq('user_id', userId)
    .order('date_played', { ascending: false })
    .limit(20);

  if (error || !data) return;

  const handicap = calculateHandicap(data as Round[]);

  await (supabase.from('profiles') as any).update({ handicap }).eq('id', userId);
}

let syncInFlight: Promise<void> | null = null;

/**
 * Guarded against concurrent invocations (e.g. React re-running effects in
 * development, or a manual call overlapping the reconnect listener) — without
 * this, two overlapping calls could both read the same pending queue before
 * either removes an entry, double-syncing the same round.
 */
export function syncPendingRounds(): Promise<void> {
  if (syncInFlight) return syncInFlight;
  syncInFlight = runSync().finally(() => {
    syncInFlight = null;
  });
  return syncInFlight;
}

async function runSync(): Promise<void> {
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
        handicap_at_time: round.handicap_at_time,
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

    if (round.score_differential !== null) {
      await updateUserHandicap(user.id);
    }
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
