import { useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { DrillProgressChart } from '@/components/training/DrillProgressChart';
import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import { useDrillProgress } from '@/lib/hooks/useDrillProgress';

export default function RoutineProgressScreen() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const { routineName, drills, loading, error, refetch } = useDrillProgress(routineId);

  // Refetch when the screen regains focus, so a session logged and saved
  // moments ago shows up without leaving and re-entering the app.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  let body: React.ReactNode;

  if (loading) {
    body = (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator testID="drill-progress-loading" />
      </View>
    );
  } else if (error) {
    body = (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark">
        <Text className="text-center text-red-600">{error}</Text>
      </View>
    );
  } else if (drills.length === 0) {
    body = (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark">
        <Text
          testID="drill-progress-empty"
          className="text-center text-text-secondary dark:text-text-secondary-dark"
        >
          This routine has no drills yet.
        </Text>
      </View>
    );
  } else {
    body = (
      <ScrollView
        className="flex-1 bg-background px-4 pt-4 dark:bg-background-dark"
        contentContainerClassName="pb-8"
        testID="drill-progress-list"
      >
        {drills.map((drill) => (
          <DrillProgressChart key={drill.drillId} drill={drill} />
        ))}
      </ScrollView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: routineName ? `${routineName} · Progress` : 'Progress',
          headerLeft: () => <HeaderBackButton fallback="/training" />,
        }}
      />
      {body}
    </>
  );
}
