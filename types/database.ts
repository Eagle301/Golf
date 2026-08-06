export type Weather = 'sunny' | 'cloudy' | 'windy' | 'rainy' | 'cold' | 'other';

export type FairwayHit =
  | 'yes'
  | 'missed_left'
  | 'missed_right'
  | 'missed_short'
  | 'missed_long';

export interface Profile {
  id: string;
  full_name: string | null;
  handicap: number | null;
  created_at: string;
}

export interface Course {
  id: string;
  user_id: string;
  name: string;
  hole_count: 9 | 18;
  total_par: number | null;
  total_length_meters: number | null;
  course_rating: number | null;
  slope_rating: number | null;
  created_at: string;
}

export interface Hole {
  id: string;
  course_id: string;
  hole_number: number;
  par: 3 | 4 | 5;
  length_meters: number | null;
  stroke_index: number | null;
}

export interface Round {
  id: string;
  user_id: string;
  course_id: string;
  date_played: string;
  total_score: number | null;
  total_putts: number | null;
  weather: Weather | null;
  notes: string | null;
  score_differential: number | null;
  handicap_at_time: number | null;
  created_at: string;
}

export interface HoleLog {
  id: string;
  round_id: string;
  hole_id: string;
  score: number | null;
  putts: number | null;
  fairway_hit: FairwayHit | null;
  gir: boolean | null;
  gir_overridden: boolean;
  penalties: number;
  chip_shots: number;
}

export type TrainingCategory = 'putts' | 'short_game' | 'full_swing' | 'strategy';

export interface TrainingRoutine {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: TrainingCategory;
  created_at: string;
}

export interface TrainingDrill {
  id: string;
  routine_id: string;
  name: string;
  target_value: number | null;
  photo_url: string | null;
  sort_order: number;
}

export interface TrainingSession {
  id: string;
  user_id: string;
  routine_id: string;
  date_played: string;
  note: string | null;
  created_at: string;
}

export interface TrainingDrillLog {
  id: string;
  session_id: string;
  drill_id: string;
  value: number | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
      };
      courses: {
        Row: Course;
        Insert: Partial<Course> & { user_id: string; name: string };
        Update: Partial<Course>;
      };
      holes: {
        Row: Hole;
        Insert: Partial<Hole> & { course_id: string; hole_number: number; par: 3 | 4 | 5 };
        Update: Partial<Hole>;
      };
      rounds: {
        Row: Round;
        Insert: Partial<Round> & { user_id: string; course_id: string; date_played: string };
        Update: Partial<Round>;
      };
      hole_logs: {
        Row: HoleLog;
        Insert: Partial<HoleLog> & { round_id: string; hole_id: string };
        Update: Partial<HoleLog>;
      };
      training_routines: {
        Row: TrainingRoutine;
        Insert: Partial<TrainingRoutine> & { user_id: string; name: string; category: TrainingCategory };
        Update: Partial<TrainingRoutine>;
      };
      training_drills: {
        Row: TrainingDrill;
        Insert: Partial<TrainingDrill> & { routine_id: string; name: string; sort_order: number };
        Update: Partial<TrainingDrill>;
      };
      training_sessions: {
        Row: TrainingSession;
        Insert: Partial<TrainingSession> & { user_id: string; routine_id: string; date_played: string };
        Update: Partial<TrainingSession>;
      };
      training_drill_logs: {
        Row: TrainingDrillLog;
        Insert: Partial<TrainingDrillLog> & { session_id: string; drill_id: string };
        Update: Partial<TrainingDrillLog>;
      };
    };
  };
}
