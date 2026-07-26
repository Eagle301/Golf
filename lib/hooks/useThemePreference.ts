import { useEffect, useState } from 'react';
import { useColorScheme } from 'nativewind';
import {
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from '@/lib/theme/themePreference';

export interface UseThemePreferenceResult {
  preference: ThemePreference;
  colorScheme: 'light' | 'dark' | undefined;
  setPreference: (next: ThemePreference) => Promise<void>;
}

export function useThemePreference(): UseThemePreferenceResult {
  const { colorScheme, setColorScheme } = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const stored = await getThemePreference();
      if (cancelled) return;
      setPreferenceState(stored);
      setColorScheme(stored);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [setColorScheme]);

  async function setPreference(next: ThemePreference): Promise<void> {
    setPreferenceState(next);
    setColorScheme(next);
    await setThemePreference(next);
  }

  return { preference, colorScheme, setPreference };
}
