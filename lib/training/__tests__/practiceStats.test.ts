import { drillStats, relativeDayLabel, isStalePractice, latestDateByKey } from '../practiceStats';
import type { DrillProgress } from '@/lib/hooks/useDrillProgress';

describe('drillStats', () => {
  const drill = (points: { value: number }[]): DrillProgress => ({
    drillId: 'd1',
    name: 'Drill',
    targetValue: 10,
    // useDrillProgress orders points oldest first
    points: points.map((p, i) => ({ sessionId: `s${i}`, date: `2026-01-0${i + 1}`, value: p.value })),
  });

  it('reports the most recent value as last and the maximum as best', () => {
    const stats = drillStats([drill([{ value: 4 }, { value: 9 }, { value: 6 }])]);
    expect(stats['d1']).toEqual({ last: 6, best: 9 });
  });

  it('reports nulls for a drill with no logged values', () => {
    const stats = drillStats([drill([])]);
    expect(stats['d1']).toEqual({ last: null, best: null });
  });
});

describe('relativeDayLabel', () => {
  const today = '2026-08-24';

  it('labels today and yesterday', () => {
    expect(relativeDayLabel('2026-08-24', today)).toBe('Today');
    expect(relativeDayLabel('2026-08-23', today)).toBe('Yesterday');
  });

  it('labels the past two weeks in days', () => {
    expect(relativeDayLabel('2026-08-21', today)).toBe('3 days ago');
    expect(relativeDayLabel('2026-08-11', today)).toBe('13 days ago');
  });

  it('labels older dates in weeks', () => {
    expect(relativeDayLabel('2026-08-10', today)).toBe('2 weeks ago');
    expect(relativeDayLabel('2026-07-10', today)).toBe('6 weeks ago');
  });

  it('falls back to a short date after two months', () => {
    expect(relativeDayLabel('2026-05-01', today)).toBe('May 1');
    expect(relativeDayLabel('2025-12-24', today)).toBe('Dec 24, 2025');
  });
});

describe('isStalePractice', () => {
  const today = '2026-08-24';

  it('treats never-practiced as stale', () => {
    expect(isStalePractice(null, today)).toBe(true);
  });

  it('treats within two weeks as fresh and beyond as stale', () => {
    expect(isStalePractice('2026-08-11', today)).toBe(false);
    expect(isStalePractice('2026-08-09', today)).toBe(true);
  });
});

describe('latestDateByKey', () => {
  it('keeps the latest date per key', () => {
    const rows = [
      { key: 'putts', date: '2026-08-01' },
      { key: 'putts', date: '2026-08-20' },
      { key: 'full_swing', date: '2026-08-05' },
    ];
    expect(latestDateByKey(rows, (r) => r.key, (r) => r.date)).toEqual({
      putts: '2026-08-20',
      full_swing: '2026-08-05',
    });
  });

  it('ignores rows without a key', () => {
    const rows = [{ key: null as string | null, date: '2026-08-01' }];
    expect(latestDateByKey(rows, (r) => r.key, (r) => r.date)).toEqual({});
  });
});
