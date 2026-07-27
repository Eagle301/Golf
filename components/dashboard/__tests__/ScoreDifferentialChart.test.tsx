import { render, screen, fireEvent } from '@testing-library/react-native';
import { processColor } from 'react-native';
import { ScoreDifferentialChart } from '../ScoreDifferentialChart';
import type { DifferentialRound } from '@/lib/hooks/useScoreDifferentialHistory';

function makeRound(overrides: Partial<DifferentialRound> & { id: string }): DifferentialRound {
  return {
    date_played: '2026-01-01',
    score_differential: 10,
    courseName: 'Test Course',
    totalScore: 90,
    handicapAtTime: 12.3,
    ...overrides,
  };
}

function layoutChart() {
  fireEvent(screen.getByTestId('differential-chart-svg-container'), 'layout', {
    nativeEvent: { layout: { width: 300, height: 200 } },
  });
}

// react-native-svg's <Text> implicitly wraps a string child in a <TSpan>,
// so the rendered text lives one level below the testID'd node.
function textOf(testId: string): string {
  return screen.getByTestId(testId).children[0].props.children;
}

describe('ScoreDifferentialChart', () => {
  it('shows an empty state with no rounds', () => {
    render(<ScoreDifferentialChart rounds={[]} />);
    expect(screen.getByTestId('differential-chart-empty')).toBeTruthy();
  });

  it('shows a fallback note when there are fewer than 20 rounds', () => {
    const rounds = [makeRound({ id: 'r1' }), makeRound({ id: 'r2' })];
    render(<ScoreDifferentialChart rounds={rounds} />);
    expect(screen.getByTestId('differential-chart-fallback-note')).toBeTruthy();
    expect(screen.getByText('Last 2 rounds')).toBeTruthy();
  });

  it('always shows a value label above every bar, with no tap required', () => {
    const rounds = [
      makeRound({ id: 'r1', score_differential: 12.3 }),
      makeRound({ id: 'r2', score_differential: -1.5 }),
    ];
    render(<ScoreDifferentialChart rounds={rounds} />);
    layoutChart();

    expect(textOf('differential-bar-value-0')).toBe('12.3');
    expect(textOf('differential-bar-value-1')).toBe('-1.5');
  });

  it('highlights the lowest 8 of up to 20 differentials as counted, and leaves the rest uncounted', () => {
    // 10 rounds; the 8 lowest (1..8) should be counted, 9 and 10 should not.
    const rounds = Array.from({ length: 10 }, (_, i) =>
      makeRound({ id: `r${i}`, score_differential: i + 1 })
    );
    render(<ScoreDifferentialChart rounds={rounds} />);
    layoutChart();

    const COUNTED_COLOR = processColor('#3B82F6');
    const NORMAL_COLOR = processColor('#1F2937');

    for (let i = 0; i < 8; i++) {
      expect(screen.getByTestId(`differential-bar-${i}`).props.fill.payload).toEqual(COUNTED_COLOR);
    }
    expect(screen.getByTestId('differential-bar-8').props.fill.payload).toEqual(NORMAL_COLOR);
    expect(screen.getByTestId('differential-bar-9').props.fill.payload).toEqual(NORMAL_COLOR);
  });

  it('shows date, course, score, HCP, and differential in a detail panel when a bar is tapped', () => {
    const rounds = [
      makeRound({
        id: 'r1',
        date_played: '2026-06-01',
        courseName: 'Pebble Beach',
        score_differential: 12.3,
        totalScore: 88,
        handicapAtTime: 15.4,
      }),
      makeRound({ id: 'r2', courseName: 'Augusta', score_differential: -1.5 }),
    ];
    render(<ScoreDifferentialChart rounds={rounds} />);
    layoutChart();

    expect(screen.queryByTestId('differential-chart-detail')).toBeNull();

    fireEvent.press(screen.getByTestId('differential-label-0'));

    expect(screen.getByTestId('differential-detail-date').props.children).toBe('2026-06-01');
    expect(screen.getByTestId('differential-detail-course').props.children).toBe('Pebble Beach');
    expect(screen.getByTestId('differential-detail-score').props.children).toEqual(['Score: ', 88]);
    expect(screen.getByTestId('differential-detail-hcp').props.children).toEqual(['HCP:', ' ', '15.4']);
    expect(screen.getByTestId('differential-detail-differential').props.children).toEqual([
      'Differential: ',
      '12.3',
    ]);
  });

  it('dismisses the detail panel when the same bar is tapped again', () => {
    const rounds = [makeRound({ id: 'r1' })];
    render(<ScoreDifferentialChart rounds={rounds} />);
    layoutChart();

    fireEvent.press(screen.getByTestId('differential-label-0'));
    expect(screen.getByTestId('differential-chart-detail')).toBeTruthy();

    fireEvent.press(screen.getByTestId('differential-label-0'));
    expect(screen.queryByTestId('differential-chart-detail')).toBeNull();
  });

  it('shows an em dash for HCP when handicapAtTime is null', () => {
    const rounds = [makeRound({ id: 'r1', handicapAtTime: null })];
    render(<ScoreDifferentialChart rounds={rounds} />);
    layoutChart();

    fireEvent.press(screen.getByTestId('differential-label-0'));
    expect(screen.getByTestId('differential-detail-hcp').props.children).toEqual(['HCP:', ' ', '—']);
  });

  it('themes the empty state with the Card component', () => {
    const { toJSON } = render(<ScoreDifferentialChart rounds={[]} />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain('bg-surface');
    expect(tree).toContain('rounded-2xl');
  });
});
