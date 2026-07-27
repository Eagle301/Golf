jest.mock('@/lib/hooks/useActiveRound', () => ({ useActiveRound: jest.fn() }));
jest.mock('@/lib/hooks/useRoundSync', () => ({ syncPendingRounds: jest.fn() }));
jest.mock('@/lib/offline/pendingRounds', () => ({ addPendingRound: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useFocusEffect: (effect: () => void) => effect(),
  Stack: { Screen: () => null },
}));

import { render, fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { useActiveRound } from '@/lib/hooks/useActiveRound';
import type { ActiveRound } from '@/lib/offline/types';
import LiveRoundScreen from '../[id]';

function makeActiveRound(overrides: Partial<ActiveRound>): ActiveRound {
  return {
    localId: 'local-1',
    course_id: 'course-1',
    course_name: 'Test Course',
    hole_count: 9,
    course_rating: 70,
    slope_rating: 113,
    total_par: 8,
    total_length_meters: 700,
    handicap_at_start: 10,
    date_played: '2026-07-25',
    notes: '',
    currentHoleIndex: 0,
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
    ...overrides,
  };
}

describe('LiveRoundScreen review panel', () => {
  const updateActiveRound = jest.fn();
  const discardActiveRound = jest.fn();
  const refetch = jest.fn();
  const push = jest.fn();
  const replace = jest.fn();
  const back = jest.fn();

  beforeEach(() => {
    updateActiveRound.mockClear();
    discardActiveRound.mockClear();
    refetch.mockClear();
    push.mockClear();
    replace.mockClear();
    back.mockClear();
    (useRouter as jest.Mock).mockReturnValue({ push, replace, back });
  });

  it('shows the review panel (not the finish panel) right after the last hole', () => {
    (useActiveRound as jest.Mock).mockReturnValue({
      activeRound: makeActiveRound({ currentHoleIndex: 9 }), // === hole_count
      loading: false,
      updateActiveRound,
      discardActiveRound,
      refetch,
    });

    render(<LiveRoundScreen />);

    expect(screen.getByTestId('review-panel')).toBeTruthy();
    expect(screen.queryByTestId('finish-panel')).toBeNull();
  });

  it('tapping a hole number in the review panel jumps back to that hole', () => {
    (useActiveRound as jest.Mock).mockReturnValue({
      activeRound: makeActiveRound({ currentHoleIndex: 9 }),
      loading: false,
      updateActiveRound,
      discardActiveRound,
      refetch,
    });

    render(<LiveRoundScreen />);
    fireEvent.press(screen.getByTestId('scorecard-hole-1'));

    expect(updateActiveRound).toHaveBeenCalledWith(expect.objectContaining({ currentHoleIndex: 0 }));
  });

  it('"Continue" from the review panel advances to the finish panel', () => {
    (useActiveRound as jest.Mock).mockReturnValue({
      activeRound: makeActiveRound({ currentHoleIndex: 9 }),
      loading: false,
      updateActiveRound,
      discardActiveRound,
      refetch,
    });

    render(<LiveRoundScreen />);
    fireEvent.press(screen.getByTestId('continue-to-finish-button'));

    expect(updateActiveRound).toHaveBeenCalledWith(expect.objectContaining({ currentHoleIndex: 10 }));
  });

  it('shows the finish panel once past the review step', () => {
    (useActiveRound as jest.Mock).mockReturnValue({
      activeRound: makeActiveRound({ currentHoleIndex: 10 }), // hole_count + 1
      loading: false,
      updateActiveRound,
      discardActiveRound,
      refetch,
    });

    render(<LiveRoundScreen />);

    expect(screen.getByTestId('finish-panel')).toBeTruthy();
  });

  it('tapping a hole number on the live mid-round scorecard is clickable on the review panel only when onSelectHole is wired', () => {
    (useActiveRound as jest.Mock).mockReturnValue({
      activeRound: makeActiveRound({ currentHoleIndex: 9 }),
      loading: false,
      updateActiveRound,
      discardActiveRound,
      refetch,
    });

    render(<LiveRoundScreen />);
    expect(screen.getByTestId('scorecard-hole-2')).toBeTruthy();
  });

  // CHC = HC*(slope/113) + (CR/2 - totalPar) = 1*1 + (8-8) = 1, since hole_count is 9.
  const CHC_ONE_OVERRIDES = { handicap_at_start: 1, course_rating: 16, slope_rating: 113, total_par: 8 };

  it('re-syncs from storage on focus, so a hole jump made from another screen (e.g. Scorecard) is picked up', () => {
    (useActiveRound as jest.Mock).mockReturnValue({
      activeRound: makeActiveRound({ currentHoleIndex: 0 }),
      loading: false,
      updateActiveRound,
      discardActiveRound,
      refetch,
    });

    render(<LiveRoundScreen />);

    expect(refetch).toHaveBeenCalled();
  });

  it('shows the live Net Par total on the overview panel', () => {
    (useActiveRound as jest.Mock).mockReturnValue({
      // CHC=1: hole 1 (stroke_index 1) gets a stroke -> net par 5; hole 2 (index 2) doesn't -> net par 4.
      activeRound: makeActiveRound({ currentHoleIndex: -1, ...CHC_ONE_OVERRIDES }),
      loading: false,
      updateActiveRound,
      discardActiveRound,
      refetch,
    });

    render(<LiveRoundScreen />);

    expect(screen.getByTestId('overview-total-net-par').props.children).toBe(9);
  });

  it('shows the hole length in the header', () => {
    (useActiveRound as jest.Mock).mockReturnValue({
      activeRound: makeActiveRound({ currentHoleIndex: 0 }), // fixture hole 1 has length_meters: 350
      loading: false,
      updateActiveRound,
      discardActiveRound,
      refetch,
    });

    render(<LiveRoundScreen />);

    expect(screen.getByTestId('hole-length').props.children.join('')).toBe(' · 350m');
  });

  it('shows a live points badge on the selected score once a hole has a score', () => {
    const activeRound = makeActiveRound({ currentHoleIndex: 0, ...CHC_ONE_OVERRIDES });
    activeRound.holeLogs[0] = { ...activeRound.holeLogs[0], score: 4, putts: 2 }; // par 4, stroke_index 1

    (useActiveRound as jest.Mock).mockReturnValue({
      activeRound,
      loading: false,
      updateActiveRound,
      discardActiveRound,
      refetch,
    });

    render(<LiveRoundScreen />);

    // CHC=1 gives hole 1 a stroke -> net score 4-1=3, par 4 -> net birdie -> 3 points.
    expect(screen.getByTestId('hole-points-badge').props.children).toBe('³');
  });
});

describe('LiveRoundScreen submission validation', () => {
  const updateActiveRound = jest.fn();
  const discardActiveRound = jest.fn();
  const refetch = jest.fn();
  const replace = jest.fn();

  beforeEach(() => {
    updateActiveRound.mockClear();
    discardActiveRound.mockClear();
    refetch.mockClear();
    replace.mockClear();
    (useRouter as jest.Mock).mockReturnValue({ push: jest.fn(), replace, back: jest.fn() });
  });

  it('flags incomplete holes and disables Finish Round when a hole is missing its score', () => {
    (useActiveRound as jest.Mock).mockReturnValue({
      activeRound: makeActiveRound({
        currentHoleIndex: 10, // hole_count + 1 -> finish panel
        holeLogs: [
          {
            hole_number: 1,
            par: 4,
            length_meters: 350,
            stroke_index: 1,
            hole_id: 'h1',
            score: null,
            putts: null,
            fairway_hit: null,
            gir: null,
            gir_overridden: false,
            penalties: 0,
            chip_shots: 0,
          },
        ],
      }),
      loading: false,
      updateActiveRound,
      discardActiveRound,
      refetch,
    });

    render(<LiveRoundScreen />);

    expect(screen.getByTestId('incomplete-holes-warning')).toBeTruthy();
    expect(screen.getByTestId('finish-round-button').props.accessibilityState.disabled).toBe(true);
  });

  it('does not submit the round when Finish Round is pressed with incomplete holes', async () => {
    const { addPendingRound } = require('@/lib/offline/pendingRounds');
    (useActiveRound as jest.Mock).mockReturnValue({
      activeRound: makeActiveRound({
        currentHoleIndex: 10,
        holeLogs: [
          {
            hole_number: 1,
            par: 4,
            length_meters: 350,
            stroke_index: 1,
            hole_id: 'h1',
            score: null,
            putts: null,
            fairway_hit: null,
            gir: null,
            gir_overridden: false,
            penalties: 0,
            chip_shots: 0,
          },
        ],
      }),
      loading: false,
      updateActiveRound,
      discardActiveRound,
      refetch,
    });

    render(<LiveRoundScreen />);
    fireEvent.press(screen.getByTestId('finish-round-button'));

    expect(addPendingRound).not.toHaveBeenCalled();
    expect(discardActiveRound).not.toHaveBeenCalled();
  });

  it('submits successfully once every hole is complete', async () => {
    const { addPendingRound } = require('@/lib/offline/pendingRounds');
    (useActiveRound as jest.Mock).mockReturnValue({
      activeRound: makeActiveRound({ currentHoleIndex: 10 }), // default fixture holes are fully scored
      loading: false,
      updateActiveRound,
      discardActiveRound,
      refetch,
    });

    render(<LiveRoundScreen />);
    expect(screen.getByTestId('finish-round-button').props.accessibilityState.disabled).toBe(false);

    fireEvent.press(screen.getByTestId('finish-round-button'));
    await screen.findByTestId('finish-round-button');

    expect(addPendingRound).toHaveBeenCalled();
  });
});
