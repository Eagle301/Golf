import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { isComplete, parseEmbeddedPath, validatePath, type HolePath } from '@/lib/holeGeometry';
import { getCachedCourses } from '@/lib/offline/courseCache';

export interface HoleWithPath {
  id: string;
  hole_number: number;
  par: number;
  path: HolePath;
}

export interface UseHoleGeometryResult {
  holes: HoleWithPath[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const pathOf = parseEmbeddedPath;

export function useHoleGeometry(courseId: string | undefined): UseHoleGeometryResult {
  const [holes, setHoles] = useState<HoleWithPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    // The aerial view can be opened from a round or a saved coordinate with
    // no course behind it; there is nothing to load then.
    if (!courseId) {
      setHoles([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: failed } = await supabase
      .from('holes')
      .select('id, hole_number, par, hole_geometry(points)')
      .eq('course_id', courseId)
      .order('hole_number');

    if (failed) {
      // Out on the course the signal comes and goes, so fall back to the
      // lines cached with the course before reporting a failure.
      const cached = (await getCachedCourses()).find((course) => course.id === courseId);
      if (cached) {
        setHoles(
          cached.holes.map((hole) => ({
            id: hole.id,
            hole_number: hole.hole_number,
            par: hole.par,
            path: hole.path ?? [],
          }))
        );
        setLoading(false);
        return;
      }
      setError(failed.message);
      setHoles([]);
      setLoading(false);
      return;
    }

    setHoles(
      ((data ?? []) as any[]).map((hole) => ({
        id: hole.id,
        hole_number: hole.hole_number,
        par: hole.par,
        path: pathOf(hole.hole_geometry),
      }))
    );
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { holes, loading, error, refetch };
}

export interface HoleGeometryWrite {
  hole_id: string;
  path: HolePath;
}

/**
 * Writes the lines of a whole course: holes with a line are upserted, holes
 * whose line was cleared have their row removed. A half-drawn line is a
 * programming error rather than something to persist, so it throws.
 */
export async function saveHoleGeometry(entries: HoleGeometryWrite[]): Promise<void> {
  const drawn = entries.filter((entry) => isComplete(entry.path));
  const cleared = entries.filter((entry) => !isComplete(entry.path));

  for (const entry of drawn) {
    const check = validatePath(entry.path);
    if (!check.ok) throw new Error(check.reason);
  }

  if (drawn.length > 0) {
    // Cast as everywhere else that writes: this Database type doesn't satisfy
    // postgrest's GenericSchema, so write payloads resolve to never.
    const { error } = await (supabase.from('hole_geometry') as any).upsert(
      drawn.map((entry) => ({ hole_id: entry.hole_id, points: entry.path })),
      { onConflict: 'hole_id' }
    );
    if (error) throw new Error(error.message);
  }

  if (cleared.length > 0) {
    const { error } = await supabase
      .from('hole_geometry')
      .delete()
      .in(
        'hole_id',
        cleared.map((entry) => entry.hole_id)
      );
    if (error) throw new Error(error.message);
  }
}

export interface CopyCandidate {
  id: string;
  name: string;
  mappedHoles: number;
  holes: { hole_number: number; path: HolePath }[];
}

interface HoleShape {
  hole_number: number;
  par: number;
  stroke_index: number | null;
}

function sameLayout(a: HoleShape[], b: HoleShape[]): boolean {
  if (a.length !== b.length) return false;
  const byNumber = new Map(b.map((hole) => [hole.hole_number, hole]));
  return a.every((hole) => {
    const other = byNumber.get(hole.hole_number);
    return !!other && other.par === hole.par && other.stroke_index === hole.stroke_index;
  });
}

/**
 * Courses whose lines could stand in for this one's: same club, same
 * layout (hole number, par and stroke index all matching), and at least one
 * hole already drawn. This is what stops Korpa's three nines from being
 * traced once per permutation course.
 */
export async function copyableCourses(
  courseId: string,
  club: string | null,
  holes: HoleShape[]
): Promise<CopyCandidate[]> {
  if (!club) return [];

  const { data: courses, error: coursesError } = await supabase
    .from('courses')
    .select('id, name, club, hole_count')
    .eq('club', club);
  if (coursesError || !courses) return [];

  const otherIds = (courses as any[]).map((course) => course.id).filter((id) => id !== courseId);
  if (otherIds.length === 0) return [];

  const { data: otherHoles, error: holesError } = await supabase
    .from('holes')
    .select('course_id, hole_number, par, stroke_index, hole_geometry(points)')
    .in('course_id', otherIds);
  if (holesError || !otherHoles) return [];

  const candidates: CopyCandidate[] = [];
  for (const course of courses as any[]) {
    if (course.id === courseId) continue;

    const theirs = (otherHoles as any[]).filter((hole) => hole.course_id === course.id);
    if (!sameLayout(holes, theirs)) continue;

    const drawn = theirs
      .map((hole) => ({ hole_number: hole.hole_number, path: pathOf(hole.hole_geometry) }))
      .filter((hole) => isComplete(hole.path));
    if (drawn.length === 0) continue;

    candidates.push({ id: course.id, name: course.name, mappedHoles: drawn.length, holes: drawn });
  }
  return candidates;
}

/** Copies source lines onto holes that have none, matching by hole number. */
export function copyGeometry(
  target: HoleWithPath[],
  source: { hole_number: number; path: HolePath }[]
): HoleWithPath[] {
  const byNumber = new Map(source.map((hole) => [hole.hole_number, hole.path]));
  return target.map((hole) =>
    isComplete(hole.path) ? hole : { ...hole, path: byNumber.get(hole.hole_number) ?? hole.path }
  );
}
