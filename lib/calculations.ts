import type { Round } from '@/types/database';

/** Handicap = simple average of the best 8 score_differential values from the last 20 rounds. */
export function calculateHandicap(rounds: Round[]): number | null {
  const last20 = [...rounds]
    .sort((a, b) => new Date(b.date_played).getTime() - new Date(a.date_played).getTime())
    .slice(0, 20)
    .map((r) => r.score_differential)
    .filter((d): d is number => d !== null);

  if (last20.length === 0) return null;

  const best8 = [...last20].sort((a, b) => a - b).slice(0, Math.min(8, last20.length));
  return best8.reduce((sum, d) => sum + d, 0) / best8.length;
}

/** gir = (score - putts) <= (par - 2), overridable per hole. */
export function calculateGir(score: number, putts: number, par: number): boolean {
  return score - putts <= par - 2;
}
