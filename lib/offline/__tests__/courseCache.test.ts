jest.mock('@/lib/supabase', () => ({
  supabase: { from: jest.fn() },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { createQueryBuilderMock } from '@/lib/testUtils/supabaseMock';
import { getCachedCourses, refreshCourseCache } from '../courseCache';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

describe('refreshCourseCache', () => {
  it('caches courses with holes and tees, aligning tee lengths to hole order', async () => {
    const coursesBuilder = createQueryBuilderMock({
      data: [{ id: 'c1', name: 'Pebble', hole_count: 9, total_par: 36 }],
      error: null,
    });
    const holesBuilder = createQueryBuilderMock({
      data: Array.from({ length: 9 }, (_, i) => ({
        id: `h${i + 1}`,
        course_id: 'c1',
        hole_number: i + 1,
        par: 4,
        stroke_index: i + 1,
      })),
      error: null,
    });
    const teesBuilder = createQueryBuilderMock({
      data: [
        {
          id: 't1',
          course_id: 'c1',
          name: 'Gulur',
          course_rating: 68.5,
          slope_rating: 125,
          total_length_meters: 3000,
          sort_order: 0,
          tee_lengths: [
            { hole_id: 'h1', length_meters: 300 },
            { hole_id: 'h2', length_meters: 310 },
          ],
        },
      ],
      error: null,
    });
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'courses') return coursesBuilder;
      if (table === 'holes') return holesBuilder;
      return teesBuilder;
    });

    await refreshCourseCache();
    const cached = await getCachedCourses();

    expect(cached).toHaveLength(1);
    expect(cached[0].name).toBe('Pebble');
    expect(cached[0].holes).toHaveLength(9);
    expect(cached[0].holes[0]).toEqual({ id: 'h1', hole_number: 1, par: 4, stroke_index: 1 });
    expect(cached[0].tees).toHaveLength(1);
    expect(cached[0].tees[0].name).toBe('Gulur');
    expect(cached[0].tees[0].course_rating).toBe(68.5);
    expect(cached[0].tees[0].lengths).toEqual([300, 310, null, null, null, null, null, null, null]);
  });

  it('leaves the cache untouched when a fetch fails', async () => {
    (supabase.from as jest.Mock).mockReturnValue(
      createQueryBuilderMock({ data: null, error: { message: 'offline' } })
    );

    await refreshCourseCache();

    expect(await getCachedCourses()).toEqual([]);
  });
});
