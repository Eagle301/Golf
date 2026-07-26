import AsyncStorage from '@react-native-async-storage/async-storage';
import { getThemePreference, setThemePreference } from '../themePreference';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('themePreference', () => {
  it('defaults to system when nothing is stored', async () => {
    expect(await getThemePreference()).toBe('system');
  });

  it('persists and reloads a chosen preference', async () => {
    await setThemePreference('dark');
    expect(await getThemePreference()).toBe('dark');
  });

  it('falls back to system for a corrupted stored value', async () => {
    await AsyncStorage.setItem('golf.themePreference', 'not-a-real-value');
    expect(await getThemePreference()).toBe('system');
  });
});
