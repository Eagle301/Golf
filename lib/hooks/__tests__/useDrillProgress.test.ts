jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), auth: { getUser: jest.fn() } },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { supabase } from '@/lib/supabase';
import { createQueryBuilderMock } from '@/lib/testUtils/supabaseMock';
import { useDrillProgress } from '../useDrillProgress';

beforeEach(() => {
  jest.clearAllMocks();
});

function mockTables(tables: Record<string, { data: any; error: any }>) {
  (supabase.from as jest.Mock).mockImplementation((table: string) =>
    createQueryBuilderMock(tables[table] ?? { data: null, error: { message: `unexpected table ${table}` } })
  );
}

describe('useDrillProgress', () => {
  it('builds a per-drill series of logged values across sessions, oldest first', async () => {
    mockTables({
      training_routines: { data: { name: '3-6-9 Ladder' }, error: null },
      training_drills: {
        data: [
          { id: 'd1', name: '3m putts', target_value: 8, sort_order: 0 },
          { id: 'd2', name: '6m putts', target_value: 5, sort_order: 1 },
        ],
        error: null,
      },
      training_sessions: {
        data: [
          {
            id: 's1',
            date_played: '2026-08-01',
            training_drill_logs: [
              { drill_id: 'd1', value: 6 },
              { drill_id: 'd2', value: 4 },
            ],
          },
          {
            id: 's2',
            date_played: '2026-08-10',
            training_drill_logs: [
              { drill_id: 'd1', value: 7 },
              { drill_id: 'd2', value: null },
            ],
          },
        ],
        error: null,
      },
    });

    const { result } = renderHook(() => useDrillProgress('routine-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.routineName).toBe('3-6-9 Ladder');
    expect(result.current.drills).toEqual([
      {
        drillId: 'd1',
        name: '3m putts',
        targetValue: 8,
        points: [
          { sessionId: 's1', date: '2026-08-01', value: 6 },
          { sessionId: 's2', date: '2026-08-10', value: 7 },
        ],
      },
      {
        drillId: 'd2',
        name: '6m putts',
        targetValue: 5,
        // s2's null value is skipped - only logged values chart
        points: [{ sessionId: 's1', date: '2026-08-01', value: 4 }],
      },
    ]);
  });

  it('surfaces an error message on failure', async () => {
    mockTables({
      training_routines: { data: null, error: { message: 'network down' } },
      training_drills: { data: [], error: null },
      training_sessions: { data: [], error: null },
    });

    const { result } = renderHook(() => useDrillProgress('routine-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('network down');
    expect(result.current.drills).toEqual([]);
  });
});
