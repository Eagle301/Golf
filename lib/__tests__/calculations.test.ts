import {
  calculateHandicap,
  calculateGir,
  calculateRoundDifferential,
  calculateCourseHandicap,
  strokesForHole,
  calculateNetPar,
  calculateTotalNetPar,
  calculateNetParForNine,
  calculateBruttoScore,
  calculateNetParDiff,
  formatRelativeToPar,
  averageScoreByPar,
  fairwayDistribution,
  girPercentage,
  averageEighteenHoleScore,
  averageScoringCategoriesPerRound,
  calculatePoints,
  toSuperscript,
  STARTING_HANDICAP,
} from '../calculations';
import type { Round } from '@/types/database';

describe('calculateRoundDifferential', () => {
  it('computes (score - CR) * (113 / Slope)', () => {
    // (90 - 72) * (113 / 113) = 18
    expect(calculateRoundDifferential(90, 72, 113)).toBeCloseTo(18);
    // (85 - 70.5) * (113 / 125) = 13.108
    expect(calculateRoundDifferential(85, 70.5, 125)).toBeCloseTo(13.108, 2);
  });

  it('for a 9-hole round, combines the actual score with (net par for the nine + 1) before comparing against the full course rating', () => {
    // combinedScore = 45 (actual) + 40 (net par for the nine) + 1 = 86
    // (86 - 67) * (113 / 113) = 19
    expect(calculateRoundDifferential(45, 67, 113, 9, 40)).toBeCloseTo(19);
  });
});

describe('calculateHandicap', () => {
  function makeRound(dateOffset: number, differential: number): Round {
    return {
      id: `r-${dateOffset}`,
      user_id: 'u1',
      course_id: 'c1',
      date_played: new Date(2026, 0, 1 + dateOffset).toISOString().slice(0, 10),
      total_score: null,
      total_putts: null,
      weather: null,
      notes: null,
      score_differential: differential,
      handicap_at_time: null,
      created_at: '',
    };
  }

  it('averages the best 8 differentials from the last 20 rounds', () => {
    // 20 rounds with differentials 1..20; best 8 are 1..8, average = 4.5
    const rounds = Array.from({ length: 20 }, (_, i) => makeRound(i, i + 1));
    expect(calculateHandicap(rounds)).toBeCloseTo(4.5);
  });

  it('ignores rounds beyond the most recent 20', () => {
    // 25 rounds; the oldest 5 (earlier dates) have differential 100 and should be excluded.
    const recent20 = Array.from({ length: 20 }, (_, i) => makeRound(100 + i, i + 1));
    const old5 = Array.from({ length: 5 }, (_, i) => makeRound(i, 100));
    expect(calculateHandicap([...recent20, ...old5])).toBeCloseTo(4.5);
  });

  it('falls back to the standard beginning handicap when there are no rated rounds yet', () => {
    expect(calculateHandicap([])).toBe(STARTING_HANDICAP);
    expect(STARTING_HANDICAP).toBe(32);
  });
});

describe('calculateGir', () => {
  it('is true when strokes-to-green is at least 2 under par', () => {
    expect(calculateGir(4, 2, 4)).toBe(true); // 4-2=2 <= 4-2=2
  });

  it('is false otherwise', () => {
    expect(calculateGir(5, 2, 4)).toBe(false); // 5-2=3 > 2
  });
});

describe('calculateCourseHandicap', () => {
  it('computes HC * (Slope/113) + (CR - Par), rounded to nearest whole number', () => {
    // 10 * (120/113) + (70 - 72) = 10.619 - 2 = 8.619 -> rounds to 9
    expect(calculateCourseHandicap(10, 120, 70, 72)).toBe(9);
  });

  it('for a 9-hole course, uses Course Rating as-is and doubles the par instead', () => {
    // Húsafell: 32 * (115/113) + (67 - 36*2) = 32.566 + (67 - 72) = 32.566 - 5 = 27.566 -> rounds to 28
    expect(calculateCourseHandicap(32, 115, 67, 36, 9)).toBe(28);
  });
});

