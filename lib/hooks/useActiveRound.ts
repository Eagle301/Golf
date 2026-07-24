import { useCallback, useEffect, useState } from 'react';
import { getActiveRound, setActiveRound as persistActiveRound, clearActiveRound } from '@/lib/offline/activeRound';
import type { ActiveRound } from '@/lib/offline/types';

export interface UseActiveRoundResult {
  activeRound: ActiveRound | null;
  loading: boolean;
  updateActiveRound: (round: ActiveRound) => Promise<void>;
  discardActiveRound: () => Promise<void>;
}

export function useActiveRound(): UseActiveRoundResult {
  const [activeRound, setActiveRoundState] = useState<ActiveRound | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveRound().then((round) => {
      setActiveRoundState(round);
      setLoading(false);
    });
  }, []);

  const updateActiveRound = useCallback(async (round: ActiveRound) => {
    setActiveRoundState(round);
    await persistActiveRound(round);
  }, []);

  const discardActiveRound = useCallback(async () => {
    setActiveRoundState(null);
    await clearActiveRound();
  }, []);

  return { activeRound, loading, updateActiveRound, discardActiveRound };
}
