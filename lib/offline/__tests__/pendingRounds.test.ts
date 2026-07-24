import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPendingRounds, addPendingRound, removePendingRound } from '../pendingRounds';
import type { PendingRound } from '../types';

beforeEach(async () => {
  await AsyncStorage.clear();
});

function makeRound(localId: string): PendingRound {
  return {
    localId,
    course_id: 'course-1',
    date_played: '2026-07-24',
    notes: '',
    total_score: 90,
    total_putts: 32,
    score_differential: 18,
    handicap_at_time: 12.4,
    holeLogs: [],
  };
}

describe('pendingRounds storage', () => {
  it('starts empty', async () => {
    expect(await getPendingRounds()).toEqual([]);
  });

  it('appends rounds in order', async () => {
    await addPendingRound(makeRound('a'));
    await addPendingRound(makeRound('b'));

    const pending = await getPendingRounds();
    expect(pending.map((r) => r.localId)).toEqual(['a', 'b']);
  });

  it('removes only the matching round', async () => {
    await addPendingRound(makeRound('a'));
    await addPendingRound(makeRound('b'));
    await removePendingRound('a');

    const pending = await getPendingRounds();
    expect(pending.map((r) => r.localId)).toEqual(['b']);
  });
});
