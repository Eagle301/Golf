import type { Round } from '@/types/database';

/** Standard beginning handicap, used until enough rated rounds exist to compute a real one. */
export const STARTING_HANDICAP = 32;

/**
 * Handicap = simple average of the best 8 score_differential values from the
 * last 20 rounds. Falls back to STARTING_HANDICAP when there aren't any
 * rated rounds yet, so a handicap is always available.
 */
export function calculateHandicap(rounds: Round[]): number {
  const last20 = [...rounds]
    .sort((a, b) => new Date(b.date_played).getTime() - new Date(a.date_played).getTime())
    .slice(0, 20)
    .map((r) => r.score_differential)
    .filter((d): d is number => d !== null);

  if (last20.length === 0) return STARTING_HANDICAP;

  const best8 = [...last20].sort((a, b) => a - b).slice(0, Math.min(8, last20.length));
  return best8.reduce((sum, d) => sum + d, 0) / best8.length;
}

/** gir = (score - putts) <= (par - 2), overridable per hole. */
export function calculateGir(score: number, putts: number, par: number): boolean {
  return score - putts <= par - 2;
}

/** Round handicap differential = (score - Course Rating) * (113 / Slope Rating). */
export function calculateRoundDifferential(score: number, courseRating: number, slopeRating: number): number {
  return (score - courseRating) * (113 / slopeRating);
}

/** Course Handicap = HC * (Slope / 113) + (CR - Par), rounded to the nearest whole number. */
export function calculateCourseHandicap(
  userHandicap: number,
  slopeRating: number,
  courseRating: number,
  coursePar: number
): number {
  const chc = userHandicap * (slopeRating / 113) + (courseRating - coursePar);
  return Math.round(chc);
}

/**
 * Extra strokes given to a hole for a given Course Handicap and stroke index (1-18).
 * A CHC of 22 gives every hole 1 stroke (floor(22/18)), plus a further stroke on
 * holes with stroke_index 1-4 (22 % 18 = 4).
 */
export function strokesForHole(courseHandicap: number, strokeIndex: number): number {
  const fullRounds = Math.floor(courseHandicap / 18);
  const remainder = courseHandicap % 18;
  return fullRounds + (strokeIndex <= remainder ? 1 : 0);
}
