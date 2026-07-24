jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: jest.fn(), signInWithPassword: jest.fn() } },
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { supabase } from '@/lib/supabase';
import { useDevAutoSignIn } from '../useDevAutoSignIn';

describe('useDevAutoSignIn', () => {
  // Mutate process.env in place (don't reassign process.env itself) — Expo's
  // "expo/virtual/env" module captures a reference to the original process.env
  // object at import time, so a wholesale reassignment here would be invisible
  // to code that reads env vars through that virtual module.
  beforeEach(() => {
    process.env.EXPO_PUBLIC_DEV_USER_EMAIL = 'dev@golfapp.test';
    process.env.EXPO_PUBLIC_DEV_USER_PASSWORD = 'DevTest123!';
  });

  afterEach(() => {
    delete process.env.EXPO_PUBLIC_DEV_USER_EMAIL;
    delete process.env.EXPO_PUBLIC_DEV_USER_PASSWORD;
  });

  it('skips sign-in when a session already exists', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { user: { id: 'u1' } } },
    });

    const { result } = renderHook(() => useDevAutoSignIn());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(result.current.error).toBeNull();
  });

  it('signs in with the dev credentials when there is no session', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });

    const { result } = renderHook(() => useDevAutoSignIn());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'dev@golfapp.test',
      password: 'DevTest123!',
    });
    expect(result.current.error).toBeNull();
  });

  it('surfaces the error message when sign-in fails', async () => {
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({ data: { session: null } });
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: { message: 'invalid credentials' },
    });

    const { result } = renderHook(() => useDevAutoSignIn());

    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.error).toBe('invalid credentials');
  });
});
