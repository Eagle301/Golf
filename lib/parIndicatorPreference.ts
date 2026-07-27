import AsyncStorage from '@react-native-async-storage/async-storage';

export type ParIndicatorPreference = 'off' | 'par' | 'net_par';

const PAR_INDICATOR_PREFERENCE_KEY = 'golf.parIndicatorPreference';

export async function getParIndicatorPreference(): Promise<ParIndicatorPreference> {
  const raw = await AsyncStorage.getItem(PAR_INDICATOR_PREFERENCE_KEY);
  if (raw === 'off' || raw === 'par' || raw === 'net_par') return raw;
  return 'par';
}

export async function setParIndicatorPreference(preference: ParIndicatorPreference): Promise<void> {
  await AsyncStorage.setItem(PAR_INDICATOR_PREFERENCE_KEY, preference);
}
