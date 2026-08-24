jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
  Stack: { Screen: () => null },
}));
jest.mock('@/lib/hooks/useRoutines', () => ({
  useRoutine: jest.fn(),
  saveRoutine: jest.fn(),
  deleteRoutine: jest.fn(),
  RoutineValidationError: class RoutineValidationError extends Error {},
}));
jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { getUser: jest.fn() } },
}));
jest.mock('@/lib/training/drillPhotos', () => ({
  pickDrillPhoto: jest.fn(),
  uploadDrillPhoto: jest.fn(),
}));
jest.mock('react-native-youtube-iframe', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: (props: any) => <View testID="youtube-player" {...props} /> };
});

import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as useRoutinesModule from '@/lib/hooks/useRoutines';
import { supabase } from '@/lib/supabase';
import { pickDrillPhoto, uploadDrillPhoto } from '@/lib/training/drillPhotos';
import RoutineFormScreen from '../[id]';

const drill = (over: Partial<useRoutinesModule.DrillInput> = {}): useRoutinesModule.DrillInput => ({
  name: '3ft putts',
  target_value: 10,
  photo_url: null,
  video_url: null,
  result_type: 'target',
  ...over,
});

function mockRoutine(routine: any, drills: useRoutinesModule.DrillInput[]) {
  (useRoutinesModule.useRoutine as jest.Mock).mockReturnValue({ routine, drills, loading: false, error: null });
}

const blankRoutine = { id: null, name: '', description: null, category: 'putts' };
const existingRoutine = { id: 'abc', name: 'Existing', description: null, category: 'putts' };

