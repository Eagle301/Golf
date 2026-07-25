import {
  calculateHandicap,
  calculateGir,
  calculateRoundDifferential,
  calculateCourseHandicap,
  strokesForHole,
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
});
