import '../global.css';
import { Stack } from 'expo-router';
import { View, Text, ActivityIndicator } from 'react-native';
import { useDevAutoSignIn } from '@/lib/hooks/useDevAutoSignIn';
import { useRoundSync } from '@/lib/hooks/useRoundSync';

export default function RootLayout() {
  const { ready, error } = useDevAutoSignIn();
  useRoundSync();

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator testID="auth-loading" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-red-600">Sign-in failed: {error}</Text>
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="round/[id]" options={{ title: 'Round' }} />
      <Stack.Screen name="round/scorecard" options={{ title: 'Scorecard' }} />
      <Stack.Screen name="course/[id]" options={{ title: 'Course' }} />
    </Stack>
  );
}