describe('strokesForHole', () => {
  it('gives one stroke to holes with stroke_index <= CHC when CHC is 13', () => {
    expect(strokesForHole(13, 1)).toBe(1);
    expect(strokesForHole(13, 13)).toBe(1);
    expect(strokesForHole(13, 14)).toBe(0);
    expect(strokesForHole(13, 18)).toBe(0);
  });

  it('gives every hole a stroke plus an extra on the remainder holes when CHC is 22', () => {
    // 22 = 18 + 4: every hole gets 1, holes 1-4 get a 2nd.
    expect(strokesForHole(22, 1)).toBe(2);
    expect(strokesForHole(22, 4)).toBe(2);
    expect(strokesForHole(22, 5)).toBe(1);
    expect(strokesForHole(22, 18)).toBe(1);

    const totalExtraStrokes = Array.from({ length: 18 }, (_, i) => strokesForHole(22, i + 1)).reduce(
      (sum, n) => sum + n,
      0
    );
    expect(totalExtraStrokes).toBe(22);
  });

  it('for a 9-hole round, distributes half the Course Handicap (rounded) across stroke indices 1-9', () => {
    // CHC 23 -> half = round(11.5) = 12; distributed over 9 stroke indices: 12 = 9 + 3.
    // Every hole gets 1 stroke (floor(12/9)), plus holes with stroke_index 1-3 get a 2nd (12 % 9 = 3).
    expect(strokesForHole(23, 1, 9)).toBe(2);
    expect(strokesForHole(23, 3, 9)).toBe(2);
    expect(strokesForHole(23, 4, 9)).toBe(1);
    expect(strokesForHole(23, 9, 9)).toBe(1);

    const totalStrokes = Array.from({ length: 9 }, (_, i) => strokesForHole(23, i + 1, 9)).reduce(
      (sum, n) => sum + n,
      0
    );
    expect(totalStrokes).toBe(12);
  });
});

describe('calculateNetPar / calculateTotalNetPar', () => {
  it('adds strokes received to par for a single hole', () => {
    expect(calculateNetPar({ par: 4, stroke_index: 1 }, 13)).toBe(5);
    expect(calculateNetPar({ par: 4, stroke_index: 14 }, 13)).toBe(4);
  });

  it('falls back to plain par with no course handicap or stroke index', () => {
    expect(calculateNetPar({ par: 4, stroke_index: 1 }, null)).toBe(4);
    expect(calculateNetPar({ par: 4, stroke_index: null }, 13)).toBe(4);
  });

  it('sums net par across all holes', () => {
    const holes = [
      { par: 4, stroke_index: 1 },
      { par: 3, stroke_index: 14 },
    ];
    // hole 1 gets a stroke (5), hole 2 doesn't (3) -> 8
    expect(calculateTotalNetPar(holes, 13)).toBe(8);
  });

  it('for a 9-hole round, totals only half the Course Handicap worth of strokes (not the full mod-18 allocation)', () => {
    // Husafell: 9 holes, stroke indices 1-9, total par 36, CHC 23.
    // Old (buggy) mod-18 behavior would have given 14 strokes -> net par 50.
    // Correct: half of CHC (12) distributed across 9 holes -> net par 48.
    const holes = [
      { par: 4, stroke_index: 9 },
      { par: 5, stroke_index: 8 },
      { par: 4, stroke_index: 4 },
      { par: 4, stroke_index: 7 },
      { par: 4, stroke_index: 6 },
      { par: 5, stroke_index: 3 },
      { par: 3, stroke_index: 1 },
      { par: 4, stroke_index: 2 },
      { par: 3, stroke_index: 5 },
    ];
    expect(calculateTotalNetPar(holes, 23, 9)).toBe(48);
  });
});

describe('calculateNetParForNine', () => {
  it('adds half the Course Handicap (rounded) to the par of the nine actually played', () => {
    // Husafell: totalPar 36, CHC 22 -> 36 + round(22/2) = 36 + 11 = 47
    expect(calculateNetParForNine(36, 22)).toBe(47);
  });

  it('rounds an odd Course Handicap half to the nearest whole number', () => {
    expect(calculateNetParForNine(36, 23)).toBe(36 + 12); // 23/2 = 11.5 -> rounds to 12
  });

  it('falls back to plain par with no course handicap', () => {
    expect(calculateNetParForNine(36, null)).toBe(36);
  });
});

