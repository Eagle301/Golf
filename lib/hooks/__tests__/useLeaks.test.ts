jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), auth: { getUser: jest.fn() } },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { supabase } from '@/lib/supabase';
import { createQueryBuilderMock } from '@/lib/testUtils/supabaseMock';
import { useLeaks } from '../useLeaks';

beforeEach(() => {
  jest.clearAllMocks();
});

function mockTables(tables: Record<string, { data: any; error: any }>) {
  const builders: Record<string, any> = {};
  (supabase.from as jest.Mock).mockImplementation((table: string) => {
    builders[table] =
      builders[table] ??
      createQueryBuilderMock(tables[table] ?? { data: null, error: { message: `unexpected table ${table}` } });
    return builders[table];
  });
  return builders;
}

describe('useLeaks', () => {
  it('returns all leaks ranked from the last rounds of hole logs, unwrapping each joined par', async () => {
    const hit = { putts: null, penalties: 0, chip_shots: 0, gir: null, score: 4, fairway_hit: 'yes', holes: { par: 4 } };
    const miss = { ...hit, score: 5, fairway_hit: 'missed_left' };
    mockTables({
      rounds: { data: [{ id: 'r1' }, { id: 'r2' }], error: null },
      hole_logs: { data: [...Array(5).fill(hit), ...Array(5).fill(miss)], error: null },
    });

    const { result } = renderHook(() => useLeaks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.leaks[0]).toEqual({
      kind: 'tee_shots',
      strokesPerRound: 2.5,
      category: 'full_swing',
      hitAvgVsPar: 0,
      missAvgVsPar: 1,
    });
    expect(result.current.leaks).toHaveLength(6);
    expect(result.current.error).toBeNull();
  });

  it('counts a 9-hole round as half a round, so per-round rates are 18-hole equivalents', async () => {
    mockTables({
      rounds: {
        data: [
          { id: 'r1', courses: { hole_count: 9 } },
          { id: 'r2', courses: { hole_count: 9 } },
        ],
        error: null,
      },
      hole_logs: {
        data: [
          { putts: 3, penalties: 0, chip_shots: 2, gir: false, score: null, fairway_hit: null, holes: { par: 4 } },
        ],
        error: null,
      },
    });

    const { result } = renderHook(() => useLeaks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Two 9-hole rounds = one 18-hole equivalent: 1 lost putt stroke -> 1.0
    // per round (not 0.5), 2 chips -> 2.0 per round (not 1.0).
    const threePutts = result.current.leaks.find((l) => l.kind === 'three_putts');
    expect(threePutts?.strokesPerRound).toBe(1);
    expect(threePutts?.perRound).toBe(1);
    const chips = result.current.leaks.find((l) => l.kind === 'chips');
    expect(chips?.perRound).toBe(2);
  });

  it('excludes score-only rounds (no putts recorded) from the stats window', async () => {
    const builders = mockTables({
      rounds: { data: [], error: null },
      hole_logs: { data: [], error: null },
    });

    renderHook(() => useLeaks());
    await waitFor(() => expect(builders.rounds.not).toHaveBeenCalledWith('total_putts', 'is', null));
  });

  it('returns no leaks when there are no rounds yet', async () => {
    mockTables({
      rounds: { data: [], error: null },
      hole_logs: { data: [], error: null },
    });

    const { result } = renderHook(() => useLeaks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.leaks).toEqual([]);
  });

  it('surfaces an error message on failure', async () => {
    mockTables({
      rounds: { data: null, error: { message: 'network down' } },
    });

    const { result } = renderHook(() => useLeaks());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('network down');
    expect(result.current.leaks).toEqual([]);
  });
});
