jest.mock('@/lib/hooks/useRoutines', () => ({ useRoutines: jest.fn() }));
jest.mock('@/lib/hooks/useTrainingSessions', () => ({ useTrainingSessions: jest.fn() }));
jest.mock('expo-router', () => ({
  useRouter: jest.fn(),
  useFocusEffect: (effect: () => void) => effect(),
}));

import { render, fireEvent, screen } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import { useRoutines } from '@/lib/hooks/useRoutines';
import { useTrainingSessions } from '@/lib/hooks/useTrainingSessions';
import TrainingScreen from '../training';

describe('TrainingScreen', () => {
  const push = jest.fn();
  const refetchRoutines = jest.fn();
  const refetchSessions = jest.fn();

  const routines = [
    { id: 'r1', name: '3-6-9 Ladder', description: 'Ladder desc', category: 'putts' },
    { id: 'r2', name: 'Fairway Finder', description: 'Full swing desc', category: 'full_swing' },
  ];
  const sessions = [
    { id: 's1', date_played: '2026-01-01', note: null, training_routines: { name: '3-6-9 Ladder', category: 'putts' } },
    { id: 's2', date_played: '2026-01-02', note: null, training_routines: { name: 'Fairway Finder', category: 'full_swing' } },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push });
    (useRoutines as jest.Mock).mockReturnValue({
      routines,
      loading: false,
      error: null,
      refetch: refetchRoutines,
    });
    (useTrainingSessions as jest.Mock).mockReturnValue({
      sessions,
      loading: false,
      error: null,
      refetch: refetchSessions,
    });
  });

  it('shows loading indicators while loading', () => {
    (useRoutines as jest.Mock).mockReturnValue({ routines: [], loading: true, error: null, refetch: refetchRoutines });
    (useTrainingSessions as jest.Mock).mockReturnValue({
      sessions: [],
      loading: true,
      error: null,
      refetch: refetchSessions,
    });
    render(<TrainingScreen />);
    expect(screen.getByTestId('routines-loading')).toBeTruthy();
    expect(screen.getByTestId('sessions-history-loading')).toBeTruthy();
  });

  it('shows the four fixed category cards with their routine counts', () => {
    render(<TrainingScreen />);
    expect(screen.getByText('Putts')).toBeTruthy();
    expect(screen.getByText('Short Game')).toBeTruthy();
    expect(screen.getByText('Full Swing')).toBeTruthy();
    expect(screen.getByText('Strategy')).toBeTruthy();
    expect(screen.getByTestId('category-card-putts')).toBeTruthy();
  });

  it('expands a category card on tap to reveal its routines, and collapses on a second tap', () => {
    render(<TrainingScreen />);

    expect(screen.queryByTestId('routine-card-r1')).toBeNull();

    fireEvent.press(screen.getByTestId('category-card-putts'));
    expect(screen.getByTestId('routine-card-r1')).toBeTruthy();
    expect(screen.queryByTestId('routine-card-r2')).toBeNull();

    fireEvent.press(screen.getByTestId('category-card-putts'));
    expect(screen.queryByTestId('routine-card-r1')).toBeNull();
  });

  it('shows an empty state inside an expanded category with no routines', () => {
    render(<TrainingScreen />);
    fireEvent.press(screen.getByTestId('category-card-short_game'));
    expect(screen.getByText('No routines yet.')).toBeTruthy();
  });

  it('starts a session against a routine on tap without re-collapsing the card', () => {
    render(<TrainingScreen />);
    fireEvent.press(screen.getByTestId('category-card-putts'));
    fireEvent.press(screen.getByTestId('start-session-r1'));
    expect(push).toHaveBeenCalledWith({ pathname: '/session/new', params: { routineId: 'r1' } });
  });

  it('opens the routine editor from the edit icon', () => {
    render(<TrainingScreen />);
    fireEvent.press(screen.getByTestId('category-card-putts'));
    fireEvent.press(screen.getByTestId('edit-routine-r1'));
    expect(push).toHaveBeenCalledWith('/routine/r1');
  });

  it('opens a blank routine editor from the add button', () => {
    render(<TrainingScreen />);
    fireEvent.press(screen.getByTestId('add-routine-button'));
    expect(push).toHaveBeenCalledWith('/routine/new');
  });

  it('lists all session history regardless of category and navigates to a session detail on tap', () => {
    render(<TrainingScreen />);
    expect(screen.getByTestId('session-history-s1')).toBeTruthy();
    expect(screen.getByTestId('session-history-s2')).toBeTruthy();

    fireEvent.press(screen.getByTestId('session-history-s1'));
    expect(push).toHaveBeenCalledWith('/session/s1');
  });

  it('shows an empty state when there is no training history', () => {
    (useTrainingSessions as jest.Mock).mockReturnValue({
      sessions: [],
      loading: false,
      error: null,
      refetch: refetchSessions,
    });
    render(<TrainingScreen />);
    expect(screen.getByText('No training logged yet.')).toBeTruthy();
  });
});
