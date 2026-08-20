import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { CachedCourse, CachedHole, CachedTeeBox } from './types';

const CACHED_COURSES_KEY = 'golf.cachedCourses';

export async function getCachedCourses(): Promise<CachedCourse[]> {
  const raw = await AsyncStorage.getItem(CACHED_COURSES_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as CachedCourse[];
}

export async function refreshCourseCache(): Promise<void> {
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, name, club, hole_count, total_par');

  if (coursesError || !courses) return;

  const { data: holes, error: holesError } = await supabase
    .from('holes')
    .select('id, course_id, hole_number, par, stroke_index');

  if (holesError || !holes) return;

  const { data: teeBoxes, error: teesError } = await supabase
    .from('tee_boxes')
    .select(
      'id, course_id, name, course_rating, slope_rating, total_length_meters, sort_order, tee_lengths(hole_id, length_meters)'
    );

  if (teesError || !teeBoxes) return;

  const cached: CachedCourse[] = (courses as any[]).map((course) => {
    const courseHoles: CachedHole[] = (holes as any[])
      .filter((h) => h.course_id === course.id)
      .sort((a, b) => a.hole_number - b.hole_number)
      .map((h) => ({
        id: h.id,
        hole_number: h.hole_number,
        par: h.par,
        stroke_index: h.stroke_index,
      }));

    const holeIndexById = new Map(courseHoles.map((h, i) => [h.id, i]));

    const tees: CachedTeeBox[] = (teeBoxes as any[])
      .filter((t) => t.course_id === course.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((t) => {
        const lengths: (number | null)[] = Array(courseHoles.length).fill(null);
        for (const tl of t.tee_lengths ?? []) {
          const idx = holeIndexById.get(tl.hole_id);
          if (idx !== undefined) lengths[idx] = tl.length_meters;
        }
        return {
          id: t.id,
          name: t.name,
          course_rating: t.course_rating,
          slope_rating: t.slope_rating,
          total_length_meters: t.total_length_meters,
          lengths,
        };
      });

    return {
      id: course.id,
      name: course.name,
      club: course.club ?? null,
      hole_count: course.hole_count,
      total_par: course.total_par,
      holes: courseHoles,
      tees,
    };
  });

  await AsyncStorage.setItem(CACHED_COURSES_KEY, JSON.stringify(cached));
}
