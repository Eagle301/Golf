import { buildActiveRound } from '../buildActiveRound';
import type { CachedCourse, CachedTeeBox } from '../types';

const tee: CachedTeeBox = {
  id: 't1',
  name: 'Gulur',
  course_rating: 68.5,
  slope_rating: 125,
  total_length_meters: 3000,
  lengths: [330, 340, 350, 100, 500, 320, 310, 150, 400],
};

const course: CachedCourse = {
  id: 'c1',
  name: 'Test GC',
  club: 'GKG',
  hole_count: 9,
  total_par: 36,
  holes: Array.from({ length: 9 }, (_, i) => ({
    id: `h${i + 1}`,
    hole_number: i + 1,
    par: 4 as const,
    stroke_index: i + 1,
  })),
  tees: [tee],
};

describe('buildActiveRound', () => {
  it('snapshots the tee ratings and per-hole lengths into the round', () => {
    const round = buildActiveRound(course, tee, {
      localId: 'local_x',
      handicap: 12.4,
      datePlayed: '2026-08-20',
    });

    expect(round).toMatchObject({
      localId: 'local_x',
      course_id: 'c1',
      course_name: 'Test GC',
      tee_box_id: 't1',
      tee_name: 'Gulur',
      hole_count: 9,
      course_rating: 68.5,
      slope_rating: 125,
      total_par: 36,
      total_length_meters: 3000,
      handicap_at_start: 12.4,
      date_played: '2026-08-20',
      currentHoleIndex: -1,
    });
    expect(round.holeLogs).toHaveLength(9);
    expect(round.holeLogs[0]).toMatchObject({
      hole_number: 1,
      hole_id: 'h1',
      par: 4,
      stroke_index: 1,
      length_meters: 330,
      score: null,
      gir_overridden: false,
      penalties: 0,
    });
  });

  it('leaves a hole length null when the tee has no length for it', () => {
    const shortTee = { ...tee, lengths: [330] };
    const round = buildActiveRound(course, shortTee, {
      localId: 'local_x',
      handicap: null,
      datePlayed: '2026-08-20',
    });
    expect(round.holeLogs[1].length_meters).toBeNull();
  });
});
