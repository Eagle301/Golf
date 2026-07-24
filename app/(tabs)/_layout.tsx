import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="rounds" options={{ title: 'Rounds' }} />
      <Tabs.Screen name="courses" options={{ title: 'Courses' }} />
    </Tabs>
  );
}
