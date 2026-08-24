jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('@/lib/offline/courseCache', () => ({ getCachedCourses: jest.fn().mockResolvedValue([]) }));

import { renderHook, waitFor } from '@testing-library/react-native';
import { supabase } from '@/lib/supabase';
import { createQueryBuilderMock } from '@/lib/testUtils/supabaseMock';
import { getCachedCourses } from '@/lib/offline/courseCache';
import { useHoleGeometry, saveHoleGeometry, copyableCourses, copyGeometry } from '../useHoleGeometry';

describe('useHoleGeometry', () => {
  beforeEach(() => jest.clearAllMocks());

  function mockHoles(rows: any[]) {
    const builder = createQueryBuilderMock({ data: rows, error: null });
    (supabase.from as jest.Mock).mockReturnValue(builder);
    return builder;
  }

  it('returns each hole with the line already saved for it', async () => {
    mockHoles([
      { id: 'h1', hole_number: 1, par: 4, hole_geometry: { points: [[64.1, -21.76], [64.11, -21.75]] } },
      { id: 'h2', hole_number: 2, par: 3, hole_geometry: null },
    ]);

    const { result } = renderHook(() => useHoleGeometry('course-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.holes).toEqual([
      { id: 'h1', hole_number: 1, par: 4, path: [[64.1, -21.76], [64.11, -21.75]] },
      { id: 'h2', hole_number: 2, par: 3, path: [] },
    ]);
  });

  it('treats an embedded geometry array the same as a single row', async () => {
    // PostgREST returns an embedded one-to-one as an array in some versions.
    mockHoles([{ id: 'h1', hole_number: 1, par: 4, hole_geometry: [{ points: [[64.1, -21.76], [64.11, -21.75]] }] }]);

    const { result } = renderHook(() => useHoleGeometry('course-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.holes[0].path).toEqual([[64.1, -21.76], [64.11, -21.75]]);
  });

  it('surfaces a load failure instead of pretending the course has no lines', async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      createQueryBuilderMock({ data: null, error: { message: 'network down' } })
    );

    const { result } = renderHook(() => useHoleGeometry('course-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('network down');
    expect(result.current.holes).toEqual([]);
  });
});

describe('saveHoleGeometry', () => {
  beforeEach(() => jest.clearAllMocks());

  it('upserts the holes that have a line', async () => {
    const builder = createQueryBuilderMock({ data: null, error: null });
    (supabase.from as jest.Mock).mockReturnValue(builder);

    await saveHoleGeometry([
      { hole_id: 'h1', path: [[64.1, -21.76], [64.11, -21.75]] },
      { hole_id: 'h2', path: [] },
    ]);

    expect(builder.upsert).toHaveBeenCalledWith(
      [{ hole_id: 'h1', points: [[64.1, -21.76], [64.11, -21.75]] }],
      { onConflict: 'hole_id' }
    );
  });

  it('deletes the geometry of a hole whose line was cleared', async () => {
    const builder = createQueryBuilderMock({ data: null, error: null });
    (supabase.from as jest.Mock).mockReturnValue(builder);

    await saveHoleGeometry([{ hole_id: 'h2', path: [] }]);

    expect(builder.delete).toHaveBeenCalled();
    expect(builder.in).toHaveBeenCalledWith('hole_id', ['h2']);
    expect(builder.upsert).not.toHaveBeenCalled();
  });

  it('refuses to save a line that is not a valid hole', async () => {
    const builder = createQueryBuilderMock({ data: null, error: null });
    (supabase.from as jest.Mock).mockReturnValue(builder);

    await expect(
      saveHoleGeometry([{ hole_id: 'h1', path: [[164.1, -21.76], [64.11, -21.75]] }])
    ).rejects.toThrow('A point is outside the valid coordinate range.');
    expect(builder.upsert).not.toHaveBeenCalled();
  });

  it('reports a failed write', async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      createQueryBuilderMock({ data: null, error: { message: 'permission denied' } })
    );

    await expect(
      saveHoleGeometry([{ hole_id: 'h1', path: [[64.1, -21.76], [64.11, -21.75]] }])
    ).rejects.toThrow('permission denied');
  });
});

