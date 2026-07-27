jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: jest.fn(), onAuthStateChange: jest.fn() } },
}));

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { supabase } from '@/lib/supabase';
import { useAuthSession } from '../useAuthSession';

describe('useAuthSession', () => {
  const unsubscribe = jest.fn();

  beforeEach(() => {
    unsubscribe.mockClear();
    (supabase.auth.onAuthStateChange as jest.Mock).mockReturnValue({
      data: { subscription: { unsubscribe } },
    });
  });

  it('is not ready until the initial session lookup resolves', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });

    const { result } = renderHook(() => useAuthSession());

    expect(result.current.ready).toBe(false);
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.session).toBeNull();
  });

  it('reports the existing session once loaded', async () => {
    const session = { user: { id: 'u1' } };
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session } });

    const { result } = renderHook(() => useAuthSession());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.session).toBe(session);
  });

  it('updates the session when auth state changes (e.g. sign-in or sign-out)', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    let onChange: (event: string, session: unknown) => void = () => {};
    (supabase.auth.onAuthStateChange as jest.Mock).mockImplementation((cb) => {
      onChange = cb;
      return { data: { subscription: { unsubscribe } } };
    });

    const { result } = renderHook(() => useAuthSession());
    await waitFor(() => expect(result.current.ready).toBe(true));

    const newSession = { user: { id: 'u2' } };
    act(() => {
      onChange('SIGNED_IN', newSession);
    });

    expect(result.current.session).toBe(newSession);
  });

  it('unsubscribes from auth state changes on unmount', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });

    const { unmount } = renderHook(() => useAuthSession());
    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });
});
