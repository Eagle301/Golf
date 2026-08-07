import type { FairwayHit, Round } from '@/types/database';

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

/**
 * ids of the lowest min(8, rounds.length) score_differential values -
 * the same rounds calculateHandicap averages together. Ties broken by
 * array order (stable sort), matching calculateHandicap's behavior.
 */
export function countedRoundIds(rounds: { id: string; score_differential: number }[]): Set<string> {
  const best8 = [...rounds].sort((a, b) => a.score_differential - b.score_differential).slice(0, Math.min(8, rounds.length));
  return new Set(best8.map((r) => r.id));
}

/** gir = (score - putts) <= (par - 2), overridable per hole. */
export function calculateGir(score: number, putts: number, par: number): boolean {
  return score - putts <= par - 2;
}

/**
 * Round handicap differential = (score - Course Rating) * (113 / Slope Rating).
 *
 * score is expected to be the brutto (net-double-bogey-capped) score from
 * calculateBruttoScore, not the raw gross total - an unusually bad hole
 * shouldn't be allowed to skew the differential.
 *
 * For a 9-hole round, the stored Course Rating/Slope are the full 18-hole
 * (played-twice) values, so the played 9-hole score can't be compared
 * against them directly. Instead, the actual (brutto) score is combined
 * with an expected score for the unplayed nine (see calculateNetParForNine)
 * then compared against the un-halved 18-hole rating like a normal 18-hole
 * round. Reverse-engineered against a real GSÍ (Icelandic golf federation)
 * scoring export: 11/11 real 9-hole rounds on the same tee matched
 * brutto + calculateNetParForNine(...) exactly, with no further adjustment.
 */
export function calculateRoundDifferential(score: number, courseRating: number, slopeRating: number, holeCount?: 18): number;
export function calculateRoundDifferential(
  score: number,
  courseRating: number,
  slopeRating: number,
  holeCount: 9,
  netParForNineHoles: number
): number;
export function calculateRoundDifferential(
  score: number,
  courseRating: number,
  slopeRating: number,
  holeCount: 9 | 18 = 18,
  netParForNineHoles?: number
): number {
  const combinedScore = holeCount === 9 ? score + (netParForNineHoles as number) : score;
  return (combinedScore - courseRating) * (113 / slopeRating);
}

/**
 * Course Handicap = HC * (Slope / 113) + (CR - Par), rounded to the nearest whole number.
 *
 * Course Rating and Slope Rating are stored as printed on the card, and used
 * as-is even for a 9-hole round - they're not halved. coursePar is passed in
 * as the actual 9-hole par, so for a 9-hole round it's doubled instead,
 * matching CR being the played-twice 18-hole equivalent.
 */
export function calculateCourseHandicap(
  userHandicap: number,
  slopeRating: number,
  courseRating: number,
  coursePar: number,
  holeCount: 9 | 18 = 18
): number {
  const par = holeCount === 9 ? coursePar * 2 : coursePar;
  const chc = userHandicap * (slopeRating / 113) + (courseRating - par);
  return Math.round(chc);
}

/**
 * Extra strokes given to a hole for a given Course Handicap and stroke index.
 *
 * 18-hole: a CHC of 22 gives every hole 1 stroke (floor(22/18)), plus a
 * further stroke on holes with stroke_index 1-4 (22 % 18 = 4).
 *
 * 9-hole: CHC is computed against the full, played-twice 18-hole par (see
 * calculateCourseHandicap), so distributing it across only 9 stroke indices
 * the same way would double-count - half of CHC (rounded) is the fair
 * allowance for playing these 9 holes once, distributed across stroke
 * indices 1-9 the same way (floor/remainder, but mod 9 instead of mod 18).
 */
export function strokesForHole(courseHandicap: number, strokeIndex: number, holeCount: 9 | 18 = 18): number {
  if (holeCount === 9) {
    const nineHoleAllowance = Math.round(courseHandicap / 2);
    const fullRounds = Math.floor(nineHoleAllowance / 9);
    const remainder = nineHoleAllowance % 9;
    return fullRounds + (strokeIndex <= remainder ? 1 : 0);
  }
  const fullRounds = Math.floor(courseHandicap / 18);
  const remainder = courseHandicap % 18;
  return fullRounds + (strokeIndex <= remainder ? 1 : 0);
}

/** Net par for one hole = par + strokes received on it. */
export function calculateNetPar(
  hole: { par: number; stroke_index: number | null },
  courseHandicap: number | null,
  holeCount: 9 | 18 = 18
): number {
  if (courseHandicap === null || hole.stroke_index === null) return hole.par;
  return hole.par + strokesForHole(courseHandicap, hole.stroke_index, holeCount);
}

