jest.mock('@/lib/hooks/useProfile', () => ({ useProfile: jest.fn() }));
jest.mock('@/lib/hooks/useScoreDifferentialHistory', () => ({ useScoreDifferentialHistory: jest.fn() }));
jest.mock('@/lib/hooks/useRoundStats', () => ({ useRoundStats: jest.fn() }));
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => effect(),
}));

import { render, screen, fireEvent } from '@testing-library/react-native';
import { useProfile } from '@/lib/hooks/useProfile';
import { useScoreDifferentialHistory } from '@/lib/hooks/useScoreDifferentialHistory';
import { useRoundStats } from '@/lib/hooks/useRoundStats';
import DashboardScreen from '../index';

describe('DashboardScreen', () => {
  const refetch = jest.fn();
  const refetchDifferentials = jest.fn();
  const refetchStats = jest.fn();

  beforeEach(() => {
    refetch.mockClear();
    refetchDifferentials.mockClear();
    refetchStats.mockClear();
    (useProfile as jest.Mock).mockReturnValue({ handicap: 12.4, fullName: 'Jane Golfer', loading: false, refetch });
    (useRoundStats as jest.Mock).mockReturnValue({
      stats: {
        averageScore: 91.5,
        fairwayDistribution: { leftPct: 20, hitPct: 60, rightPct: 20, naPct: 10 },
        girPercentage: 35,
        scoreByPar: { par3: 3.5, par4: 4.8, par5: 5.2 },
        scoringCategoryAverages: { eagle: 0.1, birdie: 1.2, par: 8.5, bogey: 5.4, double: 2.1, doubleOrWorse: 0.7 },
        averagePutts: 31.4,
        puttsDistribution: { putts0Pct: 5, putts1Pct: 15, putts2Pct: 50, putts3Pct: 25, putts4PlusPct: 5 },
      },
      loading: false,
      refetch: refetchStats,
    });
  });

  it('shows the empty chart state when there are no differential rounds yet', () => {
    (useScoreDifferentialHistory as jest.Mock).mockReturnValue({
      rounds: [],
      loading: false,
      refetch: refetchDifferentials,
    });

    render(<DashboardScreen />);

    expect(screen.getByTestId('handicap-value').props.children).toBe('12.4');
    expect(screen.getByTestId('differential-chart-empty')).toBeTruthy();
  });

  it('shows a loading indicator for the chart while differentials load', () => {
    (useScoreDifferentialHistory as jest.Mock).mockReturnValue({
      rounds: [],
      loading: true,
      refetch: refetchDifferentials,
    });

    render(<DashboardScreen />);

    expect(screen.getByTestId('differential-chart-loading')).toBeTruthy();
  });

  it('renders the chart once differential rounds are loaded', () => {
    (useScoreDifferentialHistory as jest.Mock).mockReturnValue({
      rounds: [{ id: 'r1', date_played: '2026-07-01', score_differential: 8.4, courseName: 'Mýrin' }],
      loading: false,
      refetch: refetchDifferentials,
    });

    render(<DashboardScreen />);

    expect(screen.getByTestId('differential-chart')).toBeTruthy();
  });

  it('shows the user name and handicap together in the header row', () => {
    (useScoreDifferentialHistory as jest.Mock).mockReturnValue({
      rounds: [],
      loading: false,
      refetch: refetchDifferentials,
    });

    render(<DashboardScreen />);

    expect(screen.getByTestId('dashboard-user-name').props.children).toBe('Jane Golfer');
    expect(screen.getByTestId('handicap-value').props.children).toBe('12.4');
  });

  it('shows the average 18-hole score next to the scoring-by-par chart, not in the header', () => {
    (useScoreDifferentialHistory as jest.Mock).mockReturnValue({
      rounds: [],
      loading: false,
      refetch: refetchDifferentials,
    });

    render(<DashboardScreen />);

    expect(screen.getByTestId('dashboard-average-score').props.children).toBe('91.5');
    expect(screen.getByTestId('average-score-card')).toBeTruthy();
  });

  it('shows the eagle/birdie/par/bogey/double/double+ breakdown under the average score', () => {
    (useScoreDifferentialHistory as jest.Mock).mockReturnValue({
      rounds: [],
      loading: false,
      refetch: refetchDifferentials,
    });

    render(<DashboardScreen />);

    expect(screen.queryByTestId('scoring-category-eagle')).toBeNull();
    expect(screen.getByTestId('scoring-category-birdie').props.children).toBe('1.2');
    expect(screen.getByTestId('scoring-category-par').props.children).toBe('8.5');
    expect(screen.getByTestId('scoring-category-bogey').props.children).toBe('5.4');
    expect(screen.getByTestId('scoring-category-double').props.children).toBe('2.1');
    expect(screen.getByTestId('scoring-category-doubleOrWorse').props.children).toBe('0.7');
  });

  it('renders the fairway distribution, GIR donut, and scoring-by-par charts once stats load', () => {
    (useScoreDifferentialHistory as jest.Mock).mockReturnValue({
      rounds: [],
      loading: false,
      refetch: refetchDifferentials,
    });

    render(<DashboardScreen />);

    expect(screen.getByTestId('fairway-distribution-chart')).toBeTruthy();
    expect(screen.getByTestId('gir-donut-chart')).toBeTruthy();
    expect(screen.getByTestId('scoring-by-par-chart')).toBeTruthy();
    expect(screen.getByTestId('gir-donut-value').props.children).toBe('35%');
  });

  it('shows loading indicators for the stats charts while stats load', () => {
    (useScoreDifferentialHistory as jest.Mock).mockReturnValue({
      rounds: [],
      loading: false,
      refetch: refetchDifferentials,
    });
    (useRoundStats as jest.Mock).mockReturnValue({ stats: null, loading: true, refetch: refetchStats });

    render(<DashboardScreen />);

    expect(screen.getByTestId('fairway-distribution-loading')).toBeTruthy();
    expect(screen.getByTestId('gir-donut-loading')).toBeTruthy();
    expect(screen.getByTestId('average-score-loading')).toBeTruthy();
    expect(screen.getByTestId('scoring-by-par-loading')).toBeTruthy();
  });

  it('renders the putts distribution chart, compact by default (no "/ round" suffix)', () => {
    (useScoreDifferentialHistory as jest.Mock).mockReturnValue({
      rounds: [],
      loading: false,
      refetch: refetchDifferentials,
    });

    render(<DashboardScreen />);

    expect(screen.getByTestId('putts-distribution-chart')).toBeTruthy();
    expect(screen.getByTestId('putts-average-per-round').props.children).toBe('Avg. 31.4');
  });

  it('collapses the fairway/putts stats by default, showing Hit% and hiding the legends', () => {
    (useScoreDifferentialHistory as jest.Mock).mockReturnValue({
      rounds: [],
      loading: false,
      refetch: refetchDifferentials,
    });

    render(<DashboardScreen />);

    expect(screen.getByTestId('fairway-hit-stat').props.children.join('')).toBe('Hit 60%');
    expect(screen.queryByTestId('fairway-na-stat')).toBeNull();
    expect(screen.getByTestId('gir-donut-card')).toBeTruthy();
  });

  it('expands the fairway/putts card to full detail on tap, hiding the GIR donut card', () => {
    (useScoreDifferentialHistory as jest.Mock).mockReturnValue({
      rounds: [],
      loading: false,
      refetch: refetchDifferentials,
    });

    render(<DashboardScreen />);
    fireEvent.press(screen.getByTestId('fairway-putts-toggle'));

    expect(screen.getByTestId('fairway-na-stat').props.children.join('')).toBe('N/A 10%');
    expect(screen.getByTestId('putts-average-per-round').props.children).toBe('Avg. 31.4 / round');
    expect(screen.queryByTestId('gir-donut-card')).toBeNull();
  });

  it('collapses back to compact and restores the GIR donut card on a second tap', () => {
    (useScoreDifferentialHistory as jest.Mock).mockReturnValue({
      rounds: [],
      loading: false,
      refetch: refetchDifferentials,
    });

    render(<DashboardScreen />);
    fireEvent.press(screen.getByTestId('fairway-putts-toggle'));
    fireEvent.press(screen.getByTestId('fairway-putts-toggle'));

    expect(screen.getByTestId('fairway-hit-stat')).toBeTruthy();
    expect(screen.getByTestId('gir-donut-card')).toBeTruthy();
  });
});

