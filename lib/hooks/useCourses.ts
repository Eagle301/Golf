import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type HoleCount = 9 | 18;

export interface HoleInput {
  hole_number: number;
  par: 3 | 4 | 5 | null;
  length_meters: number | null;
  stroke_index: number | null;
}

export interface CourseListItem {
  id: string;
  name: string;
  hole_count: HoleCount;
  total_par: number | null;
  total_length_meters: number | null;
  course_rating: number | null;
  slope_rating: number | null;
}

export interface SaveCourseInput {
  id?: string;
  name: string;
  hole_count: HoleCount;
  course_rating: number | null;
  slope_rating: number | null;
  holes: HoleInput[];
}

export class CourseValidationError extends Error {}

function blankHoles(count: HoleCount): HoleInput[] {
  return Array.from({ length: count }, (_, i) => ({
    hole_number: i + 1,
    par: null,
    length_meters: null,
    stroke_index: null,
  }));
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
      .select('id, name, hole_count, total_par, total_length_meters, course_rating, slope_rating')
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
  course: {
    id: string | null;
    name: string;
    hole_count: HoleCount;
    course_rating: number | null;
    slope_rating: number | null;
  };
  holes: HoleInput[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useCourse(id: string): UseCourseResult {
  const isNew = id === 'new';
  const [course, setCourse] = useState<UseCourseResult['course']>({
    id: null,
    name: '',
    hole_count: 18,
    course_rating: null,
    slope_rating: null,
  });
  const [holes, setHoles] = useState<HoleInput[]>(blankHoles(18));
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);

  const fetchCourse = useCallback(async () => {
    if (isNew) {
      setCourse({ id: null, name: '', hole_count: 18, course_rating: null, slope_rating: null });
      setHoles(blankHoles(18));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [courseResult, holesResult] = await Promise.all([
      supabase.from('courses').select('id, name, hole_count, course_rating, slope_rating').eq('id', id).single(),
      supabase
        .from('holes')
        .select('hole_number, par, length_meters, stroke_index')
        .eq('course_id', id)
        .order('hole_number'),
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

    const courseData = courseResult.data as {
      id: string;
      name: string;
      hole_count: HoleCount;
      course_rating: number | null;
      slope_rating: number | null;
    };
    setCourse({
      id: courseData.id,
      name: courseData.name,
      hole_count: courseData.hole_count,
      course_rating: courseData.course_rating,
      slope_rating: courseData.slope_rating,
    });

    const holesByNumber = new Map<number, HoleInput>(
      ((holesResult.data as HoleInput[]) ?? []).map((h) => [h.hole_number, h])
    );
    setHoles(
      Array.from({ length: courseData.hole_count }, (_, i) => {
        const holeNumber = i + 1;
        return (
          holesByNumber.get(holeNumber) ?? {
            hole_number: holeNumber,
            par: null,
            length_meters: null,
            stroke_index: null,
          }
        );
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
  if (input.course_rating === null || input.course_rating <= 0) {
    throw new CourseValidationError('Course Rating is required.');
  }
  if (input.slope_rating === null || input.slope_rating < 55 || input.slope_rating > 155) {
    throw new CourseValidationError('Slope Rating must be between 55 and 155.');
  }

  const usedIndexes = new Set<number>();
  for (const hole of input.holes) {
    if (hole.par !== 3 && hole.par !== 4 && hole.par !== 5) {
      throw new CourseValidationError(`Hole ${hole.hole_number} needs a par of 3, 4, or 5.`);
    }
    if (!hole.length_meters || hole.length_meters <= 0) {
      throw new CourseValidationError(`Hole ${hole.hole_number} needs a length in meters.`);
    }
    if (!hole.stroke_index || hole.stroke_index < 1 || hole.stroke_index > input.hole_count) {
      throw new CourseValidationError(
        `Hole ${hole.hole_number} needs a stroke index between 1 and ${input.hole_count}.`
      );
    }
    if (usedIndexes.has(hole.stroke_index)) {
      throw new CourseValidationError(`Stroke index ${hole.stroke_index} is used more than once.`);
    }
    usedIndexes.add(hole.stroke_index);
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
        course_rating: input.course_rating,
        slope_rating: input.slope_rating,
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
        course_rating: input.course_rating,
        slope_rating: input.slope_rating,
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
      stroke_index: h.stroke_index,
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
