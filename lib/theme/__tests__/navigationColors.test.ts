import { getNavigationColors } from '../navigationColors';

describe('getNavigationColors', () => {
  const FIXED = {
    headerBackground: '#1B3B2B',
    headerTint: '#FFFFFF',
    tabBarBackground: '#F5F7F2',
    tabBarActiveTint: '#1B3B2B',
    tabBarInactiveTint: '#4B5563',
    borderColor: '#E5E7EB',
    contentBackground: '#EBF0E6',
  };

  it('always returns a brand-green header regardless of scheme', () => {
    expect(getNavigationColors('light').headerBackground).toBe('#1B3B2B');
    expect(getNavigationColors('dark').headerBackground).toBe('#1B3B2B');
    expect(getNavigationColors(undefined).headerBackground).toBe('#1B3B2B');
  });

  it('always returns the light-mode palette for the tab bar and content, regardless of scheme', () => {
    expect(getNavigationColors('light')).toEqual(FIXED);
    expect(getNavigationColors('dark')).toEqual(FIXED);
    expect(getNavigationColors(undefined)).toEqual(FIXED);
    expect(getNavigationColors(null)).toEqual(FIXED);
  });
});