/** Total net par across a set of holes (the planning target for the round). */
export function calculateTotalNetPar(
  holes: { par: number; stroke_index: number | null }[],
  courseHandicap: number | null,
  holeCount: 9 | 18 = 18
): number {
  return holes.reduce((sum, h) => sum + calculateNetPar(h, courseHandicap, holeCount), 0);
}

/**
 * Expected score for the unplayed nine, used in calculateRoundDifferential's
 * 9-hole path to build an 18-hole-equivalent combined score.
 *
 * Uses the player's raw Handicap Index (not Course Handicap, and not a
 * per-hole stroke-index allocation) - par for the nine plus half the
 * Handicap Index, rounded up. Reverse-engineered against a real GSÍ
 * (Icelandic golf federation) scoring export: this matched the official
 * "Corrected brutto score" on 11/11 real 9-hole rounds played on the same
 * tee, across Handicap Index values from 26.2 to 27.1 (all landing on the
 * same ceil(hcp/2) = 14).
 */
export function calculateNetParForNine(totalPar: number, handicapIndex: number | null): number {
  if (handicapIndex === null) return totalPar;
  return totalPar + Math.ceil(handicapIndex / 2);
}

/**
 * Brutto score: each hole's score capped at net double bogey (net par + 2)
 * before summing, so one unusually bad hole can't skew the handicap-relevant
 * total. Only holes with a recorded score contribute.
 */
export function calculateBruttoScore(
  holes: { par: number; stroke_index: number | null; score: number | null }[],
  courseHandicap: number | null,
  holeCount: 9 | 18 = 18
): number {
  return holes.reduce((sum, h) => {
    if (h.score === null) return sum;
    const maxScore = calculateNetPar(h, courseHandicap, holeCount) + 2;
    return sum + Math.min(h.score, maxScore);
  }, 0);
}

/**
 * Stableford-style points for a hole, from its net score against par:
 * net par = 2, net bogey = 1, net double-bogey or worse = 0, each stroke
 * under net par adds one more point (net birdie = 3, net eagle = 4, ...).
 */
export function calculatePoints(netScore: number, par: number): number {
  return Math.max(0, 2 - (netScore - par));
}

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
};

/** Renders a number using unicode superscript digits, for a compact points badge. */
export function toSuperscript(n: number): string {
  return String(n)
    .split('')
    .map((c) => SUPERSCRIPT_DIGITS[c] ?? c)
    .join('');
}

/**
 * Running total of score-relative-to-net-par across the holes played so far
 * (holes with a score). Returns null once no hole has been scored yet, so
 * callers can render a placeholder instead of a misleading "E".
 */
export function calculateNetParDiff(
  holes: { par: number; stroke_index: number | null; score: number | null }[],
  courseHandicap: number | null,
  holeCount: 9 | 18 = 18
): number | null {
  const played = holes.filter((h): h is typeof h & { score: number } => h.score !== null);
  if (played.length === 0) return null;
  return played.reduce((sum, h) => sum + (h.score - calculateNetPar(h, courseHandicap, holeCount)), 0);
}

/** Formats a relative-to-par value as "+3", "-2", or "E" for even par. */
export function formatRelativeToPar(diff: number | null): string {
  if (diff === null) return '-';
  if (diff === 0) return 'E';
  return diff > 0 ? `+${diff}` : `${diff}`;
}

/** Average gross score for each par type, across a set of hole logs. */
export function averageScoreByPar(
  holeLogs: { par: number; score: number | null }[]
): { par3: number | null; par4: number | null; par5: number | null } {
  function averageForPar(par: number): number | null {
    const scores = holeLogs.filter((h) => h.par === par && h.score !== null).map((h) => h.score as number);
    return scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null;
  }

  return { par3: averageForPar(3), par4: averageForPar(4), par5: averageForPar(5) };
}

/**
 * Left/Hit/Right fairway percentages (of eligible attempts), plus naPct - the
 * share of all fairway attempts that were missed short/long, which aren't a
 * left/right miss and so are kept out of the L/H/R split entirely rather
 * than distorting it.
 */
export function fairwayDistribution(
  holeLogs: { fairway_hit: FairwayHit | null }[]
): { leftPct: number; hitPct: number; rightPct: number; naPct: number } {
  const attempted = holeLogs.filter((h) => h.fairway_hit !== null);
  if (attempted.length === 0) return { leftPct: 0, hitPct: 0, rightPct: 0, naPct: 0 };

  const eligible = attempted.filter(
    (h) => h.fairway_hit === 'yes' || h.fairway_hit === 'missed_left' || h.fairway_hit === 'missed_right'
  );
  const naPct = ((attempted.length - eligible.length) / attempted.length) * 100;
  if (eligible.length === 0) return { leftPct: 0, hitPct: 0, rightPct: 0, naPct };

  const count = (hit: FairwayHit) => eligible.filter((h) => h.fairway_hit === hit).length;
  return {
    leftPct: (count('missed_left') / eligible.length) * 100,
    hitPct: (count('yes') / eligible.length) * 100,
    rightPct: (count('missed_right') / eligible.length) * 100,
    naPct,
  };
}