describe('copyableCourses', () => {
  beforeEach(() => jest.clearAllMocks());

  const target = { id: 'target', club: 'GR', holes: [{ hole_number: 1, par: 4, stroke_index: 3 }] };

  it('offers a course of the same club whose holes match', async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'courses') {
        return createQueryBuilderMock({
          data: [
            { id: 'sibling', name: 'Korpa Landið', club: 'GR', hole_count: 9 },
            { id: 'target', name: 'Korpa Landið/Áin', club: 'GR', hole_count: 9 },
          ],
          error: null,
        });
      }
      return createQueryBuilderMock({
        data: [
          { course_id: 'sibling', hole_number: 1, par: 4, stroke_index: 3, hole_geometry: { points: [[64.1, -21.76], [64.11, -21.75]] } },
        ],
        error: null,
      });
    });

    const candidates = await copyableCourses(target.id, target.club, target.holes);

    expect(candidates.map((c) => c.id)).toEqual(['sibling']);
    expect(candidates[0].mappedHoles).toBe(1);
  });

  it('does not offer a course whose holes differ', async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'courses') {
        return createQueryBuilderMock({
          data: [{ id: 'sibling', name: 'Grafarholt', club: 'GR', hole_count: 9 }],
          error: null,
        });
      }
      return createQueryBuilderMock({
        data: [
          { course_id: 'sibling', hole_number: 1, par: 5, stroke_index: 11, hole_geometry: { points: [[64.1, -21.76], [64.11, -21.75]] } },
        ],
        error: null,
      });
    });

    expect(await copyableCourses(target.id, target.club, target.holes)).toEqual([]);
  });

  it('does not offer the course itself', async () => {
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'courses') {
        return createQueryBuilderMock({
          data: [{ id: 'target', name: 'Korpa Landið/Áin', club: 'GR', hole_count: 9 }],
          error: null,
        });
      }
      return createQueryBuilderMock({
        data: [
          { course_id: 'target', hole_number: 1, par: 4, stroke_index: 3, hole_geometry: { points: [[64.1, -21.76], [64.11, -21.75]] } },
        ],
        error: null,
      });
    });

    expect(await copyableCourses(target.id, target.club, target.holes)).toEqual([]);
  });
});

describe('copyGeometry', () => {
  it('matches source lines onto the target holes by hole number', () => {
    const target = [
      { id: 'h1', hole_number: 1, par: 4, path: [] as [number, number][] },
      { id: 'h2', hole_number: 2, par: 3, path: [] as [number, number][] },
    ];
    const source = [{ hole_number: 2, path: [[64.1, -21.76], [64.11, -21.75]] as [number, number][] }];

    expect(copyGeometry(target, source)).toEqual([
      { id: 'h1', hole_number: 1, par: 4, path: [] },
      { id: 'h2', hole_number: 2, par: 3, path: [[64.1, -21.76], [64.11, -21.75]] },
    ]);
  });

  it('leaves a hole that already has a line alone', () => {
    const existing: [number, number][] = [[64.2, -21.7], [64.21, -21.69]];
    const target = [{ id: 'h1', hole_number: 1, par: 4, path: existing }];
    const source = [{ hole_number: 1, path: [[64.1, -21.76], [64.11, -21.75]] as [number, number][] }];

    expect(copyGeometry(target, source)[0].path).toEqual(existing);
  });
});

describe('useHoleGeometry without a course', () => {
  beforeEach(() => jest.clearAllMocks());

  it('asks the database for nothing when there is no course id', async () => {
    const { result } = renderHook(() => useHoleGeometry(undefined));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(supabase.from).not.toHaveBeenCalled();
    expect(result.current.holes).toEqual([]);
  });
});

describe('useHoleGeometry offline', () => {
  beforeEach(() => jest.clearAllMocks());

  it('falls back to the cached course when the network fetch fails', async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      createQueryBuilderMock({ data: null, error: { message: 'network down' } })
    );
    (getCachedCourses as jest.Mock).mockResolvedValue([
      {
        id: 'course-1',
        name: 'Landið',
        holes: [
          { id: 'h1', hole_number: 1, par: 4, stroke_index: 1, path: [[64.15, -21.765], [64.152, -21.76]] },
        ],
        tees: [],
      },
    ]);

    const { result } = renderHook(() => useHoleGeometry('course-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.holes).toEqual([
      { id: 'h1', hole_number: 1, par: 4, path: [[64.15, -21.765], [64.152, -21.76]] },
    ]);
    expect(result.current.error).toBeNull();
  });

  it('still reports the failure when the cache has nothing either', async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      createQueryBuilderMock({ data: null, error: { message: 'network down' } })
    );
    (getCachedCourses as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useHoleGeometry('course-1'));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('network down');
  });
});
