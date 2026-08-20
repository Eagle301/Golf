import { fairwayScoreImpact, girScoreImpact, type ScoreImpact } from '@/lib/calculations';
import type { FairwayHit, TrainingCategory } from '@/types/database';

export type LeakKind = 'three_putts' | 'penalties' | 'chips' | 'up_and_down' | 'tee_shots' | 'approach';

export interface Leak {
  kind: LeakKind;
  /**
   * Estimated strokes lost per round to this leak; null when there isn't
   * enough data yet to measure it (see MIN_IMPACT_BUCKET).
   */
  strokesPerRound: number | null;
  /** The training category whose routines address this leak. */
  category: TrainingCategory;
  /**
   * Count-style leaks only: how often it happens per round - 3-putt holes,
   * total chip shots, or penalty strokes.
   */
  perRound?: number;
  /** Gap-based leaks only: average score vs par when the target was hit. */
  hitAvgVsPar?: number | null;
  /** Gap-based leaks only: average score vs par when the target was missed. */
  missAvgVsPar?: number | null;
  /**
   * up_and_down only: share of up & down chances converted. A chance is a
   * missed green with at least one chip; converting means one chip and at
   * most one putt (a chip-in counts). Two or more chips fail outright; a
   * one-chip hole without a recorded putts count can't be judged and is
   * skipped. Null with no judgeable chances yet.
   */
  upAndDownPct?: number | null;
  /** up_and_down only: up & down chances per round. */
  upAndDownOppsPerRound?: number;
}

export interface LeakHoleLog {
  putts: number | null;
  penalties: number;
  chip_shots: number;
  gir: boolean | null;
  score: number | null;
  par: number;
  fairway_hit: FairwayHit | null;
}

/**
 * A hit/miss scoring gap is only trusted once both buckets have this many
 * holes - below that, one blow-up hole would dominate the "leak".
 */
const MIN_IMPACT_BUCKET = 5;

/**
 * Strokes per round attributed to a hit/miss scoring gap: how much worse
 * the missed holes averaged, times how often the miss happens per round.
 * Correlational (a windy day hurts both the stat and the score) and partly
 * overlapping the direct counts (a missed green often ends in an already
 * counted 3-putt or duffed chip) - good enough to point practice, not for
 * strict stroke accounting. Clamped at 0 when missing correlates better.
 */
function impactStrokesPerRound(impact: ScoreImpact, roundCount: number): number | null {
  if (impact.hitCount < MIN_IMPACT_BUCKET || impact.missCount < MIN_IMPACT_BUCKET) return null;
  const gap = Math.max(0, (impact.missAvgVsPar as number) - (impact.hitAvgVsPar as number));
  return (gap * impact.missCount) / roundCount;
}

/**
 * All five stroke leaks across a set of hole logs, ranked biggest first,
 * each as strokes lost per round:
 *
 * - three_putts: every putt beyond 2 on a hole is a stroke the flat stick
 *   gave away.
 * - penalties: penalty strokes count at face value.
 * - chips: on a hole where the green was missed, one chip is the expected
 *   recovery; each further chip is a duffed or overcooked short-game shot.
 * - up_and_down: every failed up & down chance (missed green, chipped, but
 *   took 2+ chips or 2+ putts) costs exactly one stroke - capped at one so
 *   a 3-putt's second extra stroke stays in the three_putts row alone.
 * - tee_shots: the scoring gap between fairway-hit and fairway-missed holes,
 *   times misses per round (see impactStrokesPerRound).
 * - approach: the same gap between greens hit and missed in regulation.
 *
 * Leaks that can't be measured yet (too little hit/miss data) carry a null
 * value and sort last. Returns an empty list with no rounds at all.
 *
 * roundCount is the number of 18-hole-equivalent rounds (a 9-hole round
 * counts as 0.5), so every per-round rate is on an 18-hole basis.
 */
export function computeLeaks(holeLogs: LeakHoleLog[], roundCount: number): Leak[] {
  if (roundCount === 0) return [];

  let threePuttStrokes = 0;
  let threePuttHoles = 0;
  let penaltyStrokes = 0;
  let chipStrokes = 0;
  let totalChips = 0;
  let upAndDownOpps = 0;
  let upAndDownSaves = 0;

  for (const h of holeLogs) {
    if (h.putts !== null) {
      threePuttStrokes += Math.max(0, h.putts - 2);
      if (h.putts >= 3) threePuttHoles += 1;
    }
    penaltyStrokes += h.penalties;
    totalChips += h.chip_shots;
    if (h.gir === false) chipStrokes += Math.max(0, h.chip_shots - 1);

    if (h.gir === false && h.chip_shots >= 1) {
      if (h.chip_shots >= 2) {
        upAndDownOpps += 1; // failed outright, putts irrelevant
      } else if (h.putts !== null) {
        upAndDownOpps += 1;
        if (h.putts <= 1) upAndDownSaves += 1;
      }
    }
  }

  const fairwayImpact = fairwayScoreImpact(holeLogs);
  const girImpact = girScoreImpact(holeLogs);

  const leaks: Leak[] = [
    {
      kind: 'three_putts',
      strokesPerRound: threePuttStrokes / roundCount,
      category: 'putts',
      perRound: threePuttHoles / roundCount,
    },
    {
      kind: 'penalties',
      strokesPerRound: penaltyStrokes / roundCount,
      category: 'strategy',
      perRound: penaltyStrokes / roundCount,
    },
    {
      kind: 'chips',
      strokesPerRound: chipStrokes / roundCount,
      category: 'short_game',
      perRound: totalChips / roundCount,
    },
    {
      kind: 'up_and_down',
      strokesPerRound: upAndDownOpps > 0 ? (upAndDownOpps - upAndDownSaves) / roundCount : null,
      category: 'short_game',
      upAndDownPct: upAndDownOpps > 0 ? (upAndDownSaves / upAndDownOpps) * 100 : null,
      upAndDownOppsPerRound: upAndDownOpps / roundCount,
    },
    {
      kind: 'tee_shots',
      strokesPerRound: impactStrokesPerRound(fairwayImpact, roundCount),
      category: 'full_swing',
      hitAvgVsPar: fairwayImpact.hitAvgVsPar,
      missAvgVsPar: fairwayImpact.missAvgVsPar,
    },
    {
      kind: 'approach',
      strokesPerRound: impactStrokesPerRound(girImpact, roundCount),
      category: 'full_swing',
      hitAvgVsPar: girImpact.hitAvgVsPar,
      missAvgVsPar: girImpact.missAvgVsPar,
    },
  ];

  // Ranked biggest first; unmeasurable (null) leaks last. Array.prototype.sort
  // is stable, so ties keep the declaration order above.
  return [...leaks].sort(
    (a, b) => (b.strokesPerRound ?? Number.NEGATIVE_INFINITY) - (a.strokesPerRound ?? Number.NEGATIVE_INFINITY)
  );
}
