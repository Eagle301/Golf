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

export function getNavigationColors(
  scheme: 'light' | 'dark' | undefined | null
): NavigationColors {
  if (scheme === 'dark') {
    return {
      headerBackground: colors.dark.surface,
      headerTint: colors.dark.textPrimary,
      tabBarBackground: colors.dark.surface,
      tabBarActiveTint: colors.dark.accentGold,
      tabBarInactiveTint: colors.dark.textSecondary,
      borderColor: colors.dark.border,
      contentBackground: colors.dark.background,
    };
  }

  return {
    headerBackground: colors.light.surface,
    headerTint: colors.light.textPrimary,
    tabBarBackground: colors.light.surface,
    tabBarActiveTint: colors.brand,
    tabBarInactiveTint: colors.light.textSecondary,
    borderColor: '#E5E7EB',
    contentBackground: colors.light.background,
  };
}
