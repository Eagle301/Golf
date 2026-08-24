jest.mock('@/lib/supabase', () => ({ supabase: { from: jest.fn() } }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
  // Captured rather than dropped, so the header's back button - where the
  // unsaved-changes guard lives - can be rendered and pressed.
  Stack: { Screen: jest.fn(() => null) },
}));
jest.mock('@/lib/hooks/useHoleGeometry', () => ({
  ...jest.requireActual('@/lib/hooks/useHoleGeometry'),
  useHoleGeometry: jest.fn(),
  saveHoleGeometry: jest.fn(),
  copyableCourses: jest.fn(),
}));
jest.mock('@/components/course/HoleLineEditor', () => {
  const { View } = require('react-native');
  return { HoleLineEditor: jest.fn(() => <View testID="hole-editor-mock" />) };
});

import { render, fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useHoleGeometry, saveHoleGeometry, copyableCourses } from '@/lib/hooks/useHoleGeometry';
import { HoleLineEditor } from '@/components/course/HoleLineEditor';
import HoleLinesScreen from '../holes';

const TEE = { latitude: 64.15, longitude: -21.765 };
const GREEN = { latitude: 64.152, longitude: -21.76 };

/** The latest props the map document wrapper was rendered with. */
function editorProps() {
  return (HoleLineEditor as unknown as jest.Mock).mock.calls.at(-1)![0];
}

function tapMap(point: { latitude: number; longitude: number }) {
  act(() => {
    editorProps().onEdit({ type: 'point-added', ...point });
  });
}

/**
 * Renders the header's back button from the screen's own Stack options and
 * presses it. Rendered on its own the Pressable exposes only its click
 * handler, so `press` never lands - `click` is what reaches onPress here.
 */
function pressHeaderBack() {
  const options = (Stack.Screen as unknown as jest.Mock).mock.calls.at(-1)![0].options;
  const header = render(options.headerLeft());
  fireEvent(header.getByTestId('holes-back-button'), 'click');
}

function activeHolePath() {
  const props = editorProps();
  return props.holes.find((h: any) => h.hole_number === props.activeHoleNumber).path;
}

