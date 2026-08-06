jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), auth: { getUser: jest.fn() } },
}));
jest.mock('@/lib/training/seedRoutines', () => ({ seedStarterRoutines: jest.fn() }));

import { renderHook, waitFor } from '@testing-library/react-native';
import { supabase } from '@/lib/supabase';
import { seedStarterRoutines } from '@/lib/training/seedRoutines';
import { createQueryBuilderMock } from '@/lib/testUtils/supabaseMock';
import {
  useRoutines,
  useRoutine,
  saveRoutine,
  deleteRoutine,
  RoutineValidationError,
  type DrillInput,
} from '../useRoutines';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useRoutines', () => {
  it('loads routines from supabase', async () => {
    const mockRoutines = [{ id: '1', name: 'Putting Ladder', description: null, category: 'putts' }];
    (supabase.from as jest.Mock).mockReturnValue(createQueryBuilderMock({ data: mockRoutines, error: null }));

    const { result } = renderHook(() => useRoutines());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.routines).toEqual(mockRoutines);
    expect(seedStarterRoutines).not.toHaveBeenCalled();
  });

  it('seeds the starter routines when the user has none yet', async () => {
    const seeded = [{ id: '1', name: '3-6-9 Ladder', description: null, category: 'putts' }];
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(createQueryBuilderMock({ data: [], error: null }))
      .mockReturnValueOnce(createQueryBuilderMock({ data: seeded, error: null }));
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } });
    (seedStarterRoutines as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useRoutines());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(seedStarterRoutines).toHaveBeenCalledWith('user-1');
    expect(result.current.routines).toEqual(seeded);
  });

  it('surfaces an error message on failure', async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      createQueryBuilderMock({ data: null, error: { message: 'network down' } })
    );

    const { result } = renderHook(() => useRoutines());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('network down');
    expect(result.current.routines).toEqual([]);
  });
});

describe('useRoutine', () => {
  it('returns a blank routine for "new" without hitting the network', () => {
    const { result } = renderHook(() => useRoutine('new'));

    expect(result.current.loading).toBe(false);
    expect(result.current.routine).toEqual({ id: null, name: '', description: null, category: 'putts' });
    expect(result.current.drills).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('loads an existing routine and its drills', async () => {
    const routineBuilder = createQueryBuilderMock({
      data: { id: 'abc', name: 'Ladder', description: 'desc', category: 'putts' },
      error: null,
    });
    const drillsBuilder = createQueryBuilderMock({
      data: [{ id: 'd1', name: '3ft putts', target_value: 10, photo_url: null }],
      error: null,
    });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === 'training_routines' ? routineBuilder : drillsBuilder
    );

    const { result } = renderHook(() => useRoutine('abc'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.routine).toEqual({ id: 'abc', name: 'Ladder', description: 'desc', category: 'putts' });
    expect(result.current.drills).toEqual([{ id: 'd1', name: '3ft putts', target_value: 10, photo_url: null }]);
  });
});

describe('saveRoutine', () => {
  const validDrills: DrillInput[] = [{ name: '3ft putts', target_value: 10, photo_url: null }];

  it('throws RoutineValidationError when name is empty', async () => {
    await expect(
      saveRoutine({ name: '', description: null, category: 'putts', drills: validDrills })
    ).rejects.toThrow(RoutineValidationError);
  });

  it('throws RoutineValidationError with no drills', async () => {
    await expect(
      saveRoutine({ name: 'Test', description: null, category: 'putts', drills: [] })
    ).rejects.toThrow(RoutineValidationError);
  });

  it('throws RoutineValidationError when a drill has no name', async () => {
    await expect(
      saveRoutine({
        name: 'Test',
        description: null,
        category: 'putts',
        drills: [{ name: '', target_value: null, photo_url: null }],
      })
    ).rejects.toThrow(RoutineValidationError);
  });

  it('inserts a new routine and its drills, returning the new id', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const insertRoutineBuilder = createQueryBuilderMock({ data: { id: 'new-routine-id' }, error: null });
    const insertDrillsBuilder = createQueryBuilderMock({ data: null, error: null });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === 'training_routines' ? insertRoutineBuilder : insertDrillsBuilder
    );

    const id = await saveRoutine({
      name: 'New Routine',
      description: 'A test routine',
      category: 'putts',
      drills: validDrills,
    });

    expect(id).toBe('new-routine-id');
    expect(insertRoutineBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', name: 'New Routine', description: 'A test routine', category: 'putts' })
    );
    expect(insertDrillsBuilder.insert).toHaveBeenCalledWith([
      { routine_id: 'new-routine-id', name: '3ft putts', target_value: 10, photo_url: null, sort_order: 0 },
    ]);
  });

  it('updates an existing routine, upserting kept drills and inserting new ones', async () => {
    const updateBuilder = createQueryBuilderMock({ data: null, error: null });
    const deleteBuilder = createQueryBuilderMock({ data: null, error: null });
    const upsertBuilder = createQueryBuilderMock({ data: null, error: null });
    const insertBuilder = createQueryBuilderMock({ data: null, error: null });
    let drillsCallCount = 0;

    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'training_routines') return updateBuilder;
      drillsCallCount += 1;
      // 1st call: the delete-of-removed-drills chain. 2nd: upsert kept drills. 3rd: insert new drills.
      if (drillsCallCount === 1) return deleteBuilder;
      if (drillsCallCount === 2) return upsertBuilder;
      return insertBuilder;
    });

    const drills: DrillInput[] = [
      { id: 'kept-1', name: '3ft putts', target_value: 10, photo_url: null },
      { name: '6ft putts', target_value: 8, photo_url: null },
    ];

    const id = await saveRoutine({ id: 'existing-id', name: 'Updated', description: null, category: 'putts', drills });

    expect(id).toBe('existing-id');
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Updated', description: null, category: 'putts' })
    );
    expect(deleteBuilder.not).toHaveBeenCalledWith('id', 'in', '(kept-1)');
    expect(upsertBuilder.upsert).toHaveBeenCalledWith([
      { id: 'kept-1', routine_id: 'existing-id', name: '3ft putts', target_value: 10, photo_url: null, sort_order: 0 },
    ]);
    expect(insertBuilder.insert).toHaveBeenCalledWith([
      { routine_id: 'existing-id', name: '6ft putts', target_value: 8, photo_url: null, sort_order: 1 },
    ]);
  });

  it('surfaces a friendly error when a removed drill has sessions logged against it', async () => {
    const updateBuilder = createQueryBuilderMock({ data: null, error: null });
    const deleteBuilder = createQueryBuilderMock({ data: null, error: { code: '23503', message: 'fk violation' } });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === 'training_routines' ? updateBuilder : deleteBuilder
    );

    await expect(
      saveRoutine({ id: 'existing-id', name: 'Updated', description: null, category: 'putts', drills: validDrills })
    ).rejects.toThrow("A removed drill has training sessions logged against it and can't be deleted.");
  });
});

describe('deleteRoutine', () => {
  it('deletes the routine', async () => {
    const deleteBuilder = createQueryBuilderMock({ data: null, error: null });
    (supabase.from as jest.Mock).mockReturnValue(deleteBuilder);

    await deleteRoutine('abc');

    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenCalledWith('id', 'abc');
  });

  it('surfaces a friendly error on FK violation', async () => {
    const deleteBuilder = createQueryBuilderMock({ data: null, error: { code: '23503', message: 'fk violation' } });
    (supabase.from as jest.Mock).mockReturnValue(deleteBuilder);

    await expect(deleteRoutine('abc')).rejects.toThrow("This routine has sessions logged against it and can't be deleted.");
  });
});
