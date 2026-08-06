jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), auth: { getUser: jest.fn() } },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { supabase } from '@/lib/supabase';
import { createQueryBuilderMock } from '@/lib/testUtils/supabaseMock';
import { useTrainingSession, saveTrainingSession, deleteTrainingSession } from '../useTrainingSession';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useTrainingSession', () => {
  it('loads a session with its drill results, sorted by drill order', async () => {
    const sessionBuilder = createQueryBuilderMock({
      data: { date_played: '2026-01-01', note: 'Felt good', training_routines: { name: 'Ladder' } },
      error: null,
    });
    const drillLogsBuilder = createQueryBuilderMock({
      data: [
        {
          value: 6,
          training_drills: { id: 'd2', name: '6ft putts', target_value: 8, photo_url: null, sort_order: 1 },
        },
        {
          value: 8,
          training_drills: { id: 'd1', name: '3ft putts', target_value: 10, photo_url: null, sort_order: 0 },
        },
      ],
      error: null,
    });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === 'training_sessions' ? sessionBuilder : drillLogsBuilder
    );

    const { result } = renderHook(() => useTrainingSession('session-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.session).toEqual({
      routineName: 'Ladder',
      datePlayed: '2026-01-01',
      note: 'Felt good',
      drills: [
        { drill_id: 'd1', name: '3ft putts', target_value: 10, photo_url: null, value: 8, sort_order: 0 },
        { drill_id: 'd2', name: '6ft putts', target_value: 8, photo_url: null, value: 6, sort_order: 1 },
      ],
    });
  });

  it('surfaces an error message when the session is not found', async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      createQueryBuilderMock({ data: null, error: { message: 'not found' } })
    );

    const { result } = renderHook(() => useTrainingSession('missing'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('not found');
    expect(result.current.session).toBeNull();
  });
});

describe('saveTrainingSession', () => {
  it('inserts the session and its drill logs', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const insertSessionBuilder = createQueryBuilderMock({ data: { id: 'new-session-id' }, error: null });
    const insertLogsBuilder = createQueryBuilderMock({ data: null, error: null });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === 'training_sessions' ? insertSessionBuilder : insertLogsBuilder
    );

    const id = await saveTrainingSession({
      routineId: 'routine-1',
      datePlayed: '2026-01-01',
      note: 'Good session',
      results: [{ drillId: 'd1', value: 8 }],
    });

    expect(id).toBe('new-session-id');
    expect(insertSessionBuilder.insert).toHaveBeenCalledWith({
      user_id: 'user-1',
      routine_id: 'routine-1',
      date_played: '2026-01-01',
      note: 'Good session',
    });
    expect(insertLogsBuilder.insert).toHaveBeenCalledWith([
      { session_id: 'new-session-id', drill_id: 'd1', value: 8 },
    ]);
  });

  it('throws when not authenticated', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: null } });

    await expect(
      saveTrainingSession({ routineId: 'r1', datePlayed: '2026-01-01', note: null, results: [] })
    ).rejects.toThrow('Not authenticated.');
  });
});

describe('deleteTrainingSession', () => {
  it('deletes the session', async () => {
    const deleteBuilder = createQueryBuilderMock({ data: null, error: null });
    (supabase.from as jest.Mock).mockReturnValue(deleteBuilder);

    await deleteTrainingSession('session-1');

    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenCalledWith('id', 'session-1');
  });
});
