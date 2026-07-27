jest.mock('@/lib/supabase', () => ({
  supabase: { auth: { signInWithPassword: jest.fn() } },
}));

import { render, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { supabase } from '@/lib/supabase';
import { SignInScreen } from '../SignInScreen';

describe('SignInScreen', () => {
  beforeEach(() => {
    (supabase.auth.signInWithPassword as jest.Mock).mockReset();
  });

  it('disables the submit button until both fields are filled in', () => {
    render(<SignInScreen />);
    expect(screen.getByTestId('sign-in-submit').props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(screen.getByTestId('sign-in-email'), 'me@example.com');
    expect(screen.getByTestId('sign-in-submit').props.accessibilityState.disabled).toBe(true);

    fireEvent.changeText(screen.getByTestId('sign-in-password'), 'hunter2');
    expect(screen.getByTestId('sign-in-submit').props.accessibilityState.disabled).toBe(false);
  });

  it('signs in with the entered credentials', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({ error: null });
    render(<SignInScreen />);

    fireEvent.changeText(screen.getByTestId('sign-in-email'), 'me@example.com');
    fireEvent.changeText(screen.getByTestId('sign-in-password'), 'hunter2');
    fireEvent.press(screen.getByTestId('sign-in-submit'));

    await waitFor(() =>
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'me@example.com',
        password: 'hunter2',
      })
    );
  });

  it('shows an error message when sign-in fails', async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    render(<SignInScreen />);

    fireEvent.changeText(screen.getByTestId('sign-in-email'), 'me@example.com');
    fireEvent.changeText(screen.getByTestId('sign-in-password'), 'wrong');
    fireEvent.press(screen.getByTestId('sign-in-submit'));

    expect(await screen.findByTestId('sign-in-error')).toHaveTextContent('Invalid login credentials');
  });
});
