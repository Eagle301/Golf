import type { FairwayHit } from '@/types/database';

export interface CachedHole {
  id: string;
  hole_number: number;
  par: 3 | 4 | 5;
  stroke_index: number | null;
}

export interface CachedTeeBox {
  id: string;
  name: string;
  course_rating: number | null;
  slope_rating: number | null;
  total_length_meters: number | null;
  /** Per-hole lengths in meters, aligned with the course's holes sorted by hole_number. */
  lengths: (number | null)[];
}

export interface CachedCourse {
  id: string;
  name: string;
  hole_count: 9 | 18;
  total_par: number | null;
  holes: CachedHole[];
  tees: CachedTeeBox[];
}

export interface HoleLogEntry {
  hole_number: number;
  par: number;
  length_meters: number | null;
  stroke_index: number | null;
  hole_id: string;
  score: number | null;
  putts: number | null;
  fairway_hit: FairwayHit | null;
  gir: boolean | null;
  /**
   * Local to the round in progress, and deliberately not a database column:
   * it only exists so a hand-set GIR isn't clobbered when the score or putts
   * on that hole are edited afterwards. Finishing the round resolves gir to
   * its final value, after which the flag has nothing left to say.
   */
  gir_overridden: boolean;
  penalties: number;
  chip_shots: number;
}

export interface ActiveRound {
  localId: string;
  course_id: string;
  course_name: string;
  tee_box_id: string | null;
  tee_name: string | null;
  hole_count: 9 | 18;
  /** Snapshot of the selected tee's rating at round start. */
  course_rating: number | null;
  slope_rating: number | null;
  total_par: number | null;
  total_length_meters: number | null;
  handicap_at_start: number | null;
  date_played: string;
  notes: string;
  currentHoleIndex: number;
  holeLogs: HoleLogEntry[];
}

export interface PendingRound {
  localId: string;
  course_id: string;
  tee_box_id: string | null;
  date_played: string;
  notes: string;
  total_score: number;
  total_putts: number;
  score_differential: number | null;
  handicap_at_time: number | null;
  holeLogs: HoleLogEntry[];
}
