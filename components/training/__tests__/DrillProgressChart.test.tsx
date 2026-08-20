import { render, screen, fireEvent } from '@testing-library/react-native';
import { DrillProgressChart } from '../DrillProgressChart';
import type { DrillProgress } from '@/lib/hooks/useDrillProgress';

function makeDrill(overrides: Partial<DrillProgress> = {}): DrillProgress {
  return {
    drillId: 'd1',
    name: '3m putts',
    targetValue: 8,
    points: [
      { sessionId: 's1', date: '2026-08-01', value: 5 },
      { sessionId: 's2', date: '2026-08-10', value: 7 },
    ],
    ...overrides,
  };
}

function layoutChart() {
  fireEvent(screen.getByTestId('drill-chart-svg-d1'), 'layout', {
    nativeEvent: { layout: { width: 300, height: 160 } },
  });
}

// react-native-svg's <Text> wraps a string child in a <TSpan>, so the
// rendered text lives one level below the testID'd node.
function textOf(testId: string): string {
  return screen.getByTestId(testId).children[0].props.children;
}

describe('DrillProgressChart', () => {
  it('shows the drill name, target, and latest value in the header', () => {
    render(<DrillProgressChart drill={makeDrill()} />);

    expect(screen.getByTestId('drill-chart-name-d1').props.children).toBe('3m putts');
    expect(screen.getByTestId('drill-chart-target-d1').props.children.join('')).toBe('Target 8');
    expect(screen.getByTestId('drill-chart-latest-d1').props.children.join('')).toBe('Latest 7');
  });

  it('shows an empty state when the drill has no logged values yet', () => {
    render(<DrillProgressChart drill={makeDrill({ points: [] })} />);

    expect(screen.getByTestId('drill-chart-empty-d1')).toBeTruthy();
    expect(screen.queryByTestId('drill-chart-svg-d1')).toBeNull();
  });

  it('draws a dot and value label for every logged session', () => {
    render(<DrillProgressChart drill={makeDrill()} />);
    layoutChart();

    expect(screen.getByTestId('drill-point-d1-0')).toBeTruthy();
    expect(screen.getByTestId('drill-point-d1-1')).toBeTruthy();
    expect(textOf('drill-point-value-d1-0')).toBe('5');
    expect(textOf('drill-point-value-d1-1')).toBe('7');
  });

  it('draws a dashed target line when the drill has a target', () => {
    render(<DrillProgressChart drill={makeDrill()} />);
    layoutChart();

    expect(screen.getByTestId('drill-target-line-d1')).toBeTruthy();
  });

  it('omits the target line and label when the drill has no target', () => {
    render(<DrillProgressChart drill={makeDrill({ targetValue: null })} />);
    layoutChart();

    expect(screen.queryByTestId('drill-target-line-d1')).toBeNull();
    expect(screen.queryByTestId('drill-chart-target-d1')).toBeNull();
  });
});
