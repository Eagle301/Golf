import { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Modal,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCourses } from '@/lib/hooks/useCourses';
import { Button } from '@/components/ui/Button';
import { CourseMap } from '@/components/course/CourseMap';
import { parseCourseCsv } from '@/lib/csv/parseCourseCsv';
import { getCachedCourses } from '@/lib/offline/courseCache';
import { setActiveRound } from '@/lib/offline/activeRound';
import { generateLocalId } from '@/lib/offline/localId';
import { buildActiveRound } from '@/lib/offline/buildActiveRound';
import { getCurrentHandicap } from '@/lib/hooks/useProfile';
import type { CachedCourse, CachedTeeBox } from '@/lib/offline/types';

export default function CoursesScreen() {
  const { courses, loading, error, refetch } = useCourses();
  const router = useRouter();
  const [importError, setImportError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'map'>('list');
  const [teePickerCourse, setTeePickerCourse] = useState<CachedCourse | null>(null);

  async function startRound(course: CachedCourse, tee: CachedTeeBox) {
    const handicap = await getCurrentHandicap();
    const round = buildActiveRound(course, tee, {
      localId: generateLocalId(),
      handicap,
      datePlayed: new Date().toISOString().slice(0, 10),
    });
    setTeePickerCourse(null);
    await setActiveRound(round);
    router.push('/round/active');
  }

  async function handlePlayCourse(courseId: string) {
    const cached = (await getCachedCourses()).find((c) => c.id === courseId);
    if (!cached || cached.tees.length === 0) return;
    if (cached.tees.length === 1) {
      await startRound(cached, cached.tees[0]);
      return;
    }
    setTeePickerCourse(cached);
  }

  function handleImportPress() {
    if (Platform.OS !== 'web') return;

    setImportError(null);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = parseCourseCsv(String(reader.result ?? ''));
          router.push({ pathname: '/course/[id]', params: { id: 'new', importJson: JSON.stringify(parsed) } });
        } catch (err) {
          setImportError(err instanceof Error ? err.message : 'Failed to parse CSV file.');
        }
      };
      reader.onerror = () => setImportError('Failed to read the file.');
      reader.readAsText(file);
    };
    input.click();
  }

  // Refetch every time this tab regains focus (e.g. after adding/editing a
  // course) so the list doesn't require an app restart to catch up.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator testID="courses-loading" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark">
        <Text className="text-center text-red-600">{error}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background dark:bg-background-dark">
      <View className="flex-row items-center justify-between px-4 pt-4">
        <Text className="text-xl font-semibold text-text-primary dark:text-text-primary-dark">Courses</Text>
        <View className="flex-row items-center gap-3">
          <Pressable
            testID="courses-view-toggle"
            onPress={() => setView((prev) => (prev === 'list' ? 'map' : 'list'))}
            className="rounded-xl bg-brand px-5 py-2 dark:bg-accent-gold-dark"
          >
            <Text className="text-base font-semibold text-white dark:text-gray-900">
              {view === 'list' ? 'Map' : 'List'}
            </Text>
          </Pressable>
          {Platform.OS === 'web' && (
            <Pressable testID="import-csv-button" onPress={handleImportPress}>
              <Text className="font-medium text-brand dark:text-accent-gold-dark">Import CSV</Text>
            </Pressable>
          )}
          <Pressable
            testID="add-course-button"
            onPress={() => router.push('/course/new')}
            className="h-9 w-9 items-center justify-center rounded-full bg-brand dark:bg-accent-gold-dark"
          >
            <Text className="text-lg text-white dark:text-gray-900">+</Text>
          </Pressable>
        </View>
      </View>

      {importError && (
        <Text testID="import-csv-error" className="mx-4 mt-2 text-red-600">
          {importError}
        </Text>
      )}

      {view === 'map' ? (
        (() => {
          const markers = courses
            .filter((c) => c.latitude != null && c.longitude != null)
            .map((c) => ({
              id: c.id,
              name: c.name,
              club: c.club,
              latitude: c.latitude as number,
              longitude: c.longitude as number,
            }));
          const missing = courses.length - markers.length;
          return (
            <View className="mt-3 flex-1">
              <CourseMap
                markers={markers}
                onPlayCourse={handlePlayCourse}
                onEditCourse={(id) => router.push(`/course/${id}`)}
              />
              {missing > 0 && (
                <Text className="px-4 py-2 text-sm text-text-secondary dark:text-text-secondary-dark">
                  {missing} course{missing === 1 ? ' has' : 's have'} no location yet.
                </Text>
              )}
            </View>
          );
        })()
      ) : courses.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-4 text-center text-text-secondary dark:text-text-secondary-dark">
            No courses yet.
          </Text>
          <Button
            testID="add-first-course-button"
            label="Add your first course"
            onPress={() => router.push('/course/new')}
            containerClassName="px-6"
          />
        </View>
      ) : (
        <FlatList
          className="px-4"
          showsVerticalScrollIndicator={false}
          data={courses}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl testID="courses-refresh-control" refreshing={loading} onRefresh={refetch} />
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`course-row-${item.id}`}
              onPress={() => router.push(`/course/${item.id}`)}
              className="border-b border-gray-200 py-3 dark:border-border-dark"
            >
              <Text className="text-base font-medium text-text-primary dark:text-text-primary-dark">
                {item.name}
              </Text>
              <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
                Par {item.total_par ?? '-'} ·{' '}
                {item.tee_boxes.length > 0
                  ? item.tee_boxes.map((t) => t.name).join(' / ')
                  : 'No tees'}
              </Text>
            </Pressable>
          )}
        />
      )}

      <Modal
        visible={teePickerCourse !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setTeePickerCourse(null)}
      >
        <Pressable
          testID="map-tee-backdrop"
          className="flex-1 items-center justify-center bg-black/50 px-6"
          onPress={() => setTeePickerCourse(null)}
        >
          <View className="w-full rounded-2xl bg-background p-4 dark:bg-background-dark">
            <Text className="mb-3 text-lg font-semibold text-text-primary dark:text-text-primary-dark">
              Choose a tee at {teePickerCourse?.name}
            </Text>
            {teePickerCourse?.tees.map((tee) => (
              <Pressable
                key={tee.id}
                testID={`map-tee-${tee.id}`}
                onPress={() => startRound(teePickerCourse, tee)}
                className="mb-2 rounded-lg bg-brand/10 px-4 py-3 dark:bg-accent-gold-dark/10"
              >
                <Text className="font-medium text-text-primary dark:text-text-primary-dark">
                  {tee.name} · {tee.total_length_meters ?? '-'} m
                  {tee.course_rating != null && tee.slope_rating != null
                    ? ` · CR ${tee.course_rating}/${tee.slope_rating}`
                    : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
