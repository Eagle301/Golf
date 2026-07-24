import '../global.css';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="round/[id]" options={{ title: 'Round' }} />
      <Stack.Screen name="course/[id]" options={{ title: 'Course' }} />
    </Stack>
  );
}
