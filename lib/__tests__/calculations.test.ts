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
  girPercentageByPar,
  averageEighteenHoleScore,
  averageScoringCategoriesPerRound,
  puttsDistribution,
  averagePuttsPerRound,
  scramblingPercentage,
  fairwayScoreImpact,
  girScoreImpact,
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

  it('for a 9-hole round, combines the actual score with the expected score for the nine before comparing against the full course rating', () => {
    // combinedScore = 45 (actual) + 40 (expected score for the nine) = 85
    // (85 - 67) * (113 / 113) = 18
    expect(calculateRoundDifferential(45, 67, 113, 9, 40)).toBeCloseTo(18);
  });
});

describe('calculateHandicap', () => {
  function makeRound(dateOffset: number, differential: number): Round {
    return {
      id: `r-${dateOffset}`,
      user_id: 'u1',
      course_id: 'c1',
      tee_box_id: 'tee-1',
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

  // A nine is allocated strokes as if the full 18-hole card were played: the
  // played nine receives whatever falls on ITS stroke indexes. A nine whose
  // holes carry the odd 18-hole SIs (the common case: Mýrin, Húsafell, Áin)
  // gets the larger half of an odd Course Handicap; a nine carrying the even
  // SIs (Korpa Landið, Sjórinn) gets the smaller half.
  it('gives an odd-SI nine (default) the rounded-up half of an odd Course Handicap', () => {
    // CHC 25 over 18 holes: 18x1 + a 2nd stroke on 18-SI 1-7. The odd SIs
    // 1,3,5,7 map to 9-hole indexes 1-4 -> 9 + 4 = 13 strokes.
    expect(strokesForHole(25, 1, 9)).toBe(2);
    expect(strokesForHole(25, 4, 9)).toBe(2);
    expect(strokesForHole(25, 5, 9)).toBe(1);

    const totalStrokes = Array.from({ length: 9 }, (_, i) => strokesForHole(25, i + 1, 9)).reduce(
      (sum, n) => sum + n,
      0
    );
    expect(totalStrokes).toBe(13);
  });

  it('gives an even-SI nine the floored half of an odd Course Handicap', () => {
    // Verified against the official GSÍ points (20) for a real Korpa Landið
    // round: CHC 25, even SIs 2,4,6 get the 2nd stroke -> 9 + 3 = 12 strokes.
    expect(strokesForHole(25, 1, 9, true)).toBe(2);
    expect(strokesForHole(25, 3, 9, true)).toBe(2);
    expect(strokesForHole(25, 4, 9, true)).toBe(1);

    const totalStrokes = Array.from({ length: 9 }, (_, i) => strokesForHole(25, i + 1, 9, true)).reduce(
      (sum, n) => sum + n,
      0
    );
    expect(totalStrokes).toBe(12);
  });

  it('splits an even Course Handicap identically for both parities', () => {
    for (const even of [false, true]) {
      const totalStrokes = Array.from({ length: 9 }, (_, i) => strokesForHole(22, i + 1, 9, even)).reduce(
        (sum, n) => sum + n,
        0
      );
      expect(totalStrokes).toBe(11);
    }
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

  it('for a 9-hole round, totals only the played nine share of the Course Handicap (not the full mod-18 allocation)', () => {
    // Husafell (odd-SI nine): 9 holes, stroke indices 1-9, total par 36, CHC 23.
    // Old (buggy) mod-18 behavior would have given 14 strokes -> net par 50.
    // Correct: the odd SIs of a CHC-23 18-hole allocation give 12 strokes -> 48.
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
  it('adds the unplayed-nine share of the Course Handicap plus one to the par of the nine', () => {
    // The unplayed nine gets whatever the played nine did not (see
    // strokesForHole), plus one.
    // Real GSÍ exports (odd-SI nines): Mýrin totalPar 34, CH 26 or 27 -> 48;
    // Húsafell totalPar 36, CH 22 -> 48.
    expect(calculateNetParForNine(34, 26)).toBe(48);
    expect(calculateNetParForNine(34, 27)).toBe(48);
    expect(calculateNetParForNine(36, 22)).toBe(48);
  });

  it('gives the unplayed nine of an even-SI course the larger half of an odd Course Handicap', () => {
    // Real GSÍ-verified round, Korpa Landið (even-SI) 2026-08-19: CH 25,
    // played nine got 12, so the unplayed nine gets 13, +1 -> 36 + 14 = 50.
    expect(calculateNetParForNine(36, 25, true)).toBe(50);
    // Odd-SI course with the same CH: played 13, unplayed 12, +1 -> 49.
    expect(calculateNetParForNine(36, 25)).toBe(49);
  });

  it('falls back to plain par with no course handicap', () => {
    expect(calculateNetParForNine(36, null)).toBe(36);
  });

  it('reproduces the official GSÍ score differential for the Korpa Landið reference round', () => {
    // 2026-08-19, tee 57 (CR 68.8, slope 121), brutto 46, Course Handicap 25,
    // even-SI nine. Official GSÍ: 20 points, score differential 25.4.
    const differential = calculateRoundDifferential(46, 68.8, 121, 9, calculateNetParForNine(36, 25, true));
    expect(differential).toBeCloseTo(25.4, 1);
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
      { fairway_hit: 'yes' as const, par: 4 },
      { fairway_hit: 'yes' as const, par: 5 },
      { fairway_hit: 'missed_left' as const, par: 4 },
      { fairway_hit: 'missed_right' as const, par: 4 },
      { fairway_hit: 'missed_short' as const, par: 5 },
    ];
    // 4 eligible (2 yes, 1 left, 1 right) of 5 attempted -> naPct = 1/5 = 20%.
    expect(fairwayDistribution(holeLogs)).toEqual({ leftPct: 25, hitPct: 50, rightPct: 25, naPct: 20 });
  });

  it('returns all zeroes when there is no attempted data', () => {
    expect(fairwayDistribution([])).toEqual({ leftPct: 0, hitPct: 0, rightPct: 0, naPct: 0 });
  });

  it('returns 100% naPct when every attempt was missed short/long', () => {
    const holeLogs = [
      { fairway_hit: 'missed_short' as const, par: 4 },
      { fairway_hit: 'missed_long' as const, par: 5 },
    ];
    expect(fairwayDistribution(holeLogs)).toEqual({ leftPct: 0, hitPct: 0, rightPct: 0, naPct: 100 });
  });

  it('ignores par 3 holes, including ones carrying a value from an older round', () => {
    const holeLogs = [
      { fairway_hit: 'yes' as const, par: 4 },
      { fairway_hit: 'missed_left' as const, par: 4 },
      { fairway_hit: 'missed_right' as const, par: 3 },
      { fairway_hit: 'missed_short' as const, par: 3 },
    ];
    // Only the two par 4s count: 1 hit, 1 left, nothing missed short/long.
    expect(fairwayDistribution(holeLogs)).toEqual({ leftPct: 50, hitPct: 50, rightPct: 0, naPct: 0 });
  });

  it('returns all zeroes when every hole with a value is a par 3', () => {
    const holeLogs = [
      { fairway_hit: 'yes' as const, par: 3 },
      { fairway_hit: 'missed_left' as const, par: 3 },
    ];
    expect(fairwayDistribution(holeLogs)).toEqual({ leftPct: 0, hitPct: 0, rightPct: 0, naPct: 0 });
  });
});

describe('girPercentage', () => {
  it('computes the hit percentage across holes with a recorded GIR', () => {
    expect(girPercentage([{ gir: true }, { gir: false }, { gir: true }, { gir: false }])).toBe(50);
  });

  it('ignores holes where GIR is unknown instead of counting them as misses', () => {
    // e.g. older rounds recorded without putts: gir could not be computed
    expect(girPercentage([{ gir: true }, { gir: null }, { gir: false }, { gir: null }])).toBe(50);
  });

  it('returns 0 for no holes', () => {
    expect(girPercentage([])).toBe(0);
    expect(girPercentage([{ gir: null }])).toBe(0);
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

describe('puttsDistribution', () => {
  it('computes the percentage of holes in each putts bucket', () => {
    const holeLogs = [
      { putts: 0 },
      { putts: 1 },
      { putts: 1 },
      { putts: 2 },
      { putts: 2 },
      { putts: 2 },
      { putts: 2 },
      { putts: 3 },
      { putts: 4 },
      { putts: 5 },
    ];
    expect(puttsDistribution(holeLogs)).toEqual({
      putts0Pct: 10,
      putts1Pct: 20,
      putts2Pct: 40,
      putts3Pct: 10,
      putts4PlusPct: 20,
    });
  });

  it('ignores holes without a recorded putts count', () => {
    const holeLogs = [{ putts: 2 }, { putts: null }];
    expect(puttsDistribution(holeLogs).putts2Pct).toBe(100);
  });

  it('returns all zeroes when there is no putts data', () => {
    expect(puttsDistribution([])).toEqual({
      putts0Pct: 0,
      putts1Pct: 0,
      putts2Pct: 0,
      putts3Pct: 0,
      putts4PlusPct: 0,
    });
  });
});

describe('averagePuttsPerRound', () => {
  it('averages 18-hole putts totals as-is', () => {
    const rounds = [
      { total_putts: 30, hole_count: 18 as const },
      { total_putts: 32, hole_count: 18 as const },
    ];
    expect(averagePuttsPerRound(rounds)).toBe(31);
  });

  it('doubles 9-hole putts totals before averaging', () => {
    const rounds = [
      { total_putts: 30, hole_count: 18 as const },
      { total_putts: 16, hole_count: 9 as const },
    ];
    expect(averagePuttsPerRound(rounds)).toBe(31);
  });

  it('returns null when no round has a putts total', () => {
    expect(averagePuttsPerRound([{ total_putts: null, hole_count: 18 }])).toBeNull();
  });
});

describe('scramblingPercentage', () => {
  it('counts a missed-GIR hole saved at par or better as a scramble', () => {
    const holeLogs = [
      { gir: false, score: 4, par: 4 }, // saved par
      { gir: false, score: 3, par: 4 }, // chipped in for birdie
      { gir: false, score: 5, par: 4 }, // bogey - failed scramble
      { gir: false, score: 6, par: 4 }, // double - failed scramble
    ];
    expect(scramblingPercentage(holeLogs)).toBe(50);
  });

  it('ignores holes that hit the green or have no GIR recorded', () => {
    const holeLogs = [
      { gir: true, score: 4, par: 4 },
      { gir: null, score: 4, par: 4 },
      { gir: false, score: 4, par: 4 },
    ];
    expect(scramblingPercentage(holeLogs)).toBe(100);
  });

  it('ignores missed-GIR holes without a recorded score', () => {
    const holeLogs = [
      { gir: false, score: null, par: 4 },
      { gir: false, score: 5, par: 4 },
    ];
    expect(scramblingPercentage(holeLogs)).toBe(0);
  });

  it('returns null when there are no scrambling opportunities', () => {
    expect(scramblingPercentage([])).toBeNull();
    expect(scramblingPercentage([{ gir: true, score: 4, par: 4 }])).toBeNull();
  });
});

describe('fairwayScoreImpact', () => {
  it('averages score-vs-par separately for fairway hits and misses', () => {
    const holeLogs = [
      { fairway_hit: 'yes' as const, par: 4, score: 4 }, // hit, E
      { fairway_hit: 'yes' as const, par: 5, score: 6 }, // hit, +1
      { fairway_hit: 'missed_left' as const, par: 4, score: 6 }, // miss, +2
      { fairway_hit: 'missed_short' as const, par: 4, score: 5 }, // miss, +1
    ];
    expect(fairwayScoreImpact(holeLogs)).toEqual({
      hitAvgVsPar: 0.5,
      missAvgVsPar: 1.5,
      hitCount: 2,
      missCount: 2,
    });
  });

  it('ignores par 3s, holes without a fairway value, and holes without a score', () => {
    const holeLogs = [
      { fairway_hit: 'yes' as const, par: 3, score: 3 },
      { fairway_hit: null, par: 4, score: 5 },
      { fairway_hit: 'yes' as const, par: 4, score: null },
      { fairway_hit: 'missed_right' as const, par: 4, score: 5 },
    ];
    expect(fairwayScoreImpact(holeLogs)).toEqual({
      hitAvgVsPar: null,
      missAvgVsPar: 1,
      hitCount: 0,
      missCount: 1,
    });
  });
});

describe('girScoreImpact', () => {
  it('averages score-vs-par separately for greens hit and missed', () => {
    const holeLogs = [
      { gir: true, par: 4, score: 4 }, // hit, E
      { gir: true, par: 3, score: 4 }, // hit, +1
      { gir: false, par: 4, score: 6 }, // miss, +2
      { gir: false, par: 5, score: 6 }, // miss, +1
    ];
    expect(girScoreImpact(holeLogs)).toEqual({
      hitAvgVsPar: 0.5,
      missAvgVsPar: 1.5,
      hitCount: 2,
      missCount: 2,
    });
  });

  it('ignores holes without a GIR value or score', () => {
    const holeLogs = [
      { gir: null, par: 4, score: 5 },
      { gir: true, par: 4, score: null },
      { gir: false, par: 4, score: 5 },
    ];
    expect(girScoreImpact(holeLogs)).toEqual({
      hitAvgVsPar: null,
      missAvgVsPar: 1,
      hitCount: 0,
      missCount: 1,
    });
  });
});

describe('girPercentageByPar', () => {
  it('computes GIR percentage separately for par 3, 4, and 5 holes', () => {
    const holeLogs = [
      { gir: true, par: 3 },
      { gir: false, par: 3 },
      { gir: true, par: 4 },
      { gir: true, par: 4 },
      { gir: false, par: 4 },
      { gir: false, par: 4 },
      { gir: false, par: 5 },
    ];
    expect(girPercentageByPar(holeLogs)).toEqual({ par3: 50, par4: 50, par5: 0 });
  });

  it('ignores holes with unknown GIR and reports null for par types with no data', () => {
    const holeLogs = [
      { gir: true, par: 3 },
      { gir: null, par: 3 },
      { gir: null, par: 4 },
    ];
    expect(girPercentageByPar(holeLogs)).toEqual({ par3: 100, par4: null, par5: null });
  });
});
