export interface DifferentialRound {
  id: string;
  date_played: string;
  score_differential: number;
  courseName: string;
  totalScore: number;
  handicapAtTime: number | null;
}

/** Rolling window matching the handicap calculation (best 8 of last 20). */
export const DIFFERENTIAL_HISTORY_LIMIT = 20;
