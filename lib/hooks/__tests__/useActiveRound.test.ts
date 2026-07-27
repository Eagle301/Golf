import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { setActiveRound } from '@/lib/offline/activeRound';
import type { ActiveRound } from '@/lib/offline/types';
import { useActiveRound } from '../useActiveRound';

beforeEach(async () => {
  await AsyncStorage.clear();
});

const sampleRound: ActiveRound = {
  localId: 'local_1',
  course_id: 'course-1',
  course_name: 'Test Course',
  hole_count: 9,
  course_rating: 68.5,
  slope_rating: 125,
  total_par: 36,
  total_length_meters: 3000,
  handicap_at_start: 12.4,
  date_played: '2026-07-24',
  notes: '',
  currentHoleIndex: 0,
  holeLogs: [
    {
      hole_number: 1,
      par: 4,
      length_meters: 350,
      stroke_index: 5,
      hole_id: 'hole-1',
      score: null,
      putts: null,
      fairway_hit: null,
      gir: null,
      gir_overridden: false,
      penalties: 0,
      chip_shots: 0,
    },
  ],
};

describe('useActiveRound', () => {
  it('loads the active round from storage on mount', async () => {
    await setActiveRound(sampleRound);
    const { result } = renderHook(() => useActiveRound());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.activeRound).toEqual(sampleRound);
  });

  it('refetch picks up a change persisted by a different hook instance', async () => {
    await setActiveRound(sampleRound);
    const { result } = renderHook(() => useActiveRound());
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Simulate another screen's own useActiveRound() instance persisting a
    // hole jump - this hook's local state won't see it until it refetches.
    const updated = { ...sampleRound, currentHoleIndex: 4 };
    await setActiveRound(updated);
    expect(result.current.activeRound?.currentHoleIndex).toBe(0);

    await act(async () => {
      await result.current.refetch();
    });

    expect(result.current.activeRound?.currentHoleIndex).toBe(4);
  });
});
