import { colors } from './colors';

export interface NavigationColors {
  headerBackground: string;
  headerTint: string;
  tabBarBackground: string;
  tabBarActiveTint: string;
  tabBarInactiveTint: string;
  borderColor: string;
  contentBackground: string;
}

// Dark mode is temporarily disabled while the visual redesign is paused:
// the header always shows the brand green (regardless of scheme), and
// everything else (tab bar, screen content background) always uses the
// light-mode palette. The `scheme` param is kept so callers don't need to
// change, and so re-enabling per-scheme colors later is a one-line revert.
export function getNavigationColors(
  _scheme: 'light' | 'dark' | undefined | null
): NavigationColors {
  return {
    headerBackground: colors.brand,
    headerTint: '#FFFFFF',
    tabBarBackground: colors.light.surface,
    tabBarActiveTint: colors.brand,
    tabBarInactiveTint: colors.light.textSecondary,
    borderColor: '#E5E7EB',
    contentBackground: colors.light.background,
  };
}
