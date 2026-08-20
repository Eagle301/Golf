jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), auth: { getUser: jest.fn() } },
}));
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { createQueryBuilderMock } from '@/lib/testUtils/supabaseMock';
import { addPendingRound } from '@/lib/offline/pendingRounds';
import { syncPendingRounds } from '../useRoundSync';
import type { PendingRound } from '@/lib/offline/types';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

const pendingRound: PendingRound = {
  localId: 'local_1',
  course_id: 'course-1',
  tee_box_id: 'tee-1',
  date_played: '2026-08-20',
  notes: '',
  total_score: 85,
  total_putts: 30,
  score_differential: null,
  handicap_at_time: null,
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
      chip_shots: 1,
    },
  ],
};

describe('syncPendingRounds', () => {
  it('inserts the round with its tee_box_id', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const roundsBuilder = createQueryBuilderMock({ data: { id: 'round-1' }, error: null });
    const holeLogsBuilder = createQueryBuilderMock({ data: null, error: null });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === 'rounds' ? roundsBuilder : holeLogsBuilder
    );

    await addPendingRound(pendingRound);
    await syncPendingRounds();

    expect(roundsBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ course_id: 'course-1', tee_box_id: 'tee-1', total_score: 85 })
    );
    expect(holeLogsBuilder.insert).toHaveBeenCalledWith([
      expect.objectContaining({ round_id: 'round-1', hole_id: 'hole-1', score: 5 }),
    ]);
  });
});