describe('RoutineFormScreen', () => {
  const push = jest.fn();
  const back = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push, back });
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'new' });
  });

  it('offers all four categories and marks the picked one', () => {
    mockRoutine(blankRoutine, []);
    render(<RoutineFormScreen />);

    for (const cat of ['putts', 'short_game', 'full_swing', 'strategy']) {
      expect(screen.getByTestId(`category-${cat}`)).toBeTruthy();
    }
    expect(screen.getByTestId('category-putts').props.accessibilityState.selected).toBe(true);

    fireEvent.press(screen.getByTestId('category-full_swing'));
    expect(screen.getByTestId('category-full_swing').props.accessibilityState.selected).toBe(true);
    expect(screen.getByTestId('category-putts').props.accessibilityState.selected).toBe(false);
  });

  it('invites the first drill when the routine has none', () => {
    mockRoutine(blankRoutine, []);
    render(<RoutineFormScreen />);
    expect(screen.getByTestId('drills-empty-state')).toBeTruthy();
  });

  it('numbers the drills in running order', () => {
    mockRoutine(blankRoutine, [drill({ name: 'First' }), drill({ name: 'Second' })]);
    render(<RoutineFormScreen />);

    expect(screen.getByTestId('drill-0-position')).toBeTruthy();
    expect(screen.getByTestId('drill-1-position')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });

  it('disables Save until name and at least one named drill are present', () => {
    mockRoutine(blankRoutine, []);
    render(<RoutineFormScreen />);
    expect(screen.getByTestId('save-routine-button').props.accessibilityState.disabled).toBe(true);
  });

  it('says why Save is unavailable', () => {
    mockRoutine(blankRoutine, []);
    render(<RoutineFormScreen />);
    expect(screen.getByTestId('routine-validation-hint')).toBeTruthy();
    expect(screen.getByText('Name your routine to save it.')).toBeTruthy();
  });

  it('explains a missing drill name', () => {
    mockRoutine({ ...blankRoutine, name: 'Ladder' }, [drill({ name: '' })]);
    render(<RoutineFormScreen />);
    expect(screen.getByText('Every drill needs a name.')).toBeTruthy();
  });

  it('explains a missing target on an out-of drill', () => {
    mockRoutine({ ...blankRoutine, name: 'Ladder' }, [drill({ target_value: null })]);
    render(<RoutineFormScreen />);
    expect(screen.getByText('"Out of" drills need a target.')).toBeTruthy();
  });

  it('hides the hint and enables Save once the routine is valid', () => {
    mockRoutine({ ...blankRoutine, name: 'Ladder' }, [drill()]);
    render(<RoutineFormScreen />);
    expect(screen.queryByTestId('routine-validation-hint')).toBeNull();
    expect(screen.getByTestId('save-routine-button').props.accessibilityState.disabled).toBe(false);
  });

  it('saves a new routine and navigates back', async () => {
    mockRoutine(blankRoutine, [drill()]);
    (useRoutinesModule.saveRoutine as jest.Mock).mockResolvedValue('new-id');

    render(<RoutineFormScreen />);
    fireEvent.changeText(screen.getByTestId('routine-name-input'), 'New Routine');
    fireEvent.press(screen.getByTestId('save-routine-button'));

    await waitFor(() => expect(back).toHaveBeenCalled());
    expect(useRoutinesModule.saveRoutine).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Routine',
        category: 'putts',
        drills: [drill()],
      })
    );
  });

  it('surfaces a save failure without navigating away', async () => {
    mockRoutine({ ...blankRoutine, name: 'Ladder' }, [drill()]);
    (useRoutinesModule.saveRoutine as jest.Mock).mockRejectedValue(new Error('server said no'));

    render(<RoutineFormScreen />);
    fireEvent.press(screen.getByTestId('save-routine-button'));

    await waitFor(() => expect(screen.getByText('server said no')).toBeTruthy());
    expect(back).not.toHaveBeenCalled();
  });

  it('shows the delete button only when editing an existing routine', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'abc' });
    mockRoutine(existingRoutine, [drill({ id: 'd1' })]);

    render(<RoutineFormScreen />);
    expect(screen.getByTestId('delete-routine-button')).toBeTruthy();
  });

  it('does not show the delete button for a new routine', () => {
    mockRoutine(blankRoutine, []);
    render(<RoutineFormScreen />);
    expect(screen.queryByTestId('delete-routine-button')).toBeNull();
  });

  it('deletes an existing routine after confirmation', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'abc' });
    mockRoutine(existingRoutine, [drill({ id: 'd1' })]);
    (useRoutinesModule.deleteRoutine as jest.Mock).mockResolvedValue(undefined);

    render(<RoutineFormScreen />);
    fireEvent.press(screen.getByTestId('delete-routine-button'));
    fireEvent.press(screen.getByTestId('confirm-dialog-confirm'));

    await waitFor(() => expect(useRoutinesModule.deleteRoutine).toHaveBeenCalledWith('abc'));
  });

  it('adds the first drill straight from the empty state', () => {
    mockRoutine(blankRoutine, []);
    render(<RoutineFormScreen />);

    // With no drills the empty-state card is itself the add affordance, so a
    // separate button beside it would be redundant.
    expect(screen.queryByTestId('add-drill-button')).toBeNull();

    fireEvent.press(screen.getByTestId('drills-empty-state'));
    expect(screen.getByTestId('drill-0-name')).toBeTruthy();
    expect(screen.queryByTestId('drills-empty-state')).toBeNull();
  });

  it('adds a further drill with the add button once one exists', () => {
    mockRoutine(blankRoutine, [drill({ name: 'Drill A' })]);
    render(<RoutineFormScreen />);
    fireEvent.press(screen.getByTestId('add-drill-button'));
    expect(screen.getByTestId('drill-1-name')).toBeTruthy();
    expect(screen.getByTestId('drill-1-name').props.value).toBe('');
  });

  it('removes a drill row when its trash icon is pressed', () => {
    mockRoutine(blankRoutine, [drill({ name: 'Drill A' }), drill({ name: 'Drill B' })]);
    render(<RoutineFormScreen />);
    fireEvent.press(screen.getByTestId('drill-0-remove'));
    expect(screen.getByTestId('drill-0-name').props.value).toBe('Drill B');
  });

  it('reorders drills with the move-down control', () => {
    mockRoutine(blankRoutine, [drill({ name: 'Drill A' }), drill({ name: 'Drill B' })]);
    render(<RoutineFormScreen />);
    fireEvent.press(screen.getByTestId('drill-0-move-down'));
    expect(screen.getByTestId('drill-0-name').props.value).toBe('Drill B');
    expect(screen.getByTestId('drill-1-name').props.value).toBe('Drill A');
  });

  it('picks and uploads a photo, attaching the returned url to the drill', async () => {
    mockRoutine(blankRoutine, [drill({ name: 'Drill A' })]);
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } });
    (pickDrillPhoto as jest.Mock).mockResolvedValue('file:///local.jpg');
    (uploadDrillPhoto as jest.Mock).mockResolvedValue('https://example.com/photo.jpg');

    render(<RoutineFormScreen />);
    fireEvent.press(screen.getByTestId('drill-0-add-photo'));
    fireEvent.press(screen.getByTestId('drill-0-take-photo'));

    await waitFor(() => expect(screen.getByTestId('drill-0-photo')).toBeTruthy());
    expect(pickDrillPhoto).toHaveBeenCalledWith('camera');
    expect(uploadDrillPhoto).toHaveBeenCalledWith('user-1', 'file:///local.jpg');
  });
});
