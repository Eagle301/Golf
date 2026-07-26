import '../global.css';
import { Stack } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { useColorScheme } from 'nativewind';
import { useDevAutoSignIn } from '@/lib/hooks/useDevAutoSignIn';
import { useRoundSync } from '@/lib/hooks/useRoundSync';
import { useThemePreference } from '@/lib/hooks/useThemePreference';
import { getNavigationColors } from '@/lib/theme/navigationColors';

export default function RootLayout() {
  const { ready, error } = useDevAutoSignIn();
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

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark">
        <Text className="text-center text-red-600">Sign-in failed: {error}</Text>
      </View>
    );
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
    </Stack>
  );
}
