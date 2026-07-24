import AsyncStorage from '@react-native-async-storage/async-storage';
import { getActiveRound, setActiveRound, clearActiveRound } from '../activeRound';
import type { ActiveRound } from '../types';

beforeEach(async () => {
  await AsyncStorage.clear();
});

const sampleRound: ActiveRound = {
  localId: 'local_1',
  course_id: 'course-1',
  course_name: 'Test Course',
  hole_count: 9,
  date_played: '2026-07-24',
  notes: '',
  currentHoleIndex: 0,
  holeLogs: [
    {
      hole_number: 1,
      par: 4,
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

describe('activeRound storage', () => {
  it('returns null when nothing is stored', async () => {
    expect(await getActiveRound()).toBeNull();
  });

  it('round-trips a stored round', async () => {
    await setActiveRound(sampleRound);
    expect(await getActiveRound()).toEqual(sampleRound);
  });

  it('clears the stored round', async () => {
    await setActiveRound(sampleRound);
    await clearActiveRound();
    expect(await getActiveRound()).toBeNull();
  });
});
