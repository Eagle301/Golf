import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import type { CachedCourse } from './types';

const CACHED_COURSES_KEY = 'golf.cachedCourses';

export async function getCachedCourses(): Promise<CachedCourse[]> {
  const raw = await AsyncStorage.getItem(CACHED_COURSES_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as CachedCourse[];
}

export async function refreshCourseCache(): Promise<void> {
  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, name, hole_count, total_par, total_length_meters, course_rating, slope_rating');

  if (coursesError || !courses) return;

  const { data: holes, error: holesError } = await supabase
    .from('holes')
    .select('id, course_id, hole_number, par, length_meters, stroke_index');

  if (holesError || !holes) return;

  const cached: CachedCourse[] = (courses as any[]).map((course) => ({
    id: course.id,
    name: course.name,
    hole_count: course.hole_count,
    total_par: course.total_par,
    total_length_meters: course.total_length_meters,
    course_rating: course.course_rating,
    slope_rating: course.slope_rating,
    holes: (holes as any[])
      .filter((h) => h.course_id === course.id)
      .sort((a, b) => a.hole_number - b.hole_number)
      .map((h) => ({
        id: h.id,
        hole_number: h.hole_number,
        par: h.par,
        length_meters: h.length_meters,
        stroke_index: h.stroke_index,
      })),
  }));

  await AsyncStorage.setItem(CACHED_COURSES_KEY, JSON.stringify(cached));
}
