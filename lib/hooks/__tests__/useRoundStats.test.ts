jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), auth: { getUser: jest.fn() } },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { supabase } from '@/lib/supabase';
import { createQueryBuilderMock } from '@/lib/testUtils/supabaseMock';
import { useRoundStats } from '../useRoundStats';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useRoundStats', () => {
  it('computes GIR percentage over holes with a recorded GIR', async () => {
    const rounds = [{ id: 'r1', total_score: 90, total_putts: 32, courses: { hole_count: 18 } }];
    const holeLogs = [
      { score: 4, putts: 1, fairway_hit: 'yes', gir: false, holes: { par: 4 } },
      { score: 5, putts: 2, fairway_hit: 'yes', gir: true, holes: { par: 4 } },
      { score: 4, putts: null, fairway_hit: 'yes', gir: null, holes: { par: 4 } }, // unknown: excluded
    ];
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(createQueryBuilderMock({ data: rounds, error: null }))
      .mockReturnValueOnce(createQueryBuilderMock({ data: holeLogs, error: null }));

    const { result } = renderHook(() => useRoundStats());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats?.girPercentage).toBe(50);
  });

  it('computes GIR by par, scrambling, and chips per round for the expanded GIR card', async () => {
    const rounds = [
      { id: 'r1', total_score: 90, total_putts: 32, courses: { hole_count: 18 } },
      { id: 'r2', total_score: 45, total_putts: 16, courses: { hole_count: 9 } },
    ];
    const holeLogs = [
      { score: 3, putts: 2, fairway_hit: null, gir: true, chip_shots: 0, holes: { par: 3 } },
      { score: 4, putts: 1, fairway_hit: 'yes', gir: false, chip_shots: 1, holes: { par: 4 } }, // scrambled
      { score: 6, putts: 2, fairway_hit: 'yes', gir: false, chip_shots: 2, holes: { par: 4 } }, // failed
      { score: 5, putts: 2, fairway_hit: 'yes', gir: true, chip_shots: 0, holes: { par: 5 } },
    ];
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(createQueryBuilderMock({ data: rounds, error: null }))
      .mockReturnValueOnce(createQueryBuilderMock({ data: holeLogs, error: null }));

    const { result } = renderHook(() => useRoundStats());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.stats?.girByPar).toEqual({ par3: 100, par4: 0, par5: 100 });
    expect(result.current.stats?.scramblingPercentage).toBe(50);
    // 3 chips over 1.5 eighteen-hole-equivalent rounds -> 2 per round
    expect(result.current.stats?.chipsPerRound).toBe(2);
  });

  it('excludes score-only rounds (no putts recorded) from the stats window', async () => {
    const roundsBuilder = createQueryBuilderMock({ data: [], error: null });
    (supabase.from as jest.Mock).mockReturnValueOnce(roundsBuilder);

    renderHook(() => useRoundStats());
    await waitFor(() => expect(roundsBuilder.not).toHaveBeenCalledWith('total_putts', 'is', null));
  });

});
