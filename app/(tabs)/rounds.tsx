import { useCallback, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator, RefreshControl, Modal, ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getCachedCourses, refreshCourseCache } from '@/lib/offline/courseCache';
import { getActiveRound, setActiveRound } from '@/lib/offline/activeRound';
import { generateLocalId } from '@/lib/offline/localId';
import { syncPendingRounds } from '@/lib/hooks/useRoundSync';
import { buildActiveRound } from '@/lib/offline/buildActiveRound';
import type { CachedCourse, CachedTeeBox } from '@/lib/offline/types';
import { useRounds } from '@/lib/hooks/useRounds';
import { getCurrentHandicap } from '@/lib/hooks/useProfile';
import { countRoundsByCourse, filterCoursesByName } from '@/lib/courseStartList';
import { CourseStartList } from '@/components/round/CourseStartList';

export default function RoundsScreen() {
  const router = useRouter();
  const { rounds, loading: roundsLoading, error: roundsError, refetch: refetchRounds } = useRounds();

  const [courses, setCourses] = useState<CachedCourse[]>([]);
  const [activeRoundCourseName, setActiveRoundCourseName] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [coursePickerOpen, setCoursePickerOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');

  function openCoursePicker() {
    setCourseSearch('');
    setCoursePickerOpen(true);
  }

  const loadCourses = useCallback(async () => {
    setCourses(await getCachedCourses());
    refreshCourseCache().then(() => getCachedCourses().then(setCourses));
  }, []);

  const loadActiveRound = useCallback(async () => {
    const round = await getActiveRound();
    setActiveRoundCourseName(round?.course_name ?? null);
  }, []);

  // Refetch every time this tab regains focus (e.g. after finishing a round,
  // or adding/editing a course elsewhere) so nothing requires an app restart
  // to catch up.
  useFocusEffect(
    useCallback(() => {
      loadCourses();
      loadActiveRound();
      refetchRounds();
    }, [loadCourses, loadActiveRound, refetchRounds])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await syncPendingRounds();
    await Promise.all([loadCourses(), loadActiveRound(), refetchRounds()]);
    setRefreshing(false);
  }

  async function startRound(course: CachedCourse, tee: CachedTeeBox) {
    const handicap = await getCurrentHandicap();
    const newRound = buildActiveRound(course, tee, {
      localId: generateLocalId(),
      handicap,
      datePlayed: new Date().toISOString().slice(0, 10),
    });
    setCoursePickerOpen(false);
    await setActiveRound(newRound);
    router.push('/round/active');
  }

  // The start section renders as the history list's header so the whole
  // screen scrolls as one — 13+ course rows would otherwise pin the history
  // list into a sliver at the bottom.
  const listHeader = (
    <View>
      <View className="pt-4">
        <Text className="text-xl font-semibold text-text-primary dark:text-text-primary-dark">Rounds</Text>
      </View>

      {activeRoundCourseName && (
        <Pressable
          testID="resume-round-banner"
          onPress={() => router.push('/round/active')}
          className="mt-3 rounded-xl bg-accent-gold/15 px-4 py-3 dark:bg-accent-gold-dark/15"
        >
          <Text className="font-medium text-text-primary dark:text-text-primary-dark">
            Round in progress at {activeRoundCourseName} — Resume
          </Text>
        </Pressable>
      )}

      <View className="pt-4">
        {courses.length === 0 ? (
          <Text className="text-text-secondary dark:text-text-secondary-dark">No courses available yet.</Text>
        ) : (
          <Pressable
            testID="start-round-button"
            onPress={openCoursePicker}
            className="items-center rounded-2xl bg-brand py-5 dark:bg-accent-gold-dark"
          >
            <Text className="text-lg font-semibold text-white dark:text-gray-900">Start a round</Text>
          </Pressable>
        )}
      </View>

      <View className="mt-2 pt-2">
        <Text className="mb-2 text-sm font-medium text-text-primary dark:text-text-primary-dark">History</Text>
      </View>

      {roundsLoading && <ActivityIndicator testID="rounds-history-loading" />}
      {roundsError && <Text className="text-red-600">{roundsError}</Text>}
    </View>
  );

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <FlatList
        className="px-4"
        showsVerticalScrollIndicator={false}
        data={roundsLoading || roundsError ? [] : rounds}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl testID="rounds-refresh-control" refreshing={refreshing} onRefresh={handleRefresh} />
        }
        renderItem={({ item }) => (
          <Pressable
            testID={`round-history-${item.id}`}
            onPress={() => router.push({ pathname: '/round/scorecard', params: { id: item.id } })}
            className="border-b border-gray-200 py-3 dark:border-border-dark"
          >
            <Text className="text-base font-medium text-text-primary dark:text-text-primary-dark">
              {item.courses?.name ?? 'Unknown course'}
            </Text>
            <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
              {item.date_played} · Score {item.total_score ?? '-'} · Putts {item.total_putts ?? '-'}
            </Text>
          </Pressable>
        )}
      />

      <Modal
        visible={coursePickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCoursePickerOpen(false)}
      >
        <View className="flex-1 bg-black/50 px-4 pb-8 pt-3">
          <View className="flex-1 rounded-2xl bg-background px-4 pb-6 pt-4 dark:bg-background-dark">
            <View className="mb-2 flex-row items-center justify-between">
              <Text className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">
                Choose a course
              </Text>
              <Pressable
                testID="start-round-close"
                onPress={() => setCoursePickerOpen(false)}
                className="h-9 w-9 items-center justify-center rounded-full bg-gray-200 dark:bg-surface-dark"
              >
                <Text className="text-base text-text-primary dark:text-text-primary-dark">✕</Text>
              </Pressable>
            </View>
            <TextInput
              testID="course-search-input"
              className="mb-3 rounded-xl border border-gray-300 px-4 py-2 text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
              placeholder="Search courses…"
              value={courseSearch}
              onChangeText={setCourseSearch}
              autoCorrect={false}
            />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <CourseStartList
                courses={filterCoursesByName(courses, courseSearch)}
                roundCounts={countRoundsByCourse(rounds)}
                onStart={startRound}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
