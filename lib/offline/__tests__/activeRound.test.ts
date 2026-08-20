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
  tee_box_id: 'tee-1',
  tee_name: 'Gulur',
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
