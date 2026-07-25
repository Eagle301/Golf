import { render, screen } from '@testing-library/react-native';
import { RoundOverviewScorecard, type OverviewHole } from '../RoundOverviewScorecard';

function makeHole(overrides: Partial<OverviewHole> & { hole_number: number }): OverviewHole {
  return {
    par: 4,
    length_meters: 350,
    stroke_index: overrides.hole_number,
    ...overrides,
  };
}

describe('RoundOverviewScorecard', () => {
  it('renders Out and In ranges for an 18-hole course', () => {
    const holes = Array.from({ length: 18 }, (_, i) => makeHole({ hole_number: i + 1 }));
    render(<RoundOverviewScorecard holes={holes} courseHandicap={null} />);

    expect(screen.getByTestId('overview-range-Out')).toBeTruthy();
    expect(screen.getByTestId('overview-range-In')).toBeTruthy();
  });

  it('shows net par equal to par when there is no course handicap yet', () => {
    const holes = [makeHole({ hole_number: 1, par: 4, stroke_index: 1 })];
    render(<RoundOverviewScorecard holes={holes} courseHandicap={null} />);

    expect(screen.getByTestId('overview-net-par-1').props.children).toBe(4);
  });

  it('adds the given strokes to par based on course handicap and stroke index', () => {
    // CHC 13: holes with stroke_index <= 13 get 1 stroke.
    const holes = [
      makeHole({ hole_number: 1, par: 4, stroke_index: 13 }),
      makeHole({ hole_number: 2, par: 4, stroke_index: 14 }),
    ];
    render(<RoundOverviewScorecard holes={holes} courseHandicap={13} />);

    expect(screen.getByTestId('overview-net-par-1').props.children).toBe(5);
    expect(screen.getByTestId('overview-net-par-2').props.children).toBe(4);
  });
});
