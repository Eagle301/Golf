jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
  Stack: { Screen: () => null },
}));
jest.mock('@/lib/hooks/useTrainingSession', () => ({
  useTrainingSession: jest.fn(),
  deleteTrainingSession: jest.fn(),
}));

import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as useTrainingSessionModule from '@/lib/hooks/useTrainingSession';
import SessionDetailScreen from '../[id]';

describe('SessionDetailScreen', () => {
  const replace = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ replace });
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'session-1' });
  });

  it('shows a loading indicator while loading', () => {
    (useTrainingSessionModule.useTrainingSession as jest.Mock).mockReturnValue({
      session: null,
      loading: true,
      error: null,
    });
    render(<SessionDetailScreen />);
    expect(screen.getByTestId('session-detail-loading')).toBeTruthy();
  });

  it('shows the routine, date, drill results, and note', () => {
    (useTrainingSessionModule.useTrainingSession as jest.Mock).mockReturnValue({
      session: {
        routineName: '3-6-9 Ladder',
        datePlayed: '2026-01-01',
        note: 'Felt solid today',
        drills: [
          { drill_id: 'd1', name: '3ft putts', target_value: 10, photo_url: null, value: 8 },
          { drill_id: 'd2', name: '6ft putts', target_value: 8, photo_url: null, value: 6 },
        ],
      },
      loading: false,
      error: null,
    });

    render(<SessionDetailScreen />);
    expect(screen.getByText('3-6-9 Ladder')).toBeTruthy();
    expect(screen.getByText('2026-01-01')).toBeTruthy();
    expect(screen.getByText('Felt solid today')).toBeTruthy();
    expect(screen.getByTestId('session-detail-drill-d1')).toBeTruthy();
  });

  it('deletes the session and navigates back to Training on confirm', async () => {
    (useTrainingSessionModule.useTrainingSession as jest.Mock).mockReturnValue({
      session: { routineName: 'Ladder', datePlayed: '2026-01-01', note: null, drills: [] },
      loading: false,
      error: null,
    });
    (useTrainingSessionModule.deleteTrainingSession as jest.Mock).mockResolvedValue(undefined);

    render(<SessionDetailScreen />);
    fireEvent.press(screen.getByTestId('delete-session-button'));
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/training'));
    expect(useTrainingSessionModule.deleteTrainingSession).toHaveBeenCalledWith('session-1');
  });
});
