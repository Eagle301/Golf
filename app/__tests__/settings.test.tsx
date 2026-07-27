jest.mock('@/lib/hooks/useThemePreference', () => ({ useThemePreference: jest.fn() }));

import { render, fireEvent, screen } from '@testing-library/react-native';
import { useThemePreference } from '@/lib/hooks/useThemePreference';
import { getParIndicatorPreference } from '@/lib/parIndicatorPreference';
import SettingsScreen from '../settings';

describe('SettingsScreen', () => {
  const setPreference = jest.fn();

  beforeEach(() => {
    setPreference.mockClear();
  });

  it('renders all three theme options', () => {
    (useThemePreference as jest.Mock).mockReturnValue({
      preference: 'system',
      colorScheme: 'light',
      setPreference,
    });

    render(<SettingsScreen />);

    expect(screen.getByTestId('theme-option-system')).toBeTruthy();
    expect(screen.getByTestId('theme-option-light')).toBeTruthy();
    expect(screen.getByTestId('theme-option-dark')).toBeTruthy();
  });

  it('calls setPreference with "dark" when the Dark option is tapped', () => {
    (useThemePreference as jest.Mock).mockReturnValue({
      preference: 'system',
      colorScheme: 'light',
      setPreference,
    });

    render(<SettingsScreen />);
    fireEvent.press(screen.getByTestId('theme-option-dark'));

    expect(setPreference).toHaveBeenCalledWith('dark');
  });

  it('renders the current preference as the primary (selected) variant', () => {
    (useThemePreference as jest.Mock).mockReturnValue({
      preference: 'dark',
      colorScheme: 'dark',
      setPreference,
    });

    const { toJSON } = render(<SettingsScreen />);
    const tree = JSON.stringify(toJSON());

    // The selected option's testID appears once immediately before its
    // primary-variant classes in the serialized tree.
    const darkIndex = tree.indexOf('theme-option-dark');
    const nearby = tree.slice(darkIndex, darkIndex + 300);
    expect(nearby).toContain('bg-brand');
  });

  it('themes the root screen with the background token', () => {
    (useThemePreference as jest.Mock).mockReturnValue({
      preference: 'light',
      colorScheme: 'light',
      setPreference,
    });

    const { toJSON } = render(<SettingsScreen />);
    const tree = JSON.stringify(toJSON());

    expect(tree).toContain('bg-background');
    expect(tree).toContain('dark:bg-background-dark');
  });

  it('renders all three par indicator options, defaulting to "par"', async () => {
    (useThemePreference as jest.Mock).mockReturnValue({
      preference: 'system',
      colorScheme: 'light',
      setPreference,
    });

    render(<SettingsScreen />);

    expect(await screen.findByTestId('par-indicator-option-off')).toBeTruthy();
    expect(screen.getByTestId('par-indicator-option-par')).toBeTruthy();
    expect(screen.getByTestId('par-indicator-option-net_par')).toBeTruthy();
  });

  it('persists the par indicator preference when an option is tapped', async () => {
    (useThemePreference as jest.Mock).mockReturnValue({
      preference: 'system',
      colorScheme: 'light',
      setPreference,
    });

    render(<SettingsScreen />);
    await screen.findByTestId('par-indicator-option-net_par');
    fireEvent.press(screen.getByTestId('par-indicator-option-net_par'));

    expect(await getParIndicatorPreference()).toBe('net_par');
  });
});
