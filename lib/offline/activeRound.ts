import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ActiveRound } from './types';

const ACTIVE_ROUND_KEY = 'golf.activeRound';

export async function getActiveRound(): Promise<ActiveRound | null> {
  const raw = await AsyncStorage.getItem(ACTIVE_ROUND_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as ActiveRound;
}

export async function setActiveRound(round: ActiveRound): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_ROUND_KEY, JSON.stringify(round));
}

export async function clearActiveRound(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_ROUND_KEY);
}
