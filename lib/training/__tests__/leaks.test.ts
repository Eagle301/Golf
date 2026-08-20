import { computeLeaks, type LeakHoleLog } from '../leaks';

function makeHole(overrides: Partial<LeakHoleLog> = {}): LeakHoleLog {
  return {
    putts: null,
    penalties: 0,
    chip_shots: 0,
    gir: null,
    score: null,
    par: 4,
    fairway_hit: null,
    ...overrides,
  };
}

describe('computeLeaks', () => {
  it('measures strokes lost per round to 3-putts (strokes beyond 2 per hole)', () => {
    const holeLogs = [
      makeHole({ putts: 3, gir: true }), // 1 lost
      makeHole({ putts: 4, gir: true }), // 2 lost
      makeHole({ putts: 2, gir: true }),
      makeHole({ gir: true }),
    ];
    const leaks = computeLeaks(holeLogs, 2);

    // 2 holes with 3+ putts across 2 rounds -> 1 per round
    expect(leaks[0]).toEqual({ kind: 'three_putts', strokesPerRound: 1.5, category: 'putts', perRound: 1 });
  });

  it('measures strokes lost to penalties and ranks it first when largest', () => {
    const holeLogs = [
      makeHole({ putts: 2, penalties: 2, gir: true }),
      makeHole({ putts: 3, penalties: 1, gir: true }),
    ];
    const leaks = computeLeaks(holeLogs, 1);

    expect(leaks[0]).toEqual({ kind: 'penalties', strokesPerRound: 3, category: 'strategy', perRound: 3 });
  });

  it('measures strokes lost to extra chips on missed greens (chips beyond the first)', () => {
    const holeLogs = [
      makeHole({ putts: 2, chip_shots: 3, gir: false }), // 2 lost
      makeHole({ putts: 2, chip_shots: 1, gir: false }), // clean - 0 lost
      makeHole({ putts: 2, chip_shots: 2, gir: true }), // green hit: fringe chips don't count
    ];
    const leaks = computeLeaks(holeLogs, 2);

    // 3 + 1 + 2 = 6 total chip shots across 2 rounds -> 3 per round
    expect(leaks.find((l) => l.kind === 'chips')).toEqual({
      kind: 'chips',
      strokesPerRound: 1,
      category: 'short_game',
      perRound: 3,
    });
  });

  it('measures the up & down leak as one lost stroke per failed chance, per round', () => {
    const holeLogs = [
      makeHole({ gir: false, chip_shots: 1, putts: 1 }), // classic up & down - saved
      makeHole({ gir: false, chip_shots: 1, putts: 0 }), // chip-in counts - saved
      makeHole({ gir: false, chip_shots: 1, putts: 2 }), // failed: 2 putts
      makeHole({ gir: false, chip_shots: 2, putts: 1 }), // failed: 2 chips
      makeHole({ gir: false, chip_shots: 1, putts: 3 }), // failed: still just 1 lost stroke
      makeHole({ gir: false, chip_shots: 1, putts: null }), // unjudgeable: skipped
      makeHole({ gir: true, chip_shots: 1, putts: 2 }), // fringe chip: not a chance
      makeHole({ gir: false, chip_shots: 0, putts: 2 }), // no chip: not a chance
    ];
    const upAndDown = computeLeaks(holeLogs, 2).find((l) => l.kind === 'up_and_down');

    expect(upAndDown).toEqual({
      kind: 'up_and_down',
      strokesPerRound: 1.5, // 3 failed chances, capped at 1 stroke each / 2 rounds
      category: 'short_game',
      upAndDownPct: 40, // 2 of 5 judged chances
      upAndDownOppsPerRound: 2.5, // 5 chances / 2 rounds
    });
  });

  it('reports a null up & down leak with no chip data', () => {
    const upAndDown = computeLeaks([makeHole({ putts: 2, gir: true })], 1).find(
      (l) => l.kind === 'up_and_down'
    );

    expect(upAndDown?.strokesPerRound).toBeNull();
    expect(upAndDown?.upAndDownPct).toBeNull();
    expect(upAndDown?.upAndDownOppsPerRound).toBe(0);
  });

  it('measures a tee shot leak from the scoring gap between fairway hits and misses', () => {
    const hits = Array.from({ length: 5 }, () => makeHole({ fairway_hit: 'yes', score: 4 }));
    const misses = Array.from({ length: 5 }, () => makeHole({ fairway_hit: 'missed_left', score: 5 }));
    const leaks = computeLeaks([...hits, ...misses], 2);

    // misses average +1 worse, 2.5 misses per round -> 2.5 strokes/round
    expect(leaks[0]).toEqual({
      kind: 'tee_shots',
      strokesPerRound: 2.5,
      category: 'full_swing',
      hitAvgVsPar: 0,
      missAvgVsPar: 1,
    });
  });

  it('measures an approach leak from the scoring gap between greens hit and missed', () => {
    const hits = Array.from({ length: 5 }, () => makeHole({ gir: true, score: 4 }));
    const misses = Array.from({ length: 5 }, () => makeHole({ gir: false, score: 6 }));
    const leaks = computeLeaks([...hits, ...misses], 2);

    // misses average +2 worse, 2.5 misses per round -> 5 strokes/round
    expect(leaks[0]).toEqual({
      kind: 'approach',
      strokesPerRound: 5,
      category: 'full_swing',
      hitAvgVsPar: 0,
      missAvgVsPar: 2,
    });
  });

  it('still reports hit/miss averages when the sample is too small to rank the leak', () => {
    const hits = Array.from({ length: 4 }, () => makeHole({ fairway_hit: 'yes', score: 4 }));
    const misses = Array.from({ length: 5 }, () => makeHole({ fairway_hit: 'missed_left', score: 6 }));
    const leaks = computeLeaks([...hits, ...misses], 2);

    const teeShots = leaks.find((l) => l.kind === 'tee_shots');
    expect(teeShots?.strokesPerRound).toBeNull();
    expect(teeShots?.hitAvgVsPar).toBe(0);
    expect(teeShots?.missAvgVsPar).toBe(2);
  });

  it('always returns all six leaks, ranked by strokes lost with unmeasurable ones last', () => {
    const holeLogs = [
      makeHole({ putts: 3, penalties: 1, chip_shots: 2, gir: false, score: 6 }), // 1 to putts, 1 to penalties, 1 to chips, 1 failed up & down
      makeHole({ putts: 4, gir: true, score: 5 }), // 2 to putts
    ];
    const leaks = computeLeaks(holeLogs, 1);

    // Not enough fairway/GIR data for the gap-based leaks -> null value, ranked last.
    // penalties/chips/up_and_down tie at 1 and keep declaration order.
    expect(leaks.map((l) => l.kind)).toEqual([
      'three_putts',
      'penalties',
      'chips',
      'up_and_down',
      'tee_shots',
      'approach',
    ]);
    expect(leaks.map((l) => l.strokesPerRound)).toEqual([3, 1, 1, 1, null, null]);
  });

  it('needs at least 5 holes in both buckets before trusting a hit/miss gap', () => {
    const hits = Array.from({ length: 4 }, () => makeHole({ fairway_hit: 'yes', score: 4 }));
    const misses = Array.from({ length: 5 }, () => makeHole({ fairway_hit: 'missed_left', score: 6 }));
    const leaks = computeLeaks([...hits, ...misses], 2);

    expect(leaks.find((l) => l.kind === 'tee_shots')?.strokesPerRound).toBeNull();
  });

  it('reports zero, not a negative leak, when the hit/miss gap favors missing', () => {
    const hits = Array.from({ length: 5 }, () => makeHole({ fairway_hit: 'yes', score: 5 }));
    const misses = Array.from({ length: 5 }, () => makeHole({ fairway_hit: 'missed_left', score: 4 }));
    const leaks = computeLeaks([...hits, ...misses], 2);

    expect(leaks.find((l) => l.kind === 'tee_shots')?.strokesPerRound).toBe(0);
  });

  it('returns an empty list when there are no rounds', () => {
    expect(computeLeaks([], 0)).toEqual([]);
  });
});
