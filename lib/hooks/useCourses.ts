import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export type HoleCount = 9 | 18;

export interface HoleInput {
  hole_number: number;
  par: 3 | 4 | 5 | null;
  stroke_index: number | null;
}

export interface TeeBoxInput {
  id?: string;
  name: string;
  course_rating: number | null;
  slope_rating: number | null;
  /** Per-hole lengths in meters, indexed by hole_number - 1. Always hole_count entries. */
  lengths: (number | null)[];
}

export interface CourseTeeSummary {
  name: string;
  course_rating: number | null;
  slope_rating: number | null;
  total_length_meters: number | null;
}

export interface CourseListItem {
  id: string;
  name: string;
  hole_count: HoleCount;
  total_par: number | null;
  tee_boxes: CourseTeeSummary[];
}

export interface SaveCourseInput {
  id?: string;
  name: string;
  hole_count: HoleCount;
  holes: HoleInput[];
  tees: TeeBoxInput[];
}

export class CourseValidationError extends Error {}

function blankHoles(count: HoleCount): HoleInput[] {
  return Array.from({ length: count }, (_, i) => ({
    hole_number: i + 1,
    par: null,
    stroke_index: null,
  }));
}

export function blankTee(count: HoleCount): TeeBoxInput {
  return {
    name: '',
    course_rating: null,
    slope_rating: null,
    lengths: Array(count).fill(null),
  };
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
      .select(
        'id, name, hole_count, total_par, tee_boxes(name, course_rating, slope_rating, total_length_meters)'
      )
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setCourses((data as any as CourseListItem[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  return { courses, loading, error, refetch: fetchCourses };
}

interface FetchedTeeBox {
  id: string;
  name: string;
  course_rating: number | null;
  slope_rating: number | null;
  sort_order: number;
  tee_lengths: { hole_id: string; length_meters: number | null }[];
}

export interface UseCourseResult {
  course: {
    id: string | null;
    name: string;
    hole_count: HoleCount;
  };
  holes: HoleInput[];
  tees: TeeBoxInput[];
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
  });
  const [holes, setHoles] = useState<HoleInput[]>(blankHoles(18));
  const [tees, setTees] = useState<TeeBoxInput[]>([blankTee(18)]);
  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);

  const fetchCourse = useCallback(async () => {
    if (isNew) {
      setCourse({ id: null, name: '', hole_count: 18 });
      setHoles(blankHoles(18));
      setTees([blankTee(18)]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const [courseResult, holesResult, teesResult] = await Promise.all([
      supabase.from('courses').select('id, name, hole_count').eq('id', id).single(),
      supabase
        .from('holes')
        .select('id, hole_number, par, stroke_index')
        .eq('course_id', id)
        .order('hole_number'),
      supabase
        .from('tee_boxes')
        .select('id, name, course_rating, slope_rating, sort_order, tee_lengths(hole_id, length_meters)')
        .eq('course_id', id)
        .order('sort_order'),
    ]);

    const failed = courseResult.error ?? holesResult.error ?? teesResult.error;
    if (failed) {
      setError(failed.message);
      setLoading(false);
      return;
    }

    const courseData = courseResult.data as unknown as { id: string; name: string; hole_count: HoleCount };
    setCourse(courseData);

    const fetchedHoles = (holesResult.data ?? []) as {
      id: string;
      hole_number: number;
      par: 3 | 4 | 5;
      stroke_index: number | null;
    }[];
    const holesByNumber = new Map(fetchedHoles.map((h) => [h.hole_number, h]));
    setHoles(
      Array.from({ length: courseData.hole_count }, (_, i) => {
        const hole = holesByNumber.get(i + 1);
        return hole
          ? { hole_number: hole.hole_number, par: hole.par, stroke_index: hole.stroke_index }
          : { hole_number: i + 1, par: null, stroke_index: null };
      })
    );

    const holeNumberById = new Map(fetchedHoles.map((h) => [h.id, h.hole_number]));
    const fetchedTees = (teesResult.data ?? []) as any as FetchedTeeBox[];
    setTees(
      fetchedTees.length === 0
        ? [blankTee(courseData.hole_count)]
        : fetchedTees.map((tee) => {
            const lengths: (number | null)[] = Array(courseData.hole_count).fill(null);
            for (const tl of tee.tee_lengths ?? []) {
              const holeNumber = holeNumberById.get(tl.hole_id);
              if (holeNumber) lengths[holeNumber - 1] = tl.length_meters;
            }
            return {
              id: tee.id,
              name: tee.name,
              course_rating: tee.course_rating,
              slope_rating: tee.slope_rating,
              lengths,
            };
          })
    );
    setLoading(false);
  }, [id, isNew]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  return { course, holes, tees, loading, error, refetch: fetchCourse };
}

function validateSaveCourseInput(input: SaveCourseInput): void {
  if (!input.name.trim()) {
    throw new CourseValidationError('Course name is required.');
  }
  if (input.holes.length !== input.hole_count) {
    throw new CourseValidationError(`All ${input.hole_count} holes must be filled in.`);
  }

  const usedIndexes = new Set<number>();
  for (const hole of input.holes) {
    if (hole.par !== 3 && hole.par !== 4 && hole.par !== 5) {
      throw new CourseValidationError(`Hole ${hole.hole_number} needs a par of 3, 4, or 5.`);
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

  if (input.tees.length === 0) {
    throw new CourseValidationError('At least one tee box is required.');
  }
  const usedNames = new Set<string>();
  input.tees.forEach((tee, i) => {
    const name = tee.name.trim();
    if (!name) {
      throw new CourseValidationError(`Tee ${i + 1} needs a name.`);
    }
    if (usedNames.has(name.toLowerCase())) {
      throw new CourseValidationError(`Tee "${name}" is duplicated.`);
    }
    usedNames.add(name.toLowerCase());
    if (tee.course_rating === null || tee.course_rating <= 0) {
      throw new CourseValidationError(`Tee "${name}" needs a Course Rating.`);
    }
    if (tee.slope_rating === null || tee.slope_rating < 55 || tee.slope_rating > 155) {
      throw new CourseValidationError(`Tee "${name}" needs a Slope Rating between 55 and 155.`);
    }
    if (tee.lengths.length !== input.hole_count) {
      throw new CourseValidationError(`Tee "${name}" must have a length for all ${input.hole_count} holes.`);
    }
    tee.lengths.forEach((length, holeIdx) => {
      if (!length || length <= 0) {
        throw new CourseValidationError(`Tee "${name}" needs a length for hole ${holeIdx + 1}.`);
      }
    });
  });
}

export async function saveCourse(input: SaveCourseInput): Promise<string> {
  validateSaveCourseInput(input);

  const totalPar = input.holes.reduce((sum, h) => sum + (h.par ?? 0), 0);

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
      })
      .eq('id', courseId);

    if (error) throw error;

    if (input.hole_count === 9) {
      // Cascade cleans up tee_lengths for the removed holes.
      const { error: deleteError } = await (supabase.from('holes') as any)
        .delete()
        .eq('course_id', courseId)
        .gt('hole_number', 9);

      if (deleteError) throw deleteError;
    }
  }

  const { data: holeRows, error: holesError } = await (supabase.from('holes') as any)
    .upsert(
      input.holes.map((h) => ({
        course_id: courseId,
        hole_number: h.hole_number,
        par: h.par,
        stroke_index: h.stroke_index,
      })),
      { onConflict: 'course_id,hole_number' }
    )
    .select('id, hole_number');

  if (holesError) throw holesError;

  const holeIdByNumber = new Map<number, string>(
    ((holeRows ?? []) as { id: string; hole_number: number }[]).map((h) => [h.hole_number, h.id])
  );

  // Remove tees dropped in the editor before writing the kept ones.
  const keptTeeIds = input.tees.map((t) => t.id).filter(Boolean) as string[];
  if (input.id && input.id !== 'new') {
    let staleQuery = (supabase.from('tee_boxes') as any).delete().eq('course_id', courseId);
    if (keptTeeIds.length > 0) {
      staleQuery = staleQuery.not('id', 'in', `(${keptTeeIds.join(',')})`);
    }
    const { error: staleError } = await staleQuery;
    if (staleError) throw staleError;
  }

  const teeRow = (tee: TeeBoxInput, sortOrder: number) => ({
    course_id: courseId,
    name: tee.name.trim(),
    course_rating: tee.course_rating,
    slope_rating: tee.slope_rating,
    total_length_meters: tee.lengths.reduce((sum: number, l) => sum + (l ?? 0), 0),
    sort_order: sortOrder,
  });

  const teeIdByName = new Map<string, string>();

  const existingTees = input.tees
    .map((tee, i) => ({ tee, i }))
    .filter(({ tee }) => tee.id)
    .map(({ tee, i }) => ({ id: tee.id, ...teeRow(tee, i) }));
  if (existingTees.length > 0) {
    const { error } = await (supabase.from('tee_boxes') as any).upsert(existingTees, { onConflict: 'id' });
    if (error) throw error;
    input.tees.filter((t) => t.id).forEach((t) => teeIdByName.set(t.name.trim(), t.id as string));
  }

  const newTees = input.tees
    .map((tee, i) => ({ tee, i }))
    .filter(({ tee }) => !tee.id)
    .map(({ tee, i }) => teeRow(tee, i));
  if (newTees.length > 0) {
    const { data: inserted, error } = await (supabase.from('tee_boxes') as any)
      .insert(newTees)
      .select('id, name');
    if (error) throw error;
    ((inserted ?? []) as { id: string; name: string }[]).forEach((t) => teeIdByName.set(t.name, t.id));
  }

  // Rewrite all lengths for this course's tees: delete-then-insert is simpler
  // than diffing and the row count is tiny (tees × holes).
  const allTeeIds = input.tees.map((t) => teeIdByName.get(t.name.trim())).filter(Boolean) as string[];
  const { error: clearError } = await (supabase.from('tee_lengths') as any)
    .delete()
    .in('tee_box_id', allTeeIds);
  if (clearError) throw clearError;

  const lengthRows = input.tees.flatMap((tee) => {
    const teeId = teeIdByName.get(tee.name.trim());
    return tee.lengths
      .map((length, holeIdx) => ({
        tee_box_id: teeId as string,
        hole_id: holeIdByNumber.get(holeIdx + 1) as string,
        length_meters: length,
      }))
      .filter((row) => row.tee_box_id && row.hole_id);
  });
  const { error: lengthsError } = await (supabase.from('tee_lengths') as any).insert(lengthRows);
  if (lengthsError) throw lengthsError;

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
