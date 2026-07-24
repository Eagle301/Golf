import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type HoleCount = 9 | 18;

export interface HoleInput {
  hole_number: number;
  par: 3 | 4 | 5 | null;
  length_meters: number | null;
}

export interface CourseListItem {
  id: string;
  name: string;
  hole_count: HoleCount;
  total_par: number | null;
  total_length_meters: number | null;
}

export interface SaveCourseInput {
  id?: string;
  name: string;
  hole_count: HoleCount;
  holes: HoleInput[];
}

export class CourseValidationError extends Error {}

function blankHoles(count: HoleCount): HoleInput[] {
  return Array.from({ length: count }, (_, i) => ({ hole_number: i + 1, par: null, length_meters: null }));
}

export interface UseCoursesResult {
  courses: CourseListItem[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCourses(): UseCoursesResult {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('courses')
      .select('id, name, hole_count, total_par, total_length_meters')
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setCourses((data as CourseListItem[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return { courses, loading, error, refetch: fetchCourses };
}

export interface UseCourseResult {
  course: { id: string | null; name: string; hole_count: HoleCount };
  holes: HoleInput[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCourse(id: string): UseCourseResult {
  const isNew = id === 'new';
  const [course, setCourse] = useState<{ id: string | null; name: string; hole_count: HoleCount }>({
    id: null,
    name: '',
    hole_count: 18,
  });
  const [holes, setHoles] = useState<HoleInput[]>(blankHoles(18));
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);

  const fetchCourse = useCallback(async () => {
    if (isNew) {
      setCourse({ id: null, name: '', hole_count: 18 });
      setHoles(blankHoles(18));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [courseResult, holesResult] = await Promise.all([
      supabase.from('courses').select('id, name, hole_count').eq('id', id).single(),
      supabase.from('holes').select('hole_number, par, length_meters').eq('course_id', id).order('hole_number'),
    ]);

    if (courseResult.error) {
      setError(courseResult.error.message);
      setLoading(false);
      return;
    }
    if (holesResult.error) {
      setError(holesResult.error.message);
      setLoading(false);
      return;
    }

    const courseData = courseResult.data as { id: string; name: string; hole_count: HoleCount };
    setCourse({ id: courseData.id, name: courseData.name, hole_count: courseData.hole_count });

    const holesByNumber = new Map<number, HoleInput>(
      ((holesResult.data as HoleInput[]) ?? []).map((h) => [h.hole_number, h])
    );
    setHoles(
      Array.from({ length: courseData.hole_count }, (_, i) => {
        const holeNumber = i + 1;
        return holesByNumber.get(holeNumber) ?? { hole_number: holeNumber, par: null, length_meters: null };
      })
    );
    setLoading(false);
  }, [id, isNew]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  return { course, holes, loading, error, refetch: fetchCourse };
}

function validateSaveCourseInput(input: SaveCourseInput): void {
  if (!input.name.trim()) {
    throw new CourseValidationError('Course name is required.');
  }
  if (input.holes.length !== input.hole_count) {
    throw new CourseValidationError(`All ${input.hole_count} holes must be filled in.`);
  }
  for (const hole of input.holes) {
    if (hole.par !== 3 && hole.par !== 4 && hole.par !== 5) {
      throw new CourseValidationError(`Hole ${hole.hole_number} needs a par of 3, 4, or 5.`);
    }
    if (!hole.length_meters || hole.length_meters <= 0) {
      throw new CourseValidationError(`Hole ${hole.hole_number} needs a length in meters.`);
    }
  }
}

export async function saveCourse(input: SaveCourseInput): Promise<string> {
  validateSaveCourseInput(input);

  const totalPar = input.holes.reduce((sum, h) => sum + (h.par ?? 0), 0);
  const totalLength = input.holes.reduce((sum, h) => sum + (h.length_meters ?? 0), 0);

  let courseId = input.id;

  if (!courseId || courseId === 'new') {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated.');
    }

    const { data, error } = await (supabase.from('courses') as any)
      .insert({
        user_id: user.id,
        name: input.name,
        hole_count: input.hole_count,
        total_par: totalPar,
        total_length_meters: totalLength,
      })
      .select('id')
      .single();

    if (error) throw error;
    courseId = (data as { id: string }).id;
  } else {
    const { error } = await (supabase.from('courses') as any)
      .update({
        name: input.name,
        hole_count: input.hole_count,
        total_par: totalPar,
        total_length_meters: totalLength,
      })
      .eq('id', courseId);

    if (error) throw error;

    if (input.hole_count === 9) {
      const { error: deleteError } = await (supabase.from('holes') as any)
        .delete()
        .eq('course_id', courseId)
        .gt('hole_number', 9);

      if (deleteError) throw deleteError;
    }
  }

  const { error: holesError } = await (supabase.from('holes') as any).upsert(
    input.holes.map((h) => ({
      course_id: courseId,
      hole_number: h.hole_number,
      par: h.par,
      length_meters: h.length_meters,
    })),
    { onConflict: 'course_id,hole_number' }
  );

  if (holesError) throw holesError;

  return courseId as string;
}

export async function deleteCourse(id: string): Promise<void> {
  const { error } = await supabase.from('courses').delete().eq('id', id);

  if (error) {
    if (error.code === '23503') {
      throw new Error("This course has rounds logged against it and can't be deleted.");
    }
    throw error;
  }
}