describe('calculateBruttoScore', () => {
  it('sums actual scores when none exceed net double bogey (net par + 2)', () => {
    // net par: hole 1 = 5 (cap 7), hole 2 = 3 (cap 5); both scores are within cap
    const holes = [
      { par: 4, stroke_index: 1, score: 6 },
      { par: 3, stroke_index: 14, score: 4 },
    ];
    expect(calculateBruttoScore(holes, 13)).toBe(10);
  });

  it('caps any hole score above net double bogey before summing', () => {
    // caps are 7 and 5; both actual scores (9, 6) exceed them
    const holes = [
      { par: 4, stroke_index: 1, score: 9 },
      { par: 3, stroke_index: 14, score: 6 },
    ];
    expect(calculateBruttoScore(holes, 13)).toBe(12);
  });

  it('ignores holes that have not been scored yet', () => {
    const holes = [
      { par: 4, stroke_index: 1, score: 6 },
      { par: 3, stroke_index: 14, score: null },
    ];
    expect(calculateBruttoScore(holes, 13)).toBe(6);
  });

  it('falls back to par-based caps with no course handicap', () => {
    // no course handicap -> net par is plain par; cap = par + 2
    const holes = [{ par: 4, stroke_index: 1, score: 9 }];
    expect(calculateBruttoScore(holes, null)).toBe(6);
  });
});

describe('calculatePoints', () => {
  it('gives 2 points for a net par', () => {
    expect(calculatePoints(4, 4)).toBe(2);
  });

  it('gives 1 point for a net bogey and 0 for net double-bogey or worse', () => {
    expect(calculatePoints(5, 4)).toBe(1);
    expect(calculatePoints(6, 4)).toBe(0);
    expect(calculatePoints(8, 4)).toBe(0);
  });

  it('gives an extra point per stroke under net par', () => {
    expect(calculatePoints(3, 4)).toBe(3); // net birdie
    expect(calculatePoints(2, 4)).toBe(4); // net eagle
    expect(calculatePoints(1, 4)).toBe(5); // net albatross
  });
});

describe('toSuperscript', () => {
  it('converts digits to unicode superscript characters', () => {
    expect(toSuperscript(2)).toBe('²');
    expect(toSuperscript(0)).toBe('⁰');
    expect(toSuperscript(10)).toBe('¹⁰');
  });
});

describe('calculateNetParDiff', () => {
  it('sums score minus net par across the holes played so far', () => {
    // CHC 13: hole 1 (index 13) gets a stroke -> net par 5, score 5 -> diff 0.
    // hole 2 (index 14) gets no stroke -> net par 4, score 6 -> diff +2.
    const holes = [
      { par: 4, stroke_index: 13, score: 5 },
      { par: 4, stroke_index: 14, score: 6 },
    ];
    expect(calculateNetParDiff(holes, 13)).toBe(2);
  });

  it('ignores holes that have not been scored yet', () => {
    // CHC 1: hole 1 (stroke_index 1) gets the stroke -> net par 5, score 4 -> diff -1.
    const holes = [
      { par: 4, stroke_index: 1, score: 4 },
      { par: 4, stroke_index: 2, score: null },
    ];
    expect(calculateNetParDiff(holes, 1)).toBe(-1);
  });

  it('returns null when no hole has a score yet', () => {
    const holes = [{ par: 4, stroke_index: 1, score: null }];
    expect(calculateNetParDiff(holes, 1)).toBeNull();
  });
});

describe('formatRelativeToPar', () => {
  it('prefixes a plus sign over par', () => {
    expect(formatRelativeToPar(3)).toBe('+3');
  });

  it('keeps the minus sign under par', () => {
    expect(formatRelativeToPar(-2)).toBe('-2');
  });

  it('shows E for even par', () => {
    expect(formatRelativeToPar(0)).toBe('E');
  });

  it('shows a placeholder for null', () => {
    expect(formatRelativeToPar(null)).toBe('-');
  });
});