describe('DashboardScreen theming', () => {
  const refetch = jest.fn();
  const refetchDifferentials = jest.fn();
  const refetchStats = jest.fn();

  beforeEach(() => {
    refetch.mockClear();
    refetchDifferentials.mockClear();
    refetchStats.mockClear();
    (useProfile as jest.Mock).mockReturnValue({ handicap: 12.4, fullName: 'Jane Golfer', loading: false, refetch });
    (useScoreDifferentialHistory as jest.Mock).mockReturnValue({
      rounds: [],
      loading: false,
      refetch: refetchDifferentials,
    });
    (useRoundStats as jest.Mock).mockReturnValue({
      stats: {
        averageScore: 91.5,
        fairwayDistribution: { leftPct: 20, hitPct: 60, rightPct: 20, naPct: 10 },
        girPercentage: 35,
        scoreByPar: { par3: 3.5, par4: 4.8, par5: 5.2 },
        scoringCategoryAverages: { eagle: 0.1, birdie: 1.2, par: 8.5, bogey: 5.4, double: 2.1, doubleOrWorse: 0.7 },
        averagePutts: 31.4,
        puttsDistribution: { putts0Pct: 5, putts1Pct: 15, putts2Pct: 50, putts3Pct: 25, putts4PlusPct: 5 },
      },
      loading: false,
      refetch: refetchStats,
    });
  });

  it('themes the root scroll view with the background token', () => {
    const { toJSON } = render(<DashboardScreen />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('bg-background');
    expect(tree).toContain('dark:bg-background-dark');
  });

  it('wraps the differential chart card in the themed Card component', () => {
    render(<DashboardScreen />);
    expect(screen.getByTestId('differential-chart-card').props.className).toEqual(
      expect.stringContaining('rounded-2xl')
    );
    expect(screen.getByTestId('differential-chart-card').props.className).toEqual(
      expect.stringContaining('bg-surface')
    );
  });
});
