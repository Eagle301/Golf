jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
  useFocusEffect: (effect: () => void) => effect(),
  Stack: { Screen: () => null },
}));
jest.mock('@/lib/hooks/useDrillProgress', () => ({ useDrillProgress: jest.fn() }));

import { render, screen } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDrillProgress } from '@/lib/hooks/useDrillProgress';
import RoutineProgressScreen from '../[routineId]';

describe('RoutineProgressScreen', () => {
  const refetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ back: jest.fn() });
    (useLocalSearchParams as jest.Mock).mockReturnValue({ routineId: 'routine-1' });
  });

  it('shows a loading indicator while progress loads', () => {
    (useDrillProgress as jest.Mock).mockReturnValue({
      routineName: null,
      drills: [],
      loading: true,
      error: null,
      refetch,
    });

    render(<RoutineProgressScreen />);
    expect(screen.getByTestId('drill-progress-loading')).toBeTruthy();
  });

  it('renders a chart per drill once loaded', () => {
    (useDrillProgress as jest.Mock).mockReturnValue({
      routineName: '3-6-9 Ladder',
      drills: [
        { drillId: 'd1', name: '3m putts', targetValue: 8, points: [{ sessionId: 's1', date: '2026-08-01', value: 5 }] },
        { drillId: 'd2', name: '6m putts', targetValue: null, points: [] },
      ],
      loading: false,
      error: null,
      refetch,
    });

    render(<RoutineProgressScreen />);

    expect(screen.getByTestId('drill-chart-d1')).toBeTruthy();
    expect(screen.getByTestId('drill-chart-d2')).toBeTruthy();
  });

  it('shows an empty state when the routine has no drills', () => {
    (useDrillProgress as jest.Mock).mockReturnValue({
      routineName: '3-6-9 Ladder',
      drills: [],
      loading: false,
      error: null,
      refetch,
    });

    render(<RoutineProgressScreen />);
    expect(screen.getByTestId('drill-progress-empty')).toBeTruthy();
  });

  it('surfaces a load error', () => {
    (useDrillProgress as jest.Mock).mockReturnValue({
      routineName: null,
      drills: [],
      loading: false,
      error: 'network down',
      refetch,
    });

    render(<RoutineProgressScreen />);
    expect(screen.getByText('network down')).toBeTruthy();
  });
});
