jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
  Stack: { Screen: () => null },
}));
jest.mock('@/lib/hooks/useRoutines', () => ({ useRoutine: jest.fn() }));
jest.mock('@/lib/hooks/useTrainingSession', () => ({ saveTrainingSession: jest.fn() }));

import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRoutine } from '@/lib/hooks/useRoutines';
import { saveTrainingSession } from '@/lib/hooks/useTrainingSession';
import NewSessionScreen from '../new';

describe('NewSessionScreen', () => {
  const push = jest.fn();
  const back = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push, back });
    (useLocalSearchParams as jest.Mock).mockReturnValue({ routineId: 'routine-1' });
    (useRoutine as jest.Mock).mockReturnValue({
      routine: { id: 'routine-1', name: '3-6-9 Ladder', description: 'Build distance control.', category: 'putts' },
      drills: [
        { id: 'd1', name: '3ft putts', target_value: 10, photo_url: null },
        { id: 'd2', name: '6ft putts', target_value: 8, photo_url: null },
      ],
      loading: false,
      error: null,
    });
  });

  it('shows the routine name, description, and each drill with its target', () => {
    render(<NewSessionScreen />);
    expect(screen.getByText('3-6-9 Ladder')).toBeTruthy();
    expect(screen.getByText('Build distance control.')).toBeTruthy();
    expect(screen.getByText('3ft putts')).toBeTruthy();
    expect(screen.getByText('Target 10')).toBeTruthy();
  });

  it('saves the session with parsed per-drill results and navigates back', async () => {
    (saveTrainingSession as jest.Mock).mockResolvedValue('session-1');

    render(<NewSessionScreen />);
    fireEvent.changeText(screen.getByTestId('session-drill-d1-value'), '8');
    fireEvent.changeText(screen.getByTestId('session-drill-d2-value'), '6');
    fireEvent.changeText(screen.getByTestId('session-note-input'), 'Good session');
    fireEvent.press(screen.getByTestId('save-session-button'));

    await waitFor(() => expect(back).toHaveBeenCalled());
    expect(saveTrainingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        routineId: 'routine-1',
        note: 'Good session',
        results: [
          { drillId: 'd1', value: 8 },
          { drillId: 'd2', value: 6 },
        ],
      })
    );
  });

  it('saves a null result for a drill left blank', async () => {
    (saveTrainingSession as jest.Mock).mockResolvedValue('session-1');

    render(<NewSessionScreen />);
    fireEvent.changeText(screen.getByTestId('session-drill-d1-value'), '8');
    fireEvent.press(screen.getByTestId('save-session-button'));

    await waitFor(() => expect(back).toHaveBeenCalled());
    expect(saveTrainingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        results: [
          { drillId: 'd1', value: 8 },
          { drillId: 'd2', value: null },
        ],
      })
    );
  });
});
