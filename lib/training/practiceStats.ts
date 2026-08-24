import type { DrillProgress } from '@/lib/hooks/useDrillProgress';

/**
 * Pure helpers behind the "Last 6 · Best 9" context in live training and the
 * "Last practiced" labels on the Training tab's category cards and routine
 * rows. Dates are compared as YYYY-MM-DD strings throughout, matching how
 * sessions store date_played.
 */

export interface DrillStat {
  last: number | null;
  best: number | null;
}

/** Most recent and highest logged value per drill, from progress points ordered oldest first. */
export function drillStats(drills: DrillProgress[]): Record<string, DrillStat> {
  const stats: Record<string, DrillStat> = {};
  for (const drill of drills) {
    const values = drill.points.map((p) => p.value);
    stats[drill.drillId] = {
      last: values.length > 0 ? values[values.length - 1] : null,
      best: values.length > 0 ? Math.max(...values) : null,
    };
  }
  return stats;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T00:00:00Z`).getTime();
  const to = new Date(`${toISO}T00:00:00Z`).getTime();
  return Math.round((to - from) / 86_400_000);
}

/** "Today" / "Yesterday" / "3 days ago" / "2 weeks ago", falling back to "May 1" (with year if not this year). */
export function relativeDayLabel(dateISO: string, todayISO: string): string {
  const days = daysBetween(dateISO, todayISO);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 61) return `${Math.floor(days / 7)} weeks ago`;

  const [year, month, day] = dateISO.split('-').map((part) => parseInt(part, 10));
  const sameYear = dateISO.slice(0, 4) === todayISO.slice(0, 4);
  return `${MONTHS[month - 1]} ${day}${sameYear ? '' : `, ${year}`}`;
}

/** A category or routine counts as stale when never practiced or last practiced over two weeks ago. */
export function isStalePractice(lastDateISO: string | null, todayISO: string): boolean {
  if (lastDateISO === null) return true;
  return daysBetween(lastDateISO, todayISO) > 14;
}

/** Latest date per key over arbitrary rows - e.g. last session date per category or per routine. */
export function latestDateByKey<T>(
  rows: T[],
  keyOf: (row: T) => string | null,
  dateOf: (row: T) => string
): Record<string, string> {
  const latest: Record<string, string> = {};
  for (const row of rows) {
    const key = keyOf(row);
    if (key === null) continue;
    const date = dateOf(row);
    if (latest[key] === undefined || date > latest[key]) {
      latest[key] = date;
    }
  }
  return latest;
}
