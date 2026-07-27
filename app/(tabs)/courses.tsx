import { useCallback } from 'react';
import { View, Text, FlatList, Pressable, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCourses } from '@/lib/hooks/useCourses';
import { Button } from '@/components/ui/Button';

export default function CoursesScreen() {
  const { courses, loading, error, refetch } = useCourses();
  const router = useRouter();

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
        <Pressable
          testID="add-course-button"
          onPress={() => router.push('/course/new')}
          className="h-9 w-9 items-center justify-center rounded-full bg-brand dark:bg-accent-gold-dark"
        >
          <Text className="text-lg text-white dark:text-gray-900">+</Text>
        </Pressable>
      </View>

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
                Par {item.total_par ?? '-'} · {item.total_length_meters ?? '-'} m
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
