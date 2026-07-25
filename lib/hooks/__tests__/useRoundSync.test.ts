jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), auth: { getUser: jest.fn() } },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { createQueryBuilderMock } from '@/lib/testUtils/supabaseMock';
import { addPendingRound, getPendingRounds } from '@/lib/offline/pendingRounds';
import type { PendingRound } from '@/lib/offline/types';
import { syncPendingRounds } from '../useRoundSync';

function makeRound(localId: string): PendingRound {
  return {
    localId,
    course_id: 'course-1',
    date_played: '2026-07-24',
    notes: '',
    total_score: 90,
    total_putts: 32,
    score_differential: 18,
    handicap_at_time: 12.4,
    holeLogs: [
      {
        hole_number: 1,
        par: 4,
        length_meters: 350,
        stroke_index: 5,
        hole_id: 'hole-1',
        score: 5,
        putts: 2,
        fairway_hit: 'yes',
        gir: false,
        gir_overridden: false,
        penalties: 0,
        chip_shots: 0,
      },
    ],
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('syncPendingRounds', () => {
  it('does nothing when the queue is empty', async () => {
    await syncPendingRounds();
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('syncs a pending round, removes it from the queue, and updates the user handicap', async () => {
    await addPendingRound(makeRound('a'));

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const insertRoundBuilder = createQueryBuilderMock({ data: { id: 'real-round-id' }, error: null });
    const holeLogsBuilder = createQueryBuilderMock({ data: null, error: null });
    const selectRoundsBuilder = createQueryBuilderMock({
      data: [{ date_played: '2026-07-24', score_differential: 18 }],
      error: null,
    });
    const profilesBuilder = createQueryBuilderMock({ data: null, error: null });

    let roundsCallCount = 0;
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'rounds') {
        roundsCallCount += 1;
        return roundsCallCount === 1 ? insertRoundBuilder : selectRoundsBuilder;
      }
      if (table === 'profiles') return profilesBuilder;
      return holeLogsBuilder;
    });

    await syncPendingRounds();

    expect(insertRoundBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        course_id: 'course-1',
        total_score: 90,
        handicap_at_time: 12.4,
      })
    );
    expect(holeLogsBuilder.insert).toHaveBeenCalledWith([
      expect.objectContaining({ round_id: 'real-round-id', hole_id: 'hole-1', score: 5 }),
    ]);
    expect(profilesBuilder.update).toHaveBeenCalledWith({ handicap: 18 });
    expect(await getPendingRounds()).toEqual([]);
  });

  it('leaves the round queued if the round insert fails', async () => {
    await addPendingRound(makeRound('a'));

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const roundsBuilder = createQueryBuilderMock({ data: null, error: { message: 'db error' } });
    (supabase.from as jest.Mock).mockReturnValue(roundsBuilder);

    await syncPendingRounds();

    const pending = await getPendingRounds();
    expect(pending).toHaveLength(1);
    expect(pending[0].localId).toBe('a');
  });

  it('processes rounds in order and stops at the first failure', async () => {
    await addPendingRound(makeRound('a'));
    await addPendingRound(makeRound('b'));

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } });

    let callCount = 0;
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'rounds') {
        callCount += 1;
        // 1st call: round 'a' insert succeeds. 2nd call: handicap-update select
        // (no-ops gracefully on error). 3rd call: round 'b' insert fails.
        return callCount === 1
          ? createQueryBuilderMock({ data: { id: 'real-round-id' }, error: null })
          : createQueryBuilderMock({ data: null, error: { message: 'db error' } });
      }
      return createQueryBuilderMock({ data: null, error: null });
    });

    await syncPendingRounds();

    const pending = await getPendingRounds();
    expect(pending.map((r) => r.localId)).toEqual(['b']);
  });

  it('does not double-insert when called concurrently before the first call finishes', async () => {
    await addPendingRound(makeRound('a'));

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const insertRoundBuilder = createQueryBuilderMock({ data: { id: 'real-round-id' }, error: null });
    const selectRoundsBuilder = createQueryBuilderMock({
      data: [{ date_played: '2026-07-24', score_differential: 18 }],
      error: null,
    });
    const otherBuilder = createQueryBuilderMock({ data: null, error: null });
    let roundsCallCount = 0;
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'rounds') {
        roundsCallCount += 1;
        return roundsCallCount === 1 ? insertRoundBuilder : selectRoundsBuilder;
      }
      return otherBuilder;
    });

    // Two overlapping calls, as would happen if an effect fires twice (e.g.
    // React re-running effects in development) before the first sync settles.
    await Promise.all([syncPendingRounds(), syncPendingRounds()]);

    expect(insertRoundBuilder.insert).toHaveBeenCalledTimes(1);
    expect(await getPendingRounds()).toEqual([]);
  });
});
