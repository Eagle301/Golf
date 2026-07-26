import { getNavigationColors } from '../navigationColors';

describe('getNavigationColors', () => {
  it('returns light-mode colors for "light"', () => {
    expect(getNavigationColors('light')).toEqual({
      headerBackground: '#F5F7F2',
      headerTint: '#111827',
      tabBarBackground: '#F5F7F2',
      tabBarActiveTint: '#1B3B2B',
      tabBarInactiveTint: '#4B5563',
      borderColor: '#E5E7EB',
      contentBackground: '#EBF0E6',
    });
  });

  it('returns dark-mode colors for "dark"', () => {
    expect(getNavigationColors('dark')).toEqual({
      headerBackground: '#1E2621',
      headerTint: '#F3F4F6',
      tabBarBackground: '#1E2621',
      tabBarActiveTint: '#F59E0B',
      tabBarInactiveTint: '#9CA3AF',
      borderColor: '#2D3A32',
      contentBackground: '#121614',
    });
  });

  it('defaults to light-mode colors when scheme is undefined or null', () => {
    expect(getNavigationColors(undefined)).toEqual(getNavigationColors('light'));
    expect(getNavigationColors(null)).toEqual(getNavigationColors('light'));
  });
});
