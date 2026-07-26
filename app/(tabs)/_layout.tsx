import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { getNavigationColors } from '@/lib/theme/navigationColors';
import { getTabIconName } from '@/lib/theme/tabIcons';

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const nav = getNavigationColors(colorScheme);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: nav.tabBarActiveTint,
        tabBarInactiveTintColor: nav.tabBarInactiveTint,
        tabBarStyle: { backgroundColor: nav.tabBarBackground },
        headerStyle: { backgroundColor: nav.headerBackground },
        headerTintColor: nav.headerTint,
        tabBarIcon: ({ color, focused, size }) => (
          <Ionicons name={getTabIconName(route.name, focused)} color={color} size={size} />
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="rounds" options={{ title: 'Rounds' }} />
      <Tabs.Screen name="courses" options={{ title: 'Courses' }} />
    </Tabs>
  );
}
