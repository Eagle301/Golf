import { render, screen, fireEvent } from '@testing-library/react-native';
import { Scorecard, type ScorecardHole, type ScorecardRoundSummary } from '../Scorecard';

function makeHole(overrides: Partial<ScorecardHole> & { hole_number: number }): ScorecardHole {
  return {
    par: 4,
    stroke_index: overrides.hole_number,
    score: null,
    putts: null,
    fairway_hit: null,
    gir: null,
    penalties: null,
    ...overrides,
  };
}

function makeRoundSummary(overrides: Partial<ScorecardRoundSummary> = {}): ScorecardRoundSummary {
  return {
    courseHandicap: 12,
    handicapIndex: 14.3,
    scoreDifferential: 15.7,
    courseRating: 70,
    slopeRating: 113,
    totalPar: 71,
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

  it('sums penalties across all holes', () => {
    const holes = [
      makeHole({ hole_number: 1, penalties: 1, score: 5, putts: 2 }),
      makeHole({ hole_number: 2, penalties: 2, score: 6, putts: 3 }),
    ];
    render(<Scorecard holes={holes} courseHandicap={null} />);

    expect(screen.getByTestId('scorecard-penalties-stat').props.children).toBe(3);
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

  it('shows each hole\'s points as a superscript badge next to its score', () => {
    const holes = [
      // stroke_index 1, CHC 1 -> gets a stroke. score 4, par 4 -> net 3 -> net birdie -> 3 points.
      makeHole({ hole_number: 1, stroke_index: 1, par: 4, score: 4, putts: 2 }),
      // stroke_index 2, CHC 1 -> no stroke. score 5, par 4 -> net 5 -> net bogey -> 1 point.
      makeHole({ hole_number: 2, stroke_index: 2, par: 4, score: 5, putts: 2 }),
    ];
    render(<Scorecard holes={holes} courseHandicap={1} />);

    expect(screen.getByTestId('scorecard-points-1').props.children).toBe('³');
    expect(screen.getByTestId('scorecard-points-2').props.children).toBe('¹');
  });

  it('does not show a points badge without a course handicap', () => {
    const holes = [makeHole({ hole_number: 1, score: 4, putts: 2 })];
    render(<Scorecard holes={holes} courseHandicap={null} />);

    expect(screen.queryByTestId('scorecard-points-1')).toBeNull();
  });

  it('totals points across all holes once every hole is scored', () => {
    const holes = [
      makeHole({ hole_number: 1, stroke_index: 1, par: 4, score: 4, putts: 2 }), // net 3 -> 3 pts
      makeHole({ hole_number: 2, stroke_index: 2, par: 4, score: 4, putts: 2 }), // net 4 -> 2 pts
    ];
    render(<Scorecard holes={holes} courseHandicap={1} />);

    expect(screen.getByTestId('scorecard-total-points').props.children).toBe(5);
  });

  it('orders the bottom stats as Putts, Penalties, Fairway hits, Green hits', () => {
    const holes = [makeHole({ hole_number: 1, score: 4, putts: 2, penalties: 0 })];
    render(<Scorecard holes={holes} courseHandicap={null} />);

    const labels = screen.getAllByText(/^(Putts|Penalties|Fairway hits|Green hits)$/).map((n) => n.props.children);
    expect(labels).toEqual(['Putts', 'Penalties', 'Fairway hits', 'Green hits']);
  });

  it('does not show the round summary section without roundSummary', () => {
    const holes = [makeHole({ hole_number: 1, score: 4, putts: 2 })];
    render(<Scorecard holes={holes} courseHandicap={null} />);

    expect(screen.queryByTestId('scorecard-course-handicap-stat')).toBeNull();
    expect(screen.queryByTestId('scorecard-brutto-stat')).toBeNull();
  });

  describe('round summary section (Brutto score, Handicap Index, Course Handicap, Score Differential)', () => {
    it('orders the summary rows as Brutto score, Handicap Index, Course Handicap, Score Differential', () => {
      const holes = [makeHole({ hole_number: 1, score: 4, putts: 2 })];
      render(<Scorecard holes={holes} courseHandicap={12} roundSummary={makeRoundSummary()} />);

      const labels = screen
        .getAllByText(/^(Brutto score|Handicap Index|Course Handicap|Score Differential)$/)
        .map((n) => n.props.children);
      expect(labels).toEqual(['Brutto score', 'Handicap Index', 'Course Handicap', 'Score Differential']);
    });

    it('shows Course Handicap, Handicap Index, and Score Differential values', () => {
      const holes = [makeHole({ hole_number: 1, score: 4, putts: 2 })];
      render(<Scorecard holes={holes} courseHandicap={12} roundSummary={makeRoundSummary()} />);

      expect(screen.getByTestId('scorecard-course-handicap-stat').props.children).toBe(12);
      expect(screen.getByTestId('scorecard-handicap-index-stat').props.children).toBe('14.3');
      expect(screen.getByTestId('scorecard-score-differential-stat').props.children).toBe('15.7');
    });

    it('shows the brutto (net-double-bogey-capped) score as a single number for an 18-hole round', () => {
      // CHC 13: hole 1 (index 1) gets a stroke -> net par 5, cap 7; score 9 gets capped to 7.
      // hole 2 (index 14) gets no stroke -> net par 4, cap 6; score 5 stays as-is.
      const holes = [
        makeHole({ hole_number: 1, stroke_index: 1, par: 4, score: 9, putts: 3 }),
        makeHole({ hole_number: 2, stroke_index: 14, par: 4, score: 5, putts: 2 }),
      ];
      render(<Scorecard holes={holes} courseHandicap={13} roundSummary={makeRoundSummary()} />);

      expect(screen.getByTestId('scorecard-brutto-stat').props.children).toBe(12);
    });

    it('shows a placeholder for the brutto score until every hole is scored', () => {
      const holes = [makeHole({ hole_number: 1, score: null, putts: null })];
      render(<Scorecard holes={holes} courseHandicap={null} roundSummary={makeRoundSummary()} />);

      expect(screen.getByTestId('scorecard-brutto-stat').props.children).toBe('-');
    });

    it('for a 9-hole round, shows the brutto score as (brutto)/(brutto corrected for 18 holes)', () => {
      // 9 holes, no course handicap -> netParForNine falls back to plain par.
      // par 4 x9 = 36 par total; scores 5 each -> under cap (6) -> brutto = 45.
      // corrected for 18 = brutto (45) + par (36) = 81.
      const holes = Array.from({ length: 9 }, (_, i) => makeHole({ hole_number: i + 1, par: 4, score: 5, putts: 2 }));
      render(<Scorecard holes={holes} courseHandicap={null} roundSummary={makeRoundSummary()} />);

      expect(screen.getByTestId('scorecard-brutto-stat').props.children).toBe('45 / 81');
    });

    it('for a 9-hole round, corrects for 18 using par + half the course handicap (rounded down) plus one', () => {
      // Real Husafell round (courseHandicap 22, verified against GSÍ official
      // export): netParForNine = 36 + floor(22/2) + 1 = 36 + 11 + 1 = 48.
      // Per-hole stroke-index net-par capping still yields brutto = 51.
      const holes = [
        makeHole({ hole_number: 1, stroke_index: 9, par: 4, score: 5, putts: 2 }),
        makeHole({ hole_number: 2, stroke_index: 8, par: 5, score: 8, putts: 2 }),
        makeHole({ hole_number: 3, stroke_index: 4, par: 4, score: 5, putts: 3 }),
        makeHole({ hole_number: 4, stroke_index: 7, par: 4, score: 3, putts: 1 }),
        makeHole({ hole_number: 5, stroke_index: 6, par: 4, score: 7, putts: 2 }),
        makeHole({ hole_number: 6, stroke_index: 3, par: 5, score: 7, putts: 2 }),
        makeHole({ hole_number: 7, stroke_index: 1, par: 3, score: 4, putts: 2 }),
        makeHole({ hole_number: 8, stroke_index: 2, par: 4, score: 9, putts: 3 }),
        makeHole({ hole_number: 9, stroke_index: 5, par: 3, score: 4, putts: 1 }),
      ];
      render(<Scorecard holes={holes} courseHandicap={22} roundSummary={makeRoundSummary()} />);

      expect(screen.getByTestId('scorecard-brutto-stat').props.children).toBe('51 / 99');
    });

    it('hides the formula breakdown until the summary is tapped, then shows it', () => {
      const holes = [makeHole({ hole_number: 1, score: 4, putts: 2 })];
      render(<Scorecard holes={holes} courseHandicap={12} roundSummary={makeRoundSummary()} />);

      expect(screen.queryByTestId('scorecard-course-handicap-detail')).toBeNull();
      expect(screen.queryByTestId('scorecard-score-differential-detail')).toBeNull();

      fireEvent.press(screen.getByTestId('scorecard-summary-toggle'));

      expect(screen.getByTestId('scorecard-course-handicap-detail')).toBeTruthy();
      expect(screen.getByTestId('scorecard-score-differential-detail')).toBeTruthy();

      fireEvent.press(screen.getByTestId('scorecard-summary-toggle'));

      expect(screen.queryByTestId('scorecard-course-handicap-detail')).toBeNull();
    });
  });
});
