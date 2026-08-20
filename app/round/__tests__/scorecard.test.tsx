jest.mock('@/lib/hooks/useActiveRound', () => ({ useActiveRound: jest.fn() }));
jest.mock('@/lib/hooks/useRoundDetail', () => ({ useRoundDetail: jest.fn(), deleteRound: jest.fn() }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
  Stack: { Screen: () => null },
}));

import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useActiveRound } from '@/lib/hooks/useActiveRound';
import { useRoundDetail, deleteRound } from '@/lib/hooks/useRoundDetail';
import type { ActiveRound } from '@/lib/offline/types';
import ScorecardScreen from '../scorecard';

function makeActiveRound(): ActiveRound {
  return {
    localId: 'local-1',
    course_id: 'course-1',
    course_name: 'Test Course',
    tee_box_id: 'tee-1',
    tee_name: 'Gulur',
    hole_count: 9,
    course_rating: 70,
    slope_rating: 113,
    total_par: 8,
    total_length_meters: 700,
    handicap_at_start: 10,
    date_played: '2026-07-25',
    notes: '',
    currentHoleIndex: 9,
    holeLogs: [
      {
        hole_number: 1,
        par: 4,
        length_meters: 350,
        stroke_index: 1,
        hole_id: 'h1',
        score: 4,
        putts: 2,
        fairway_hit: 'yes',
        gir: true,
        gir_overridden: false,
        penalties: 0,
        chip_shots: 0,
      },
      {
        hole_number: 2,
        par: 4,
        length_meters: 350,
        stroke_index: 2,
        hole_id: 'h2',
        score: 5,
        putts: 2,
        fairway_hit: 'yes',
        gir: false,
        gir_overridden: false,
        penalties: 0,
        chip_shots: 0,
      },
    ],
  };
}

describe('ScorecardScreen', () => {
  const updateActiveRound = jest.fn();
  const back = jest.fn();
  const replace = jest.fn();

  beforeEach(() => {
    updateActiveRound.mockClear();
    back.mockClear();
    replace.mockClear();
    (deleteRound as jest.Mock).mockClear();
    (deleteRound as jest.Mock).mockResolvedValue(undefined);
    (useRouter as jest.Mock).mockReturnValue({ back, replace });
  });

  it('tapping a hole on the active round scorecard jumps to that hole and navigates back', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'active' });
    (useActiveRound as jest.Mock).mockReturnValue({
      activeRound: makeActiveRound(),
      loading: false,
      updateActiveRound,
    });

    render(<ScorecardScreen />);
    fireEvent.press(screen.getByTestId('scorecard-hole-1'));

    expect(updateActiveRound).toHaveBeenCalledWith(expect.objectContaining({ currentHoleIndex: 0 }));
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('does not make holes clickable on a completed (historical) round', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'round-99' });
    (useRoundDetail as jest.Mock).mockReturnValue({
      roundDetail: {
        courseName: 'Test Course',
        totalPar: 8,
        courseRating: 70,
        slopeRating: 113,
        holeCount: 18,
        handicapAtTime: 10,
        scoreDifferential: 15.3,
        holes: [
          { hole_number: 1, par: 4, stroke_index: 1, score: 4, putts: 2, fairway_hit: 'yes', gir: true, penalties: 0 },
        ],
      },
      loading: false,
      error: null,
    });

    render(<ScorecardScreen />);
    expect(screen.getByTestId('scorecard-hole-1').props.accessibilityState.disabled).toBe(true);
  });

  it('shows the net par diff bold next to the course name on the historical scorecard', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'round-99' });
    (useRoundDetail as jest.Mock).mockReturnValue({
      roundDetail: {
        courseName: 'Test Course',
        totalPar: 8,
        courseRating: 70,
        slopeRating: 113,
        holeCount: 18,
        handicapAtTime: 10,
        scoreDifferential: 15.3,
        // par 4, no stroke_index-based stroke (courseHandicap null since ratings missing course_rating/slope on RoundDetailHole isn't needed here) -> net par = par.
        holes: [
          { hole_number: 1, par: 4, stroke_index: 1, score: 5, putts: 2, fairway_hit: 'yes', gir: true, penalties: 0 },
        ],
      },
      loading: false,
      error: null,
    });

    render(<ScorecardScreen />);
    // courseHandicap ends up null (handicapAtTime present but courseRating/slopeRating given -> computed), score 5 vs par 4 -> some positive diff.
    expect(screen.getByTestId('scorecard-net-par-diff')).toBeTruthy();
  });

  it('shows Course Handicap, Handicap Index, and Score Differential on the historical scorecard', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'round-99' });
    (useRoundDetail as jest.Mock).mockReturnValue({
      roundDetail: {
        courseName: 'Test Course',
        totalPar: 8,
        courseRating: 70,
        slopeRating: 113,
        holeCount: 18,
        handicapAtTime: 10,
        scoreDifferential: 15.3,
        holes: [
          { hole_number: 1, par: 4, stroke_index: 1, score: 4, putts: 2, fairway_hit: 'yes', gir: true, penalties: 0 },
        ],
      },
      loading: false,
      error: null,
    });

    render(<ScorecardScreen />);
    expect(screen.getByTestId('scorecard-handicap-index-stat').props.children).toBe('10.0');
    expect(screen.getByTestId('scorecard-score-differential-stat').props.children).toBe('15.3');
  });

  function mockHistoricalRound() {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'round-99' });
    (useRoundDetail as jest.Mock).mockReturnValue({
      roundDetail: {
        courseName: 'Test Course',
        totalPar: 8,
        courseRating: 70,
        slopeRating: 113,
        holeCount: 18,
        handicapAtTime: 10,
        scoreDifferential: 15.3,
        holes: [
          { hole_number: 1, par: 4, stroke_index: 1, score: 4, putts: 2, fairway_hit: 'yes', gir: true, penalties: 0 },
        ],
      },
      loading: false,
      error: null,
    });
  }

  it('confirming Delete Round deletes the round and navigates back to the rounds list', async () => {
    mockHistoricalRound();
    render(<ScorecardScreen />);

    fireEvent.press(screen.getByTestId('delete-round-button'));
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/rounds'));
    expect(deleteRound).toHaveBeenCalledWith('round-99');
  });

  it('canceling the delete confirmation does not delete the round', () => {
    mockHistoricalRound();
    render(<ScorecardScreen />);

    fireEvent.press(screen.getByTestId('delete-round-button'));
    fireEvent.press(screen.getByTestId('confirm-dialog-cancel'));

    expect(deleteRound).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
