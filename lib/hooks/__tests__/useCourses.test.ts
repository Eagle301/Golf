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
  type TeeBoxInput,
} from '../useCourses';

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useCourses', () => {
  it('loads courses with their tee boxes from supabase', async () => {
    const mockCourses = [
      {
        id: '1',
        name: 'Test Course',
        hole_count: 18,
        total_par: 72,
        tee_boxes: [{ name: 'Gulur', course_rating: 70.9, slope_rating: 127, total_length_meters: 5600 }],
      },
    ];
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
  it('returns 18 blank holes and one blank tee for a new course without hitting the network', () => {
    const { result } = renderHook(() => useCourse('new'));

    expect(result.current.loading).toBe(false);
    expect(result.current.holes).toHaveLength(18);
    expect(result.current.holes[0]).toEqual({ hole_number: 1, par: null, stroke_index: null });
    expect(result.current.tees).toHaveLength(1);
    expect(result.current.tees[0]).toEqual({
      name: '',
      course_rating: null,
      slope_rating: null,
      lengths: Array(18).fill(null),
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('loads an existing course, merging holes and mapping tee lengths to hole positions', async () => {
    const courseBuilder = createQueryBuilderMock({
      data: { id: 'abc', name: 'Pebble', hole_count: 18 },
      error: null,
    });
    const holesBuilder = createQueryBuilderMock({
      data: [{ id: 'h1', hole_number: 1, par: 4, stroke_index: 7 }],
      error: null,
    });
    const teesBuilder = createQueryBuilderMock({
      data: [
        {
          id: 't1',
          name: 'Gulur',
          course_rating: 72.5,
          slope_rating: 130,
          sort_order: 0,
          tee_lengths: [{ hole_id: 'h1', length_meters: 380 }],
        },
      ],
      error: null,
    });
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'courses') return courseBuilder;
      if (table === 'holes') return holesBuilder;
      return teesBuilder;
    });

    const { result } = renderHook(() => useCourse('abc'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.course).toEqual({ id: 'abc', name: 'Pebble', hole_count: 18 });
    expect(result.current.holes).toHaveLength(18);
    expect(result.current.holes[0]).toEqual({ hole_number: 1, par: 4, stroke_index: 7 });
    expect(result.current.holes[1]).toEqual({ hole_number: 2, par: null, stroke_index: null });
    expect(result.current.tees).toHaveLength(1);
    expect(result.current.tees[0].id).toBe('t1');
    expect(result.current.tees[0].name).toBe('Gulur');
    expect(result.current.tees[0].lengths[0]).toBe(380);
    expect(result.current.tees[0].lengths[1]).toBeNull();
    expect(result.current.tees[0].lengths).toHaveLength(18);
  });
});

describe('saveCourse', () => {
  const validHoles: HoleInput[] = Array.from({ length: 18 }, (_, i) => ({
    hole_number: i + 1,
    par: 4,
    stroke_index: i + 1,
  }));
  const validTee: TeeBoxInput = {
    name: 'Gulur',
    course_rating: 70.9,
    slope_rating: 127,
    lengths: Array(18).fill(350),
  };

  it('throws CourseValidationError when name is empty', async () => {
    await expect(
      saveCourse({ name: '', hole_count: 18, holes: validHoles, tees: [validTee] })
    ).rejects.toThrow(CourseValidationError);
  });

  it('throws CourseValidationError when there are no tees', async () => {
    await expect(saveCourse({ name: 'Test', hole_count: 18, holes: validHoles, tees: [] })).rejects.toThrow(
      /at least one tee/i
    );
  });

  it('throws CourseValidationError when a tee has no name', async () => {
    await expect(
      saveCourse({ name: 'Test', hole_count: 18, holes: validHoles, tees: [{ ...validTee, name: ' ' }] })
    ).rejects.toThrow(/needs a name/i);
  });

  it('throws CourseValidationError on duplicate tee names', async () => {
    await expect(
      saveCourse({ name: 'Test', hole_count: 18, holes: validHoles, tees: [validTee, { ...validTee }] })
    ).rejects.toThrow(/duplicated/i);
  });

  it('throws CourseValidationError when a tee is missing its course rating', async () => {
    await expect(
      saveCourse({
        name: 'Test',
        hole_count: 18,
        holes: validHoles,
        tees: [{ ...validTee, course_rating: null }],
      })
    ).rejects.toThrow(/course rating/i);
  });

  it('throws CourseValidationError when a tee slope is out of range', async () => {
    await expect(
      saveCourse({
        name: 'Test',
        hole_count: 18,
        holes: validHoles,
        tees: [{ ...validTee, slope_rating: 200 }],
      })
    ).rejects.toThrow(/slope rating/i);
  });

  it('throws CourseValidationError when a tee is missing a hole length', async () => {
    const lengths = Array(18).fill(350);
    lengths[4] = null;
    await expect(
      saveCourse({ name: 'Test', hole_count: 18, holes: validHoles, tees: [{ ...validTee, lengths }] })
    ).rejects.toThrow(/length for hole 5/i);
  });

  it('throws CourseValidationError when a hole is missing par', async () => {
    const holes = [...validHoles];
    holes[0] = { ...holes[0], par: null };
    await expect(saveCourse({ name: 'Test', hole_count: 18, holes, tees: [validTee] })).rejects.toThrow(
      CourseValidationError
    );
  });

  it('throws CourseValidationError when stroke indexes are not unique', async () => {
    const holes = validHoles.map((h) => ({ ...h, stroke_index: 1 }));
    await expect(saveCourse({ name: 'Test', hole_count: 18, holes, tees: [validTee] })).rejects.toThrow(
      CourseValidationError
    );
  });

  function mockTables() {
    const holeRows = Array.from({ length: 18 }, (_, i) => ({ id: `h${i + 1}`, hole_number: i + 1 }));
    const courseBuilder = createQueryBuilderMock({ data: { id: 'course-1' }, error: null });
    const holesBuilder = createQueryBuilderMock({ data: holeRows, error: null });
    const teesBuilder = createQueryBuilderMock({ data: [{ id: 't-new', name: 'Gulur' }], error: null });
    const teeLengthsBuilder = createQueryBuilderMock({ data: null, error: null });
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'courses') return courseBuilder;
      if (table === 'holes') return holesBuilder;
      if (table === 'tee_boxes') return teesBuilder;
      return teeLengthsBuilder;
    });
    return { courseBuilder, holesBuilder, teesBuilder, teeLengthsBuilder };
  }

  it('inserts a new course, holes, tee boxes and tee lengths', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const { courseBuilder, holesBuilder, teesBuilder, teeLengthsBuilder } = mockTables();

    const id = await saveCourse({ name: 'New Course', hole_count: 18, holes: validHoles, tees: [validTee] });

    expect(id).toBe('course-1');
    expect(courseBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-1', name: 'New Course', hole_count: 18, total_par: 72 })
    );
    expect(holesBuilder.upsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ course_id: 'course-1', hole_number: 1, par: 4, stroke_index: 1 }),
      ]),
      { onConflict: 'course_id,hole_number' }
    );
    // New tee (no id) is inserted with its denormalized total length.
    expect(teesBuilder.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        course_id: 'course-1',
        name: 'Gulur',
        course_rating: 70.9,
        slope_rating: 127,
        total_length_meters: 6300,
        sort_order: 0,
      }),
    ]);
    // Lengths are rewritten: one row per (tee, hole).
    expect(teeLengthsBuilder.delete).toHaveBeenCalled();
    const insertedLengths = (teeLengthsBuilder.insert as jest.Mock).mock.calls[0][0];
    expect(insertedLengths).toHaveLength(18);
    expect(insertedLengths[0]).toEqual({ tee_box_id: 't-new', hole_id: 'h1', length_meters: 350 });
  });

  it('updates an existing course, upserting existing tees and deleting removed ones', async () => {
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } });
    const { courseBuilder, teesBuilder } = mockTables();

    const id = await saveCourse({
      id: 'existing-id',
      name: 'Updated',
      hole_count: 18,
      holes: validHoles,
      tees: [{ ...validTee, id: 't1' }],
    });

    expect(id).toBe('existing-id');
    expect(courseBuilder.update).toHaveBeenCalledWith(expect.objectContaining({ name: 'Updated' }));
    expect(courseBuilder.eq).toHaveBeenCalledWith('id', 'existing-id');
    // Existing tee updates in place under its id.
    expect(teesBuilder.upsert).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 't1', name: 'Gulur' })],
      { onConflict: 'id' }
    );
    // Tees no longer present are removed.
    expect(teesBuilder.delete).toHaveBeenCalled();
    expect(teesBuilder.eq).toHaveBeenCalledWith('course_id', 'existing-id');
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
