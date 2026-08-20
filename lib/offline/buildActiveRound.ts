import type { ActiveRound, CachedCourse, CachedTeeBox } from './types';

interface BuildActiveRoundOptions {
  localId: string;
  handicap: number | null;
  datePlayed: string;
}

/** Snapshot a course + chosen tee into a fresh in-progress round. */
export function buildActiveRound(
  course: CachedCourse,
  tee: CachedTeeBox,
  { localId, handicap, datePlayed }: BuildActiveRoundOptions
): ActiveRound {
  return {
    localId,
    course_id: course.id,
    course_name: course.name,
    tee_box_id: tee.id,
    tee_name: tee.name,
    hole_count: course.hole_count,
    course_rating: tee.course_rating,
    slope_rating: tee.slope_rating,
    total_par: course.total_par,
    total_length_meters: tee.total_length_meters,
    handicap_at_start: handicap,
    date_played: datePlayed,
    notes: '',
    currentHoleIndex: -1,
    holeLogs: course.holes.map((h, i) => ({
      hole_number: h.hole_number,
      par: h.par,
      length_meters: tee.lengths[i] ?? null,
      stroke_index: h.stroke_index,
      hole_id: h.id,
      score: null,
      putts: null,
      fairway_hit: null,
      gir: null,
      gir_overridden: false,
      penalties: 0,
      chip_shots: 0,
    })),
  };
}
