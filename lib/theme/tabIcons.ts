import type { Ionicons } from '@expo/vector-icons';

type IconName = keyof typeof Ionicons.glyphMap;

export const TAB_ICON_NAMES: Record<string, { focused: IconName; unfocused: IconName }> = {
  index: { focused: 'home', unfocused: 'home-outline' },
  rounds: { focused: 'list', unfocused: 'list-outline' },
  courses: { focused: 'golf', unfocused: 'golf-outline' },
};

const FALLBACK_ICON: { focused: IconName; unfocused: IconName } = {
  focused: 'help-circle',
  unfocused: 'help-circle-outline',
};

export function getTabIconName(routeName: string, focused: boolean): IconName {
  const icons = TAB_ICON_NAMES[routeName] ?? FALLBACK_ICON;
  return focused ? icons.focused : icons.unfocused;
}
