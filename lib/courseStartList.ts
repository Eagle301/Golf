import type { CachedCourse } from '@/lib/offline/types';

const collator = new Intl.Collator('is');

export function countRoundsByCourse(rounds: { course_id: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const round of rounds) {
    counts[round.course_id] = (counts[round.course_id] ?? 0) + 1;
  }
  return counts;
}

export function filterCoursesByName(courses: CachedCourse[], query: string): CachedCourse[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return courses;
  return courses.filter(
    (c) => c.name.toLowerCase().includes(needle) || c.club?.toLowerCase().includes(needle)
  );
}

const MOST_PLAYED_LIMIT = 3;

export interface CourseStartGroups {
  mostPlayed: CachedCourse[];
  others: CachedCourse[];
}

export function organizeCoursesForStart(
  courses: CachedCourse[],
  roundCountByCourseId: Record<string, number>
): CourseStartGroups {
  const played = courses
    .filter((c) => (roundCountByCourseId[c.id] ?? 0) > 0)
    .sort(
      (a, b) =>
        roundCountByCourseId[b.id] - roundCountByCourseId[a.id] || collator.compare(a.name, b.name)
    );

  const mostPlayed = played.slice(0, MOST_PLAYED_LIMIT);
  const mostPlayedIds = new Set(mostPlayed.map((c) => c.id));
  const others = courses
    .filter((c) => !mostPlayedIds.has(c.id))
    .sort((a, b) => collator.compare(a.name, b.name));

  return { mostPlayed, others };
}
