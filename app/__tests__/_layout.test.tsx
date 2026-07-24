jest.mock('@/lib/hooks/useDevAutoSignIn', () => ({ useDevAutoSignIn: jest.fn() }));
jest.mock('@/lib/hooks/useRoundSync', () => ({ useRoundSync: jest.fn() }));

import { render, screen } from '@testing-library/react-native';
import { useDevAutoSignIn } from '@/lib/hooks/useDevAutoSignIn';
import RootLayout from '../_layout';

describe('RootLayout', () => {
  it('shows a loading indicator until auth is ready', () => {
    (useDevAutoSignIn as jest.Mock).mockReturnValue({ ready: false, error: null });
    render(<RootLayout />);
    expect(screen.getByTestId('auth-loading')).toBeTruthy();
  });

  it('shows an error message when auto sign-in fails', () => {
    (useDevAutoSignIn as jest.Mock).mockReturnValue({ ready: true, error: 'invalid credentials' });
    render(<RootLayout />);
    expect(screen.getByText(/invalid credentials/)).toBeTruthy();
  });
});
