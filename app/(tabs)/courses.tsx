import { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCourses } from '@/lib/hooks/useCourses';
import { Button } from '@/components/ui/Button';
import { parseCourseCsv } from '@/lib/csv/parseCourseCsv';

export default function CoursesScreen() {
  const { courses, loading, error, refetch } = useCourses();
  const router = useRouter();
  const [importError, setImportError] = useState<string | null>(null);

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

      {courses.length === 0 ? (
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
    </View>
  );
}
