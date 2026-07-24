import { useCallback, useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { getCachedCourses, refreshCourseCache } from '@/lib/offline/courseCache';
import { getActiveRound, setActiveRound } from '@/lib/offline/activeRound';
import { generateLocalId } from '@/lib/offline/localId';
import type { ActiveRound, CachedCourse } from '@/lib/offline/types';
import { useRounds } from '@/lib/hooks/useRounds';
import { getCurrentHandicap } from '@/lib/hooks/useProfile';

export default function RoundsScreen() {
  const router = useRouter();
  const { rounds, loading: roundsLoading, error: roundsError } = useRounds();

  const [courses, setCourses] = useState<CachedCourse[]>([]);
  const [activeRoundCourseName, setActiveRoundCourseName] = useState<string | null>(null);

  const loadCourses = useCallback(async () => {
    setCourses(await getCachedCourses());
    refreshCourseCache().then(() => getCachedCourses().then(setCourses));
  }, []);

  const loadActiveRound = useCallback(async () => {
    const round = await getActiveRound();
    setActiveRoundCourseName(round?.course_name ?? null);
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  useFocusEffect(
    useCallback(() => {
      loadActiveRound();
    }, [loadActiveRound])
  );

  async function startRound(course: CachedCourse) {
    const handicap = await getCurrentHandicap();
    const newRound: ActiveRound = {
      localId: generateLocalId(),
      course_id: course.id,
      course_name: course.name,
      hole_count: course.hole_count,
      course_rating: course.course_rating,
      slope_rating: course.slope_rating,
      total_par: course.total_par,
      handicap_at_start: handicap,
      date_played: new Date().toISOString().slice(0, 10),
      notes: '',
      currentHoleIndex: 0,
      holeLogs: course.holes.map((h) => ({
        hole_number: h.hole_number,
        par: h.par,
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
    await setActiveRound(newRound);
    router.push('/round/active');
  }

  return (
    <View className="flex-1 bg-white">
      <View className="px-4 pt-4">
        <Text className="text-xl font-semibold">Rounds</Text>
      </View>

      {activeRoundCourseName && (
        <Pressable
          testID="resume-round-banner"
          onPress={() => router.push('/round/active')}
          className="mx-4 mt-3 rounded bg-yellow-100 px-4 py-3"
        >
          <Text className="font-medium text-yellow-900">
            Round in progress at {activeRoundCourseName} — Resume
          </Text>
        </Pressable>
      )}

      <View className="px-4 pt-4">
        <Text className="mb-2 text-sm font-medium text-gray-700">Start a round</Text>
        {courses.length === 0 ? (
          <Text className="text-gray-500">No courses available yet.</Text>
        ) : (
          <View className="flex-row flex-wrap">
            {courses.map((course) => (
              <Pressable
                key={course.id}
                testID={`start-round-${course.id}`}
                onPress={() => startRound(course)}
                className="mb-2 mr-2 rounded bg-green-600 px-3 py-2"
              >
                <Text className="text-white">{course.name}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      <View className="mt-2 px-4 pt-2">
        <Text className="mb-2 text-sm font-medium text-gray-700">History</Text>
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
          renderItem={({ item }) => (
            <Pressable
              testID={`round-history-${item.id}`}
              onPress={() => router.push({ pathname: '/round/scorecard', params: { id: item.id } })}
              className="border-b border-gray-200 py-3"
            >
              <Text className="text-base font-medium">{item.courses?.name ?? 'Unknown course'}</Text>
              <Text className="text-sm text-gray-500">
                {item.date_played} · Score {item.total_score ?? '-'} · Putts {item.total_putts ?? '-'}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
