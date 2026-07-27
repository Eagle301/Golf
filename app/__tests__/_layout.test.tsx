jest.mock('@/lib/hooks/useAuthSession', () => ({ useAuthSession: jest.fn() }));
jest.mock('@/lib/hooks/useRoundSync', () => ({ useRoundSync: jest.fn() }));
jest.mock('@/lib/hooks/useThemePreference', () => ({ useThemePreference: jest.fn() }));
jest.mock('@/lib/supabase', () => ({ supabase: { auth: { signInWithPassword: jest.fn() } } }));

import { render, screen } from '@testing-library/react-native';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { useThemePreference } from '@/lib/hooks/useThemePreference';
import RootLayout from '../_layout';

describe('RootLayout', () => {
  it('shows a loading indicator until the auth session is ready', () => {
    (useAuthSession as jest.Mock).mockReturnValue({ ready: false, session: null });
    render(<RootLayout />);
    expect(screen.getByTestId('auth-loading')).toBeTruthy();
  });

  it('shows the sign-in screen when there is no session', () => {
    (useAuthSession as jest.Mock).mockReturnValue({ ready: true, session: null });
    render(<RootLayout />);
    expect(screen.getByTestId('sign-in-screen')).toBeTruthy();
  });

  it('applies the persisted theme preference on launch', () => {
    (useAuthSession as jest.Mock).mockReturnValue({ ready: false, session: null });
    render(<RootLayout />);
    expect(useThemePreference).toHaveBeenCalled();
  });
});
