import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getCachedCourses, refreshCourseCache } from '@/lib/offline/courseCache';
import { getActiveRound, setActiveRound } from '@/lib/offline/activeRound';
import { generateLocalId } from '@/lib/offline/localId';
import { syncPendingRounds } from '@/lib/hooks/useRoundSync';
import type { ActiveRound, CachedCourse, CachedTeeBox } from '@/lib/offline/types';
import { useRounds } from '@/lib/hooks/useRounds';
import { getCurrentHandicap } from '@/lib/hooks/useProfile';
import { AutoWidthButton } from '@/components/ui/AutoWidthButton';

export default function RoundsScreen() {
  const router = useRouter();
  const { rounds, loading: roundsLoading, error: roundsError, refetch: refetchRounds } = useRounds();

  const [courses, setCourses] = useState<CachedCourse[]>([]);
  const [activeRoundCourseName, setActiveRoundCourseName] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  // Course whose tee options are expanded (multi-tee courses need a pick first).
  const [teePickerCourseId, setTeePickerCourseId] = useState<string | null>(null);

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

  function handleCoursePress(course: CachedCourse) {
    if (course.tees.length === 1) {
      startRound(course, course.tees[0]);
      return;
    }
    setTeePickerCourseId((prev) => (prev === course.id ? null : course.id));
  }

  async function startRound(course: CachedCourse, tee: CachedTeeBox) {
    const handicap = await getCurrentHandicap();
    const newRound: ActiveRound = {
      localId: generateLocalId(),
      course_id: course.id,
      course_name: course.name,
      tee_box_id: tee.id,
      tee_name: tee.name,
      hole_count: course.hole_count,
      course_rating: tee.course_rating,
      slope_rating: tee.slope_rating,
      total_par: course.total_par,
      total_length_meters: tee.total_length_meters,
      handicap_at_start: handicap,
      date_played: new Date().toISOString().slice(0, 10),
      notes: '',
      currentHoleIndex: -1,
      holeLogs: course.holes.map((h, i) => ({
        hole_number: h.hole_number,
        par: h.par,
        length_meters: tee.lengths[i] ?? null,
        stroke_index: h.stroke_index,
        hole_id: h.id,
        score: null,
        putts: null,
        fairway_hit: null,
        gir: null,
        gir_overridden: false,
        penalties: 0,
        chip_shots: 0,
      })),
    };
    setTeePickerCourseId(null);
    await setActiveRound(newRound);
    router.push('/round/active');
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <View className="px-4 pt-4">
        <Text className="text-xl font-semibold text-text-primary dark:text-text-primary-dark">Rounds</Text>
      </View>

      {activeRoundCourseName && (
        <Pressable
          testID="resume-round-banner"
          onPress={() => router.push('/round/active')}
          className="mx-4 mt-3 rounded-xl bg-accent-gold/15 px-4 py-3 dark:bg-accent-gold-dark/15"
        >
          <Text className="font-medium text-text-primary dark:text-text-primary-dark">
            Round in progress at {activeRoundCourseName} — Resume
          </Text>
        </Pressable>
      )}

      <View className="px-4 pt-4">
        <Text className="mb-2 text-sm font-medium text-text-primary dark:text-text-primary-dark">
          Start a round
        </Text>
        {courses.length === 0 ? (
          <Text className="text-text-secondary dark:text-text-secondary-dark">No courses available yet.</Text>
        ) : (
          <View>
            <View className="flex-row flex-wrap">
              {courses.map((course) => (
                <AutoWidthButton
                  key={course.id}
                  testID={`start-round-${course.id}`}
                  label={course.name}
                  onPress={() => handleCoursePress(course)}
                  containerClassName="mb-3 mr-3"
                />
              ))}
            </View>
            {teePickerCourseId &&
              (() => {
                const course = courses.find((c) => c.id === teePickerCourseId);
                if (!course) return null;
                return (
                  <View className="mb-1">
                    <Text className="mb-2 text-sm text-text-secondary dark:text-text-secondary-dark">
                      Choose a tee at {course.name}
                    </Text>
                    <View className="flex-row flex-wrap">
                      {course.tees.map((tee) => (
                        <AutoWidthButton
                          key={tee.id}
                          testID={`start-round-${course.id}-tee-${tee.id}`}
                          label={`${tee.name} · ${tee.total_length_meters ?? '-'} m`}
                          onPress={() => startRound(course, tee)}
                          containerClassName="mb-3 mr-3"
                        />
                      ))}
                    </View>
                  </View>
                );
              })()}
          </View>
        )}
      </View>

      <View className="mt-2 px-4 pt-2">
        <Text className="mb-2 text-sm font-medium text-text-primary dark:text-text-primary-dark">History</Text>
      </View>

      {roundsLoading ? (
        <ActivityIndicator testID="rounds-history-loading" />
      ) : roundsError ? (
        <Text className="px-4 text-red-600">{roundsError}</Text>
      ) : (
        <FlatList
          className="px-4"
          data={rounds}
          keyExtractor={(item) => item.id}
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
      )}
    </View>
  );
}
