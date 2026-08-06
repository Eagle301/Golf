import '../global.css';
import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useAuthSession } from '@/lib/hooks/useAuthSession';
import { useRoundSync } from '@/lib/hooks/useRoundSync';
import { useThemePreference } from '@/lib/hooks/useThemePreference';
import { getNavigationColors } from '@/lib/theme/navigationColors';
import { SignInScreen } from '@/components/auth/SignInScreen';

export default function RootLayout() {
  const { ready, session } = useAuthSession();
  useRoundSync();
  useThemePreference();
  const { colorScheme } = useColorScheme();
  const nav = getNavigationColors(colorScheme);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator testID="auth-loading" />
      </View>
    );
  }

  if (!session) {
    return <SignInScreen />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: nav.headerBackground,
          borderBottomColor: nav.borderColor,
        },
        headerTintColor: nav.headerTint,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: nav.contentBackground },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="round/[id]" options={{ title: 'Round' }} />
      <Stack.Screen name="round/scorecard" options={{ title: 'Scorecard' }} />
      <Stack.Screen name="course/[id]" options={{ title: 'Course' }} />
      <Stack.Screen name="routine/[id]" options={{ title: 'Routine' }} />
      <Stack.Screen name="session/new" options={{ title: 'Training Session' }} />
      <Stack.Screen name="session/[id]" options={{ title: 'Session Details' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}