/** GIR hit percentage across a set of hole logs. */
export function girPercentage(holeLogs: { gir: boolean | null }[]): number {
  if (holeLogs.length === 0) return 0;
  return (holeLogs.filter((h) => h.gir === true).length / holeLogs.length) * 100;
}

/**
 * Average 18-hole-equivalent score across rounds. A 9-hole round's score is
 * doubled before averaging so it contributes on the same basis as an 18.
 */
export function averageEighteenHoleScore(
  rounds: { total_score: number | null; hole_count: 9 | 18 }[]
): number | null {
  const scored = rounds.filter((r): r is typeof r & { total_score: number } => r.total_score !== null);
  if (scored.length === 0) return null;

  const normalized = scored.map((r) => (r.hole_count === 9 ? r.total_score * 2 : r.total_score));
  return normalized.reduce((sum, s) => sum + s, 0) / normalized.length;
}

export interface PuttsDistribution {
  putts0Pct: number;
  putts1Pct: number;
  putts2Pct: number;
  putts3Pct: number;
  putts4PlusPct: number;
}

/** Percentage of holes (with a recorded putts count) landing in each bucket: 0, 1, 2, 3, 4+. */
export function puttsDistribution(holeLogs: { putts: number | null }[]): PuttsDistribution {
  const recorded = holeLogs.filter((h): h is { putts: number } => h.putts !== null);
  if (recorded.length === 0) {
    return { putts0Pct: 0, putts1Pct: 0, putts2Pct: 0, putts3Pct: 0, putts4PlusPct: 0 };
  }

  const pct = (predicate: (p: number) => boolean) =>
    (recorded.filter((h) => predicate(h.putts)).length / recorded.length) * 100;

  return {
    putts0Pct: pct((p) => p === 0),
    putts1Pct: pct((p) => p === 1),
    putts2Pct: pct((p) => p === 2),
    putts3Pct: pct((p) => p === 3),
    putts4PlusPct: pct((p) => p >= 4),
  };
}

/**
 * Average putts per 18-hole-equivalent round. A 9-hole round's putts total
 * is doubled before averaging so it contributes on the same basis as an 18.
 */
export function averagePuttsPerRound(
  rounds: { total_putts: number | null; hole_count: 9 | 18 }[]
): number | null {
  const scored = rounds.filter((r): r is typeof r & { total_putts: number } => r.total_putts !== null);
  if (scored.length === 0) return null;

  const normalized = scored.map((r) => (r.hole_count === 9 ? r.total_putts * 2 : r.total_putts));
  return normalized.reduce((sum, p) => sum + p, 0) / normalized.length;
}

export interface ScoringCategoryAverages {
  eagle: number;
  birdie: number;
  par: number;
  bogey: number;
  double: number;
  doubleOrWorse: number;
}

/**
 * Average number of holes per round landing in each scoring bucket
 * (score minus par): eagle or better (<=-2), birdie (-1), par (0),
 * bogey (+1), double bogey (+2), double bogey or worse (>=+3).
 * roundCount is the number of rounds the hole logs were drawn from (not
 * just the ones with scores), so a round contributes 0s for every bucket
 * it didn't produce a hole in, rather than being dropped from the average.
 */
export function averageScoringCategoriesPerRound(
  holeLogs: { par: number; score: number | null }[],
  roundCount: number
): ScoringCategoryAverages {
  const counts = { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, doubleOrWorse: 0 };

  for (const h of holeLogs) {
    if (h.score === null) continue;
    const diff = h.score - h.par;
    if (diff <= -2) counts.eagle += 1;
    else if (diff === -1) counts.birdie += 1;
    else if (diff === 0) counts.par += 1;
    else if (diff === 1) counts.bogey += 1;
    else if (diff === 2) counts.double += 1;
    else counts.doubleOrWorse += 1;
  }

  if (roundCount === 0) {
    return { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, doubleOrWorse: 0 };
  }

  return {
    eagle: counts.eagle / roundCount,
    birdie: counts.birdie / roundCount,
    par: counts.par / roundCount,
    bogey: counts.bogey / roundCount,
    double: counts.double / roundCount,
    doubleOrWorse: counts.doubleOrWorse / roundCount,
  };
}
