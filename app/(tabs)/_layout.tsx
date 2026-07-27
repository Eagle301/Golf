import { Pressable } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'nativewind';
import { getNavigationColors } from '@/lib/theme/navigationColors';
import { getTabIconName } from '@/lib/theme/tabIcons';

export default function TabsLayout() {
  const { colorScheme } = useColorScheme();
  const router = useRouter();
  const nav = getNavigationColors(colorScheme);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: nav.tabBarActiveTint,
        tabBarInactiveTintColor: nav.tabBarInactiveTint,
        tabBarStyle: { backgroundColor: nav.tabBarBackground, borderTopColor: nav.borderColor },
        headerStyle: { backgroundColor: nav.headerBackground },
        headerTintColor: nav.headerTint,
        headerShadowVisible: false,
        tabBarIcon: ({ color, focused, size }) => (
          <Ionicons name={getTabIconName(route.name, focused)} color={color} size={size} />
        ),
        headerRight: () => (
          <Pressable
            testID="settings-button"
            onPress={() => router.push('/settings')}
            className="mr-4"
            hitSlop={8}
          >
            <Ionicons name="settings-outline" color={nav.headerTint} size={22} />
          </Pressable>
        ),
      })}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="rounds" options={{ title: 'Rounds' }} />
      <Tabs.Screen name="courses" options={{ title: 'Courses' }} />
    </Tabs>
  );
}
