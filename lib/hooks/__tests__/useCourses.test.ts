jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn(), auth: { getUser: jest.fn() } },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { supabase } from '@/lib/supabase';
import { createQueryBuilderMock } from '@/lib/testUtils/supabaseMock';
import {
  useCourses,
  useCourse,
  saveCourse,
  deleteCourse,
  CourseValidationError,
  type HoleInput,
} from '../useCourses';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useCourses', () => {
  it('loads courses from supabase', async () => {
    const mockCourses = [{ id: '1', name: 'Test Course', total_par: 72, total_length_meters: 6000 }];
    (supabase.from as jest.Mock).mockReturnValue(createQueryBuilderMock({ data: mockCourses, error: null }));

    const { result } = renderHook(() => useCourses());

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.courses).toEqual(mockCourses);
    expect(result.current.error).toBeNull();
  });

  it('surfaces an error message on failure', async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      createQueryBuilderMock({ data: null, error: { message: 'network down' } })
    );

    const { result } = renderHook(() => useCourses());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('network down');
    expect(result.current.courses).toEqual([]);
  });
});

describe('useCourse', () => {
  it('returns 18 blank holes for a new course without hitting the network', () => {
    const { result } = renderHook(() => useCourse('new'));

    expect(result.current.loading).toBe(false);
    expect(result.current.holes).toHaveLength(18);
    expect(result.current.holes[0]).toEqual({ hole_number: 1, par: null, length_meters: null });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('loads an existing course and merges holes by hole_number', async () => {
    const courseBuilder = createQueryBuilderMock({
      data: { id: 'abc', name: 'Pebble', hole_count: 18 },
      error: null,
    });
    const holesBuilder = createQueryBuilderMock({
      data: [{ hole_number: 1, par: 4, length_meters: 380 }],
      error: null,
    });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === 'courses' ? courseBuilder : holesBuilder
    );

    const { result } = renderHook(() => useCourse('abc'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.course).toEqual({ id: 'abc', name: 'Pebble', hole_count: 18 });
    expect(result.current.holes).toHaveLength(18);
    expect(result.current.holes[0]).toEqual({ hole_number: 1, par: 4, length_meters: 380 });
    expect(result.current.holes[1]).toEqual({ hole_number: 2, par: null, length_meters: null });
  });
});

describe('saveCourse', () => {
  const validHoles: HoleInput[] = Array.from({ length: 18 }, (_, i) => ({
    hole_number: i + 1,
    par: 4,
    length_meters: 350,
  }));

  it('throws CourseValidationError when name is empty', async () => {
    await expect(saveCourse({ name: '', hole_count: 18, holes: validHoles })).rejects.toThrow(
      CourseValidationError
    );
  });

  it('throws CourseValidationError when a hole is missing par', async () => {
    const holes = [...validHoles];
    holes[0] = { ...holes[0], par: null };
    await expect(saveCourse({ name: 'Test', hole_count: 18, holes })).rejects.toThrow(CourseValidationError);
  });

  it('inserts a new course and upserts holes, returning the new id', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const insertBuilder = createQueryBuilderMock({ data: { id: 'new-course-id' }, error: null });
    const upsertBuilder = createQueryBuilderMock({ data: null, error: null });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === 'courses' ? insertBuilder : upsertBuilder
    );

    const id = await saveCourse({ name: 'New Course', hole_count: 18, holes: validHoles });

    expect(id).toBe('new-course-id');
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        name: 'New Course',
        total_par: 72,
        total_length_meters: 6300,
      })
    );
    expect(upsertBuilder.upsert).toHaveBeenCalledWith(expect.any(Array), {
      onConflict: 'course_id,hole_number',
    });
  });

  it('updates an existing course when id is provided', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const updateBuilder = createQueryBuilderMock({ data: null, error: null });
    const upsertBuilder = createQueryBuilderMock({ data: null, error: null });
    (supabase.from as jest.Mock).mockImplementation((table: string) =>
      table === 'courses' ? updateBuilder : upsertBuilder
    );

    const id = await saveCourse({ id: 'existing-id', name: 'Updated', hole_count: 18, holes: validHoles });

    expect(id).toBe('existing-id');
    expect(updateBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated' }));
    expect(updateBuilder.eq).toHaveBeenCalledWith('id', 'existing-id');
  });
});

describe('deleteCourse', () => {
  it('deletes the course', async () => {
    const deleteBuilder = createQueryBuilderMock({ data: null, error: null });
    (supabase.from as jest.Mock).mockReturnValue(deleteBuilder);

    await deleteCourse('abc');

    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenCalledWith('id', 'abc');
  });

  it('surfaces a friendly error on FK violation', async () => {
    const deleteBuilder = createQueryBuilderMock({
      data: null,
      error: { code: '23503', message: 'fk violation' },
    });
    (supabase.from as jest.Mock).mockReturnValue(deleteBuilder);

    await expect(deleteCourse('abc')).rejects.toThrow(
      "This course has rounds logged against it and can't be deleted."
    );
  });
});
