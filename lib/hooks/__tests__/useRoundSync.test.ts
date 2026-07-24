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
    holeLogs: [
      {
        hole_number: 1,
        par: 4,
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

  it('syncs a pending round and removes it from the queue', async () => {
    await addPendingRound(makeRound('a'));

    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const roundsBuilder = createQueryBuilderMock({ data: { id: 'real-round-id' }, error: null });
    const holeLogsBuilder = createQueryBuilderMock({ data: null, error: null });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === 'rounds' ? roundsBuilder : holeLogsBuilder
    );

    await syncPendingRounds();

    expect(roundsBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', course_id: 'course-1', total_score: 90 })
    );
    expect(holeLogsBuilder.insert).toHaveBeenCalledWith([
      expect.objectContaining({ round_id: 'real-round-id', hole_id: 'hole-1', score: 5 }),
    ]);
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
        // First round succeeds, second fails.
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
});
