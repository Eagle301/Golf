const mockSetColorScheme = jest.fn();

jest.mock('nativewind', () => ({
  useColorScheme: () => ({
    colorScheme: 'light',
    setColorScheme: mockSetColorScheme,
    toggleColorScheme: jest.fn(),
  }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { setThemePreference } from '@/lib/theme/themePreference';
import { useThemePreference } from '../useThemePreference';

beforeEach(async () => {
  await AsyncStorage.clear();
  mockSetColorScheme.mockClear();
});

describe('useThemePreference', () => {
  it('applies the system default on first launch', async () => {
    const { result } = renderHook(() => useThemePreference());

    await waitFor(() => expect(mockSetColorScheme).toHaveBeenCalledWith('system'));
    expect(result.current.preference).toBe('system');
  });

  it('applies a previously persisted preference on mount', async () => {
    await setThemePreference('dark');
    const { result } = renderHook(() => useThemePreference());

    await waitFor(() => expect(result.current.preference).toBe('dark'));
    expect(mockSetColorScheme).toHaveBeenCalledWith('dark');
  });

  it('updates and persists a new preference', async () => {
    const { result } = renderHook(() => useThemePreference());
    await waitFor(() => expect(result.current.preference).toBe('system'));

    await act(async () => {
      await result.current.setPreference('dark');
    });

    expect(result.current.preference).toBe('dark');
    expect(mockSetColorScheme).toHaveBeenCalledWith('dark');
    expect(await AsyncStorage.getItem('golf.themePreference')).toBe('dark');
  });
});
