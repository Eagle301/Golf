import { useEffect, useState } from 'react';
import {
  getParIndicatorPreference,
  setParIndicatorPreference,
  type ParIndicatorPreference,
} from '@/lib/parIndicatorPreference';

export interface UseParIndicatorPreferenceResult {
  preference: ParIndicatorPreference;
  setPreference: (next: ParIndicatorPreference) => Promise<void>;
}

export function useParIndicatorPreference(): UseParIndicatorPreferenceResult {
  const [preference, setPreferenceState] = useState<ParIndicatorPreference>('par');

  useEffect(() => {
    let cancelled = false;

    getParIndicatorPreference()
      .then((stored) => {
        if (!cancelled) setPreferenceState(stored);
      })
      .catch((error) => {
        console.warn('useParIndicatorPreference: failed to load preference', error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function setPreference(next: ParIndicatorPreference): Promise<void> {
    setPreferenceState(next);
    await setParIndicatorPreference(next);
  }

  return { preference, setPreference };
}