describe('HoleLinesScreen', () => {
  const push = jest.fn();
  const back = jest.fn();
  const refetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push, back });
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      id: 'course-1',
      name: 'Landið',
      club: 'GR',
      lat: '64.14977',
      lng: '-21.76237',
    });
    (copyableCourses as jest.Mock).mockResolvedValue([]);
    (saveHoleGeometry as jest.Mock).mockResolvedValue(undefined);
    (useHoleGeometry as jest.Mock).mockReturnValue({
      holes: [
        { id: 'h1', hole_number: 1, par: 4, path: [] },
        { id: 'h2', hole_number: 2, par: 3, path: [] },
      ],
      loading: false,
      error: null,
      refetch,
    });
  });

  it('starts on the first hole with the map ready', async () => {
    render(<HoleLinesScreen />);

    await waitFor(() => expect(screen.getByTestId('hole-editor-mock')).toBeTruthy());
    expect(editorProps().activeHoleNumber).toBe(1);
    expect(editorProps().course).toMatchObject({ name: 'Landið', latitude: 64.14977, longitude: -21.76237 });
  });

  it('places the tee then the green from two taps on the map', async () => {
    render(<HoleLinesScreen />);
    await waitFor(() => expect(screen.getByTestId('hole-editor-mock')).toBeTruthy());

    tapMap(TEE);
    tapMap(GREEN);

    expect(activeHolePath()).toEqual([
      [64.15, -21.765],
      [64.152, -21.76],
    ]);
  });

  it('keeps edits on a hole after switching away and back', async () => {
    render(<HoleLinesScreen />);
    await waitFor(() => expect(screen.getByTestId('hole-editor-mock')).toBeTruthy());
    tapMap(TEE);
    tapMap(GREEN);

    fireEvent.press(screen.getByTestId('hole-tab-2'));
    expect(activeHolePath()).toEqual([]);

    fireEvent.press(screen.getByTestId('hole-tab-1'));
    expect(activeHolePath()).toHaveLength(2);
  });

  it('ignores map taps in adjust mode, so a drag cannot add a stray point', async () => {
    render(<HoleLinesScreen />);
    await waitFor(() => expect(screen.getByTestId('hole-editor-mock')).toBeTruthy());
    tapMap(TEE);
    tapMap(GREEN);

    fireEvent.press(screen.getByTestId('mode-adjust'));
    tapMap({ latitude: 64.16, longitude: -21.7 });

    expect(activeHolePath()).toHaveLength(2);
  });

  it('removes a point when it is tapped in adjust mode', async () => {
    render(<HoleLinesScreen />);
    await waitFor(() => expect(screen.getByTestId('hole-editor-mock')).toBeTruthy());
    tapMap(TEE);
    tapMap(GREEN);
    fireEvent.press(screen.getByTestId('mode-adjust'));

    act(() => {
      editorProps().onEdit({ type: 'point-removed', index: 0 });
    });

    expect(activeHolePath()).toEqual([[64.152, -21.76]]);
  });

  it('moves a dragged point', async () => {
    render(<HoleLinesScreen />);
    await waitFor(() => expect(screen.getByTestId('hole-editor-mock')).toBeTruthy());
    tapMap(TEE);
    tapMap(GREEN);

    act(() => {
      editorProps().onEdit({ type: 'point-moved', index: 1, latitude: 64.153, longitude: -21.759 });
    });

    expect(activeHolePath()).toEqual([
      [64.15, -21.765],
      [64.153, -21.759],
    ]);
  });

  it('undoes the last edit on the active hole', async () => {
    render(<HoleLinesScreen />);
    await waitFor(() => expect(screen.getByTestId('hole-editor-mock')).toBeTruthy());
    tapMap(TEE);
    tapMap(GREEN);

    fireEvent.press(screen.getByTestId('undo-button'));

    expect(activeHolePath()).toEqual([[64.15, -21.765]]);
  });

  it('clears the active hole', async () => {
    render(<HoleLinesScreen />);
    await waitFor(() => expect(screen.getByTestId('hole-editor-mock')).toBeTruthy());
    tapMap(TEE);
    tapMap(GREEN);

    fireEvent.press(screen.getByTestId('clear-hole-button'));

    expect(activeHolePath()).toEqual([]);
  });

  it('counts how many holes are mapped', async () => {
    render(<HoleLinesScreen />);
    await waitFor(() => expect(screen.getByTestId('hole-editor-mock')).toBeTruthy());
    expect(screen.getByTestId('mapped-count').props.children).toContain('0 of 2');

    tapMap(TEE);
    tapMap(GREEN);

    expect(screen.getByTestId('mapped-count').props.children).toContain('1 of 2');
  });

  it('saves every hole and goes back', async () => {
    render(<HoleLinesScreen />);
    await waitFor(() => expect(screen.getByTestId('hole-editor-mock')).toBeTruthy());
    tapMap(TEE);
    tapMap(GREEN);

    fireEvent.press(screen.getByTestId('save-lines-button'));

    await waitFor(() => expect(saveHoleGeometry).toHaveBeenCalled());
    expect(saveHoleGeometry).toHaveBeenCalledWith([
      { hole_id: 'h1', path: [[64.15, -21.765], [64.152, -21.76]] },
      { hole_id: 'h2', path: [] },
    ]);
    await waitFor(() => expect(back).toHaveBeenCalled());
  });

  it('shows a save failure instead of pretending it worked', async () => {
    (saveHoleGeometry as jest.Mock).mockRejectedValue(new Error('permission denied'));
    render(<HoleLinesScreen />);
    await waitFor(() => expect(screen.getByTestId('hole-editor-mock')).toBeTruthy());
    tapMap(TEE);
    tapMap(GREEN);

    fireEvent.press(screen.getByTestId('save-lines-button'));

    await waitFor(() => expect(screen.getByText('permission denied')).toBeTruthy());
    expect(back).not.toHaveBeenCalled();
  });

  it('warns before leaving with unsaved lines', async () => {
    // Held onto deliberately: pressHeaderBack renders the header in its own
    // tree, which is what `screen` would otherwise point at afterwards.
    const view = render(<HoleLinesScreen />);
    await waitFor(() => expect(view.getByTestId('hole-editor-mock')).toBeTruthy());
    tapMap(TEE);
    tapMap(GREEN);

    pressHeaderBack();

    expect(back).not.toHaveBeenCalled();
    expect(view.getByText('Discard unsaved lines?')).toBeTruthy();
  });

  it('leaves straight away when nothing has been drawn', async () => {
    render(<HoleLinesScreen />);
    await waitFor(() => expect(screen.getByTestId('hole-editor-mock')).toBeTruthy());

    pressHeaderBack();

    expect(back).toHaveBeenCalled();
  });

  it('copies the lines of a matching course onto the empty holes', async () => {
    (copyableCourses as jest.Mock).mockResolvedValue([
      {
        id: 'sibling',
        name: 'Korpa Landið',
        mappedHoles: 1,
        holes: [{ hole_number: 2, path: [[64.16, -21.77], [64.161, -21.769]] }],
      },
    ]);

    render(<HoleLinesScreen />);
    await waitFor(() => expect(screen.getByTestId('copy-from-sibling')).toBeTruthy());

    fireEvent.press(screen.getByTestId('copy-from-sibling'));

    const holeTwo = editorProps().holes.find((h: any) => h.hole_number === 2);
    expect(holeTwo.path).toEqual([[64.16, -21.77], [64.161, -21.769]]);
  });
});
