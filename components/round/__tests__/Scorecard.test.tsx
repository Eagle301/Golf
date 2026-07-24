import { render, screen } from '@testing-library/react-native';
import { Scorecard, type ScorecardHole } from '../Scorecard';

function makeHole(overrides: Partial<ScorecardHole> & { hole_number: number }): ScorecardHole {
  return {
    par: 4,
    stroke_index: overrides.hole_number,
    score: null,
    putts: null,
    fairway_hit: null,
    gir: null,
    ...overrides,
  };
}

describe('Scorecard', () => {
  it('renders Out and In ranges for an 18-hole round', () => {
    const holes = Array.from({ length: 18 }, (_, i) => makeHole({ hole_number: i + 1, score: 4, putts: 2 }));
    render(<Scorecard holes={holes} courseHandicap={null} />);

    expect(screen.getByTestId('scorecard-range-Out')).toBeTruthy();
    expect(screen.getByTestId('scorecard-range-In')).toBeTruthy();
  });

  it('applies strokes to the net score based on course handicap and stroke index', () => {
    // CHC 13: holes with stroke_index <= 13 get 1 stroke.
    const holes = [
      makeHole({ hole_number: 1, stroke_index: 13, par: 4, score: 5, putts: 2 }),
      makeHole({ hole_number: 2, stroke_index: 14, par: 4, score: 5, putts: 2 }),
    ];
    render(<Scorecard holes={holes} courseHandicap={13} />);

    // Hole 1 (index 13, within CHC): net = 5 - 1 = 4
    expect(screen.getByTestId('scorecard-net-1').props.children).toBe(4);
    // Hole 2 (index 14, beyond CHC): net = 5 - 0 = 5
    expect(screen.getByTestId('scorecard-net-2').props.children).toBe(5);
  });

  it('computes fairway hit/miss-left-right/miss-short-long counts, excluding par 3s', () => {
    const holes = [
      makeHole({ hole_number: 1, par: 4, fairway_hit: 'yes', score: 4, putts: 2 }),
      makeHole({ hole_number: 2, par: 5, fairway_hit: 'missed_left', score: 5, putts: 2 }),
      makeHole({ hole_number: 3, par: 4, fairway_hit: 'missed_short', score: 4, putts: 2 }),
      makeHole({ hole_number: 4, par: 3, fairway_hit: 'yes', score: 3, putts: 2 }), // excluded (par 3)
    ];
    render(<Scorecard holes={holes} courseHandicap={null} />);

    expect(screen.getByTestId('scorecard-fairway-stat').props.children.join('')).toBe('1/1/1');
  });

  it('computes the GIR ratio as hit-count over total holes', () => {
    const holes = [
      makeHole({ hole_number: 1, gir: true, score: 4, putts: 2 }),
      makeHole({ hole_number: 2, gir: false, score: 5, putts: 2 }),
      makeHole({ hole_number: 3, gir: true, score: 4, putts: 2 }),
    ];
    render(<Scorecard holes={holes} courseHandicap={null} />);

    expect(screen.getByTestId('scorecard-gir-stat').props.children.join('')).toBe('2/3');
  });

  it('shows the gross/net total score when courseHandicap is provided', () => {
    const holes = [
      makeHole({ hole_number: 1, stroke_index: 1, par: 4, score: 5, putts: 2 }),
      makeHole({ hole_number: 2, stroke_index: 2, par: 4, score: 5, putts: 2 }),
    ];
    render(<Scorecard holes={holes} courseHandicap={2} />);

    // Gross = 10. Both holes get 1 stroke (CHC=2, both indexes <=2), net = 10 - 2 = 8.
    expect(screen.getByTestId('scorecard-total-score').props.children.join('')).toBe('10 / 8');
  });
});
