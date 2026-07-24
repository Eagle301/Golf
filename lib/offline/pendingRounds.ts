import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PendingRound } from './types';

const PENDING_ROUNDS_KEY = 'golf.pendingRounds';

export async function getPendingRounds(): Promise<PendingRound[]> {
  const raw = await AsyncStorage.getItem(PENDING_ROUNDS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as PendingRound[];
}

export async function addPendingRound(round: PendingRound): Promise<void> {
  const existing = await getPendingRounds();
  await AsyncStorage.setItem(PENDING_ROUNDS_KEY, JSON.stringify([...existing, round]));
}

export async function removePendingRound(localId: string): Promise<void> {
  const existing = await getPendingRounds();
  await AsyncStorage.setItem(
    PENDING_ROUNDS_KEY,
    JSON.stringify(existing.filter((r) => r.localId !== localId))
  );
}
