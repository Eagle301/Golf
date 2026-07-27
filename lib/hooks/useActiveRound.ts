import { useCallback, useEffect, useState } from 'react';
import { getActiveRound, setActiveRound as persistActiveRound, clearActiveRound } from '@/lib/offline/activeRound';
import type { ActiveRound } from '@/lib/offline/types';

export interface UseActiveRoundResult {
  activeRound: ActiveRound | null;
  loading: boolean;
  updateActiveRound: (round: ActiveRound) => Promise<void>;
  discardActiveRound: () => Promise<void>;
  /**
   * Re-reads the active round from storage. Each screen that calls
   * useActiveRound() gets its own React state, so a change persisted from one
   * screen (e.g. jumping to a hole from the mid-round Scorecard) isn't seen
   * by another already-mounted screen (e.g. the live round screen sitting
   * underneath it in the nav stack) until it refetches - call this on focus.
   */
  refetch: () => Promise<void>;
}

export function useActiveRound(): UseActiveRoundResult {
  const [activeRound, setActiveRoundState] = useState<ActiveRound | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const round = await getActiveRound();
    setActiveRoundState(round);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const updateActiveRound = useCallback(async (round: ActiveRound) => {
    setActiveRoundState(round);
    await persistActiveRound(round);
  }, []);

  const discardActiveRound = useCallback(async () => {
    setActiveRoundState(null);
    await clearActiveRound();
  }, []);

  return { activeRound, loading, updateActiveRound, discardActiveRound, refetch };
}