describe('averageScoreByPar', () => {
  it('averages gross score per par type', () => {
    const holeLogs = [
      { par: 3, score: 4 },
      { par: 3, score: 2 },
      { par: 4, score: 5 },
      { par: 5, score: null },
    ];
    expect(averageScoreByPar(holeLogs)).toEqual({ par3: 3, par4: 5, par5: null });
  });
});

describe('fairwayDistribution', () => {
  it('computes left/hit/right percentages of eligible attempts, and naPct for missed short/long', () => {
    const holeLogs = [
      { fairway_hit: 'yes' as const },
      { fairway_hit: 'yes' as const },
      { fairway_hit: 'missed_left' as const },
      { fairway_hit: 'missed_right' as const },
      { fairway_hit: 'missed_short' as const },
    ];
    // 4 eligible (2 yes, 1 left, 1 right) of 5 attempted -> naPct = 1/5 = 20%.
    expect(fairwayDistribution(holeLogs)).toEqual({ leftPct: 25, hitPct: 50, rightPct: 25, naPct: 20 });
  });

  it('returns all zeroes when there is no attempted data', () => {
    expect(fairwayDistribution([])).toEqual({ leftPct: 0, hitPct: 0, rightPct: 0, naPct: 0 });
  });

  it('returns 100% naPct when every attempt was missed short/long', () => {
    const holeLogs = [{ fairway_hit: 'missed_short' as const }, { fairway_hit: 'missed_long' as const }];
    expect(fairwayDistribution(holeLogs)).toEqual({ leftPct: 0, hitPct: 0, rightPct: 0, naPct: 100 });
  });
});

describe('girPercentage', () => {
  it('computes the hit percentage across hole logs', () => {
    expect(girPercentage([{ gir: true }, { gir: false }, { gir: true }, { gir: null }])).toBe(50);
  });

  it('returns 0 for no holes', () => {
    expect(girPercentage([])).toBe(0);
  });
});

describe('averageEighteenHoleScore', () => {
  it('averages 18-hole scores as-is', () => {
    const rounds = [
      { total_score: 90, hole_count: 18 as const },
      { total_score: 100, hole_count: 18 as const },
    ];
    expect(averageEighteenHoleScore(rounds)).toBe(95);
  });

  it('doubles 9-hole scores before averaging', () => {
    const rounds = [
      { total_score: 90, hole_count: 18 as const },
      { total_score: 45, hole_count: 9 as const },
    ];
    expect(averageEighteenHoleScore(rounds)).toBe(90);
  });

  it('returns null when no round has a score', () => {
    expect(averageEighteenHoleScore([{ total_score: null, hole_count: 18 }])).toBeNull();
  });
});

describe('averageScoringCategoriesPerRound', () => {
  it('buckets holes by score-to-par and averages counts per round', () => {
    const holeLogs = [
      { par: 4, score: 2 }, // eagle (or better)
      { par: 4, score: 3 }, // birdie
      { par: 4, score: 4 }, // par
      { par: 4, score: 4 }, // par
      { par: 4, score: 5 }, // bogey
      { par: 4, score: 6 }, // double
      { par: 4, score: 7 }, // double or worse
      { par: 4, score: 8 }, // double or worse
    ];
    // 2 rounds -> divide each bucket count by 2.
    expect(averageScoringCategoriesPerRound(holeLogs, 2)).toEqual({
      eagle: 0.5,
      birdie: 0.5,
      par: 1,
      bogey: 0.5,
      double: 0.5,
      doubleOrWorse: 1,
    });
  });

  it('ignores holes that have not been scored yet', () => {
    const holeLogs = [
      { par: 4, score: 4 },
      { par: 4, score: null },
    ];
    expect(averageScoringCategoriesPerRound(holeLogs, 1).par).toBe(1);
  });

  it('returns all zeroes when there are no rounds', () => {
    expect(averageScoringCategoriesPerRound([], 0)).toEqual({
      eagle: 0,
      birdie: 0,
      par: 0,
      bogey: 0,
      double: 0,
      doubleOrWorse: 0,
    });
  });
});
