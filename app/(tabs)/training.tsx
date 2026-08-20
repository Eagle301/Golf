import { useCallback, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useRoutines, type RoutineListItem } from '@/lib/hooks/useRoutines';
import { useTrainingSessions } from '@/lib/hooks/useTrainingSessions';
import { useLeaks } from '@/lib/hooks/useLeaks';
import { LeaksCard } from '@/components/training/LeaksCard';
import { TRAINING_CATEGORIES, TRAINING_CATEGORY_LABELS } from '@/lib/training/categories';
import type { TrainingCategory } from '@/types/database';

type IconName = keyof typeof Ionicons.glyphMap;

const CATEGORY_ICONS: Record<TrainingCategory, IconName> = {
  putts: 'radio-button-on-outline',
  short_game: 'flag-outline',
  full_swing: 'golf-outline',
  strategy: 'bulb-outline',
};

function routineCountLabel(count: number): string {
  return `${count} routine${count === 1 ? '' : 's'}`;
}

export default function TrainingScreen() {
  const router = useRouter();
  const { routines, loading: routinesLoading, error: routinesError, refetch: refetchRoutines } = useRoutines();
  const { sessions, loading: sessionsLoading, error: sessionsError, refetch: refetchSessions } =
    useTrainingSessions();
  const { leaks, refetch: refetchLeaks } = useLeaks();
  const [expandedCategory, setExpandedCategory] = useState<TrainingCategory | null>(null);

  useFocusEffect(
    useCallback(() => {
      refetchRoutines();
      refetchSessions();
      refetchLeaks();
    }, [refetchRoutines, refetchSessions, refetchLeaks])
  );

  function routinesFor(category: TrainingCategory): RoutineListItem[] {
    return routines.filter((r) => r.category === category);
  }

  function renderRoutinesList(category: TrainingCategory) {
    const categoryRoutines = routinesFor(category);
    return (
      <View className="mt-3" testID={`category-routines-${category}`}>
        {categoryRoutines.length === 0 ? (
          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">No routines yet.</Text>
        ) : (
          categoryRoutines.map((routine) => (
            <View
              key={routine.id}
              testID={`routine-card-${routine.id}`}
              className="mb-2 flex-row items-center rounded-lg bg-background px-3 py-2 dark:bg-background-dark"
            >
              <Pressable
                testID={`start-session-${routine.id}`}
                onPress={() => router.push({ pathname: '/session/new', params: { routineId: routine.id } })}
                className="flex-1"
              >
                <Text className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                  {routine.name}
                </Text>
              </Pressable>
              <Pressable
                testID={`routine-progress-${routine.id}`}
                onPress={() => router.push(`/progress/${routine.id}`)}
                className="mr-1 p-1"
                hitSlop={8}
              >
                <Ionicons name="trending-up-outline" size={16} color="#4B5563" />
              </Pressable>
              <Pressable
                testID={`edit-routine-${routine.id}`}
                onPress={() => router.push(`/routine/${routine.id}`)}
                className="p-1"
                hitSlop={8}
              >
                <Ionicons name="pencil-outline" size={16} color="#4B5563" />
              </Pressable>
            </View>
          ))
        )}
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerClassName="pb-8"
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-row items-center justify-between px-4 pt-4">
        <Text className="text-xl font-semibold text-text-primary dark:text-text-primary-dark">Training</Text>
        <Pressable
          testID="add-routine-button"
          onPress={() => router.push('/routine/new')}
          className="h-9 w-9 items-center justify-center rounded-full bg-brand dark:bg-accent-gold-dark"
        >
          <Text className="text-lg text-white dark:text-gray-900">+</Text>
        </Pressable>
      </View>

      {routinesLoading ? (
        <ActivityIndicator testID="routines-loading" className="mt-4" />
      ) : routinesError ? (
        <Text className="mt-4 px-4 text-red-600">{routinesError}</Text>
      ) : expandedCategory === null ? (
        // Collapsed: a 2x2 grid, each row a flex-1 pair (same technique as
        // the dashboard's paired stat cards) so the two tiles split the full
        // row width evenly with only a small fixed gap between them, rather
        // than a percentage-width layout that leaves slack on either side.
        <View className="mt-4 px-4">
          <View className="flex-row gap-2">
            {TRAINING_CATEGORIES.slice(0, 2).map((category) => (
              <Pressable
                key={category}
                testID={`category-card-${category}`}
                onPress={() => setExpandedCategory(category)}
                className="flex-1 items-center rounded-2xl bg-surface py-7 shadow-sm dark:border dark:border-border-dark dark:bg-surface-dark dark:shadow-none"
              >
                <Ionicons name={CATEGORY_ICONS[category]} size={28} color="#166534" />
                <Text className="mt-2 text-base font-semibold text-text-primary dark:text-text-primary-dark">
                  {TRAINING_CATEGORY_LABELS[category]}
                </Text>
                <Text className="mt-1 text-xs text-text-secondary dark:text-text-secondary-dark">
                  {routineCountLabel(routinesFor(category).length)}
                </Text>
              </Pressable>
            ))}
          </View>
          <View className="mt-2 flex-row gap-2">
            {TRAINING_CATEGORIES.slice(2, 4).map((category) => (
              <Pressable
                key={category}
                testID={`category-card-${category}`}
                onPress={() => setExpandedCategory(category)}
                className="flex-1 items-center rounded-2xl bg-surface py-7 shadow-sm dark:border dark:border-border-dark dark:bg-surface-dark dark:shadow-none"
              >
                <Ionicons name={CATEGORY_ICONS[category]} size={28} color="#166534" />
                <Text className="mt-2 text-base font-semibold text-text-primary dark:text-text-primary-dark">
                  {TRAINING_CATEGORY_LABELS[category]}
                </Text>
                <Text className="mt-1 text-xs text-text-secondary dark:text-text-secondary-dark">
                  {routineCountLabel(routinesFor(category).length)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        // Expanded: the tapped category grows to the full row width with its
        // routines listed underneath, and every other category collapses
        // into a slim header stacked below - tapping the expanded header
        // again (not the routine rows inside it) shrinks it back to the grid.
        <View className="mt-4 px-4">
          <View
            testID={`category-expanded-${expandedCategory}`}
            className="rounded-2xl bg-surface p-4 shadow-sm dark:border dark:border-border-dark dark:bg-surface-dark dark:shadow-none"
          >
            <Pressable
              testID={`category-card-${expandedCategory}`}
              onPress={() => setExpandedCategory(null)}
              className="flex-row items-center justify-between"
            >
              <View className="flex-row items-center">
                <Ionicons name={CATEGORY_ICONS[expandedCategory]} size={22} color="#166534" />
                <Text className="ml-2 text-base font-semibold text-text-primary dark:text-text-primary-dark">
                  {TRAINING_CATEGORY_LABELS[expandedCategory]}
                </Text>
              </View>
              <View className="flex-row items-center">
                <Text className="mr-2 text-xs text-text-secondary dark:text-text-secondary-dark">
                  {routineCountLabel(routinesFor(expandedCategory).length)}
                </Text>
                <Ionicons name="chevron-up" size={18} color="#4B5563" />
              </View>
            </Pressable>
            {renderRoutinesList(expandedCategory)}
          </View>

          <View className="mt-3">
            {TRAINING_CATEGORIES.filter((c) => c !== expandedCategory).map((category) => (
              <Pressable
                key={category}
                testID={`category-card-${category}`}
                onPress={() => setExpandedCategory(category)}
                className="mb-2 flex-row items-center justify-between rounded-xl bg-surface px-4 py-3 shadow-sm dark:border dark:border-border-dark dark:bg-surface-dark dark:shadow-none"
              >
                <View className="flex-row items-center">
                  <Ionicons name={CATEGORY_ICONS[category]} size={18} color="#166534" />
                  <Text className="ml-2 text-sm font-medium text-text-primary dark:text-text-primary-dark">
                    {TRAINING_CATEGORY_LABELS[category]}
                  </Text>
                </View>
                <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">
                  {routineCountLabel(routinesFor(category).length)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {leaks.length > 0 && (
        <View className="mt-4 px-4">
          <LeaksCard leaks={leaks} onPractice={(category) => setExpandedCategory(category)} />
        </View>
      )}

      <View className="mt-2 px-4 pt-2">
        <Text className="mb-2 text-sm font-medium text-text-primary dark:text-text-primary-dark">History</Text>
      </View>

      {sessionsLoading ? (
        <ActivityIndicator testID="sessions-history-loading" />
      ) : sessionsError ? (
        <Text className="px-4 text-red-600">{sessionsError}</Text>
      ) : sessions.length === 0 ? (
        <Text className="px-4 text-text-secondary dark:text-text-secondary-dark">No training logged yet.</Text>
      ) : (
        <View className="px-4">
          {sessions.map((item) => (
            <Pressable
              key={item.id}
              testID={`session-history-${item.id}`}
              onPress={() => router.push(`/session/${item.id}`)}
              className="border-b border-gray-200 py-3 dark:border-border-dark"
            >
              <Text className="text-base font-medium text-text-primary dark:text-text-primary-dark">
                {item.training_routines?.name ?? 'Unknown routine'}
              </Text>
              <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">{item.date_played}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
