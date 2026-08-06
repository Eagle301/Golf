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

import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as useRoutinesModule from '@/lib/hooks/useRoutines';
import { supabase } from '@/lib/supabase';
import { pickDrillPhoto, uploadDrillPhoto } from '@/lib/training/drillPhotos';
import RoutineFormScreen from '../[id]';

describe('RoutineFormScreen', () => {
  const push = jest.fn();
  const back = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push, back });
  });

  it('disables Save until name and at least one named drill are present', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'new' });
    (useRoutinesModule.useRoutine as jest.Mock).mockReturnValue({
      routine: { id: null, name: '', description: null, category: 'putts' },
      drills: [],
      loading: false,
      error: null,
    });

    render(<RoutineFormScreen />);

    expect(screen.getByTestId('save-routine-button').props.accessibilityState.disabled).toBe(true);
  });

  it('saves a new routine and navigates back', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'new' });
    (useRoutinesModule.useRoutine as jest.Mock).mockReturnValue({
      routine: { id: null, name: '', description: null, category: 'putts' },
      drills: [{ name: '3ft putts', target_value: 10, photo_url: null }],
      loading: false,
      error: null,
    });
    (useRoutinesModule.saveRoutine as jest.Mock).mockResolvedValue('new-id');

    render(<RoutineFormScreen />);
    fireEvent.changeText(screen.getByTestId('routine-name-input'), 'New Routine');
    fireEvent.press(screen.getByTestId('save-routine-button'));

    await waitFor(() => expect(back).toHaveBeenCalled());
    expect(useRoutinesModule.saveRoutine).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'New Routine',
        category: 'putts',
        drills: [{ name: '3ft putts', target_value: 10, photo_url: null }],
      })
    );
  });

  it('shows the delete button only when editing an existing routine', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'abc' });
    (useRoutinesModule.useRoutine as jest.Mock).mockReturnValue({
      routine: { id: 'abc', name: 'Existing', description: null, category: 'putts' },
      drills: [{ id: 'd1', name: '3ft putts', target_value: 10, photo_url: null }],
      loading: false,
      error: null,
    });

    render(<RoutineFormScreen />);
    expect(screen.getByTestId('delete-routine-button')).toBeTruthy();
  });

  it('does not show the delete button for a new routine', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'new' });
    (useRoutinesModule.useRoutine as jest.Mock).mockReturnValue({
      routine: { id: null, name: '', description: null, category: 'putts' },
      drills: [],
      loading: false,
      error: null,
    });

    render(<RoutineFormScreen />);
    expect(screen.queryByTestId('delete-routine-button')).toBeNull();
  });

  it('adds a blank drill row when "Add Drill" is pressed', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'new' });
    (useRoutinesModule.useRoutine as jest.Mock).mockReturnValue({
      routine: { id: null, name: '', description: null, category: 'putts' },
      drills: [],
      loading: false,
      error: null,
    });

    render(<RoutineFormScreen />);
    fireEvent.press(screen.getByTestId('add-drill-button'));
    expect(screen.getByTestId('drill-0-name')).toBeTruthy();
  });

  it('removes a drill row when its trash icon is pressed', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'new' });
    (useRoutinesModule.useRoutine as jest.Mock).mockReturnValue({
      routine: { id: null, name: '', description: null, category: 'putts' },
      drills: [
        { name: 'Drill A', target_value: null, photo_url: null },
        { name: 'Drill B', target_value: null, photo_url: null },
      ],
      loading: false,
      error: null,
    });

    render(<RoutineFormScreen />);
    fireEvent.press(screen.getByTestId('drill-0-remove'));
    expect(screen.getByTestId('drill-0-name').props.value).toBe('Drill B');
  });

  it('reorders drills with the move-down control', () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'new' });
    (useRoutinesModule.useRoutine as jest.Mock).mockReturnValue({
      routine: { id: null, name: '', description: null, category: 'putts' },
      drills: [
        { name: 'Drill A', target_value: null, photo_url: null },
        { name: 'Drill B', target_value: null, photo_url: null },
      ],
      loading: false,
      error: null,
    });

    render(<RoutineFormScreen />);
    fireEvent.press(screen.getByTestId('drill-0-move-down'));
    expect(screen.getByTestId('drill-0-name').props.value).toBe('Drill B');
    expect(screen.getByTestId('drill-1-name').props.value).toBe('Drill A');
  });

  it('picks and uploads a photo, attaching the returned url to the drill', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'new' });
    (useRoutinesModule.useRoutine as jest.Mock).mockReturnValue({
      routine: { id: null, name: '', description: null, category: 'putts' },
      drills: [{ name: 'Drill A', target_value: null, photo_url: null }],
      loading: false,
      error: null,
    });
    (supabase.auth.getUser as jest.Mock).mockResolvedValue({ data: { user: { id: 'user-1' } } });
    (pickDrillPhoto as jest.Mock).mockResolvedValue('file:///local.jpg');
    (uploadDrillPhoto as jest.Mock).mockResolvedValue('https://example.com/photo.jpg');

    render(<RoutineFormScreen />);
    fireEvent.press(screen.getByTestId('drill-0-take-photo'));

    await waitFor(() => expect(screen.getByTestId('drill-0-photo')).toBeTruthy());
    expect(pickDrillPhoto).toHaveBeenCalledWith('camera');
    expect(uploadDrillPhoto).toHaveBeenCalledWith('user-1', 'file:///local.jpg');
  });
});
