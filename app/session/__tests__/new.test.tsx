jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
  Stack: { Screen: () => null },
}));
jest.mock('@/lib/hooks/useRoutines', () => ({ useRoutine: jest.fn() }));
jest.mock('@/lib/hooks/useTrainingSession', () => ({ saveTrainingSession: jest.fn() }));
jest.mock('@/lib/hooks/useDrillProgress', () => ({ useDrillProgress: jest.fn() }));
jest.mock('react-native-youtube-iframe', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: (props: any) => <View testID="youtube-player" {...props} /> };
});

import { render, fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import { BackHandler } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRoutine } from '@/lib/hooks/useRoutines';
import { useDrillProgress } from '@/lib/hooks/useDrillProgress';
import { saveTrainingSession } from '@/lib/hooks/useTrainingSession';
import NewSessionScreen from '../new';

describe('NewSessionScreen', () => {
  const push = jest.fn();
  const back = jest.fn();
  const replace = jest.fn();
  let hardwareBackPress: (() => boolean) | null;

  beforeEach(() => {
    jest.clearAllMocks();
    hardwareBackPress = null;
    jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, handler) => {
      hardwareBackPress = handler as () => boolean;
      return { remove: jest.fn() } as any;
    });
    (useRouter as jest.Mock).mockReturnValue({ push, back, replace, canGoBack: () => true });
    (useLocalSearchParams as jest.Mock).mockReturnValue({ routineId: 'routine-1' });
    (useRoutine as jest.Mock).mockReturnValue({
      routine: { id: 'routine-1', name: '3-6-9 Ladder', description: 'Build distance control.', category: 'putts' },
      drills: [
        {
          id: 'd1',
          name: '3ft putts',
          target_value: 10,
          photo_url: null,
          video_url: 'https://youtu.be/dQw4w9WgXcQ?t=95',
          result_type: 'target',
        },
        { id: 'd2', name: 'Chips hit', target_value: null, photo_url: null, video_url: null, result_type: 'count' },
        { id: 'd3', name: 'Full routine', target_value: null, photo_url: null, video_url: null, result_type: 'check' },
      ],
      loading: false,
      error: null,
    });
    (useDrillProgress as jest.Mock).mockReturnValue({
      routineName: '3-6-9 Ladder',
      drills: [
        {
          drillId: 'd1',
          name: '3ft putts',
          targetValue: 10,
          points: [
            { sessionId: 's1', date: '2026-08-01', value: 4 },
            { sessionId: 's2', date: '2026-08-02', value: 9 },
            { sessionId: 's3', date: '2026-08-03', value: 6 },
          ],
        },
        { drillId: 'd2', name: 'Chips hit', targetValue: null, points: [] },
        { drillId: 'd3', name: 'Full routine', targetValue: null, points: [{ sessionId: 's3', date: '2026-08-03', value: 1 }] },
      ],
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('shows the routine name, description, and the target meter for out-of drills', () => {
    render(<NewSessionScreen />);
    expect(screen.getByText('3-6-9 Ladder')).toBeTruthy();
    expect(screen.getByText('Build distance control.')).toBeTruthy();
    expect(screen.getByText('3ft putts')).toBeTruthy();
    expect(screen.getByText('0 / 10')).toBeTruthy();
  });

  it('shows the target next to the stepper for out-of drills only', () => {
    render(<NewSessionScreen />);
    expect(screen.getByText('/ 10')).toBeTruthy();
  });

  it('shows last and best results for a drill with history', () => {
    render(<NewSessionScreen />);
    expect(screen.getByText('Last 6 · Best 9')).toBeTruthy();
  });

  it('shows a done-last-time line for checkmark drills', () => {
    render(<NewSessionScreen />);
    expect(screen.getByText('Last ✓')).toBeTruthy();
  });

  it('shows the video thumbnail for a drill with a video', () => {
    render(<NewSessionScreen />);
    expect(screen.getByTestId('session-drill-d1-video-thumbnail')).toBeTruthy();
    expect(screen.queryByTestId('session-drill-d2-video-thumbnail')).toBeNull();
  });

  it('renders a check toggle instead of a stepper for checkmark drills', () => {
    render(<NewSessionScreen />);
    expect(screen.getByTestId('session-drill-d3-check')).toBeTruthy();
    expect(screen.queryByTestId('session-drill-d3-increment')).toBeNull();
  });

  it('logs a checked drill as 1 and an unchecked one as null', async () => {
    (saveTrainingSession as jest.Mock).mockResolvedValue('session-1');

    render(<NewSessionScreen />);
    fireEvent.press(screen.getByTestId('session-drill-d3-check'));
    fireEvent.press(screen.getByTestId('save-session-button'));

    await waitFor(() => expect(back).toHaveBeenCalled());
    expect(saveTrainingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        results: [
          { drillId: 'd1', value: null },
          { drillId: 'd2', value: null },
          { drillId: 'd3', value: 1 },
        ],
      })
    );
  });

  it('unchecks a checkmark drill on a second tap', async () => {
    (saveTrainingSession as jest.Mock).mockResolvedValue('session-1');

    render(<NewSessionScreen />);
    fireEvent.press(screen.getByTestId('session-drill-d3-check'));
    fireEvent.press(screen.getByTestId('session-drill-d3-check'));
    fireEvent.press(screen.getByTestId('save-session-button'));

    await waitFor(() => expect(back).toHaveBeenCalled());
    expect(saveTrainingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        results: expect.arrayContaining([{ drillId: 'd3', value: null }]),
      })
    );
  });

  it('logs results with the stepper buttons', async () => {
    (saveTrainingSession as jest.Mock).mockResolvedValue('session-1');

    render(<NewSessionScreen />);
    fireEvent.press(screen.getByTestId('session-drill-d1-increment'));
    fireEvent.press(screen.getByTestId('session-drill-d1-increment'));
    fireEvent.press(screen.getByTestId('session-drill-d1-increment'));
    fireEvent.press(screen.getByTestId('session-drill-d1-decrement'));
    fireEvent.press(screen.getByTestId('save-session-button'));

    await waitFor(() => expect(back).toHaveBeenCalled());
    expect(saveTrainingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        results: [
          { drillId: 'd1', value: 2 },
          { drillId: 'd2', value: null },
          { drillId: 'd3', value: null },
        ],
      })
    );
  });

  it('celebrates when a typed result meets the target', () => {
    render(<NewSessionScreen />);
    fireEvent.changeText(screen.getByTestId('session-drill-d1-value'), '10');
    expect(screen.getByText('Target met')).toBeTruthy();
  });

  it('ticks the elapsed session timer', () => {
    jest.useFakeTimers();
    try {
      render(<NewSessionScreen />);
      expect(screen.getByText('0:00')).toBeTruthy();
      act(() => {
        jest.advanceTimersByTime(65_000);
      });
      expect(screen.getByText('1:05')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
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
          { drillId: 'd3', value: null },
        ],
      })
    );
  });

  it('asks before leaving once results are entered, and leaves on confirm', () => {
    render(<NewSessionScreen />);
    fireEvent.changeText(screen.getByTestId('session-drill-d1-value'), '8');

    let handled = false;
    act(() => {
      handled = hardwareBackPress!();
    });

    expect(handled).toBe(true);
    expect(screen.getByText('Discard session?')).toBeTruthy();

    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));
    expect(back).toHaveBeenCalled();
  });

  it('leaves untouched sessions without asking', () => {
    render(<NewSessionScreen />);

    let handled = true;
    act(() => {
      handled = hardwareBackPress!();
    });

    expect(handled).toBe(false);
    expect(screen.queryByText('Discard session?')).toBeNull();
  });
});
