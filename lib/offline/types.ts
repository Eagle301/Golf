import type { FairwayHit } from '@/types/database';

export interface CachedHole {
  id: string;
  hole_number: number;
  par: 3 | 4 | 5;
  length_meters: number | null;
  stroke_index: number | null;
}

export interface CachedCourse {
  id: string;
  name: string;
  hole_count: 9 | 18;
  total_par: number | null;
  total_length_meters: number | null;
  course_rating: number | null;
  slope_rating: number | null;
  holes: CachedHole[];
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
  gir_overridden: boolean;
  penalties: number;
  chip_shots: number;
}

export interface ActiveRound {
  localId: string;
  course_id: string;
  course_name: string;
  hole_count: 9 | 18;
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
  date_played: string;
  notes: string;
  total_score: number;
  total_putts: number;
  score_differential: number | null;
  handicap_at_time: number | null;
  holeLogs: HoleLogEntry[];
}
