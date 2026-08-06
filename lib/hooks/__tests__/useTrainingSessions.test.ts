jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), auth: { getUser: jest.fn() } },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { supabase } from '@/lib/supabase';
import { createQueryBuilderMock } from '@/lib/testUtils/supabaseMock';
import { useTrainingSessions } from '../useTrainingSessions';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useTrainingSessions', () => {
  it('loads sessions from supabase', async () => {
    const mockSessions = [
      { id: '1', date_played: '2026-01-01', note: null, training_routines: { name: 'Ladder', category: 'putts' } },
    ];
    (supabase.from as jest.Mock).mockReturnValue(createQueryBuilderMock({ data: mockSessions, error: null }));

    const { result } = renderHook(() => useTrainingSessions());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.sessions).toEqual(mockSessions);
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      createQueryBuilderMock({ data: null, error: { message: 'network down' } })
    );

    const { result } = renderHook(() => useTrainingSessions());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('network down');
    expect(result.current.sessions).toEqual([]);
  });
});
