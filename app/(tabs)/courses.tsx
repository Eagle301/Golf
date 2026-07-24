import { View, Text, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useCourses } from '@/lib/hooks/useCourses';

export default function CoursesScreen() {
  const { courses, loading, error } = useCourses();
  const router = useRouter();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator testID="courses-loading" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-red-600">{error}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 pt-4">
        <Text className="text-xl font-semibold">Courses</Text>
        <Pressable
          testID="add-course-button"
          onPress={() => router.push('/course/new')}
          className="h-9 w-9 items-center justify-center rounded-full bg-green-600"
        >
          <Text className="text-lg text-white">+</Text>
        </Pressable>
      </View>

      {courses.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-4 text-center text-gray-500">No courses yet.</Text>
          <Pressable
            testID="add-first-course-button"
            onPress={() => router.push('/course/new')}
            className="rounded bg-green-600 px-4 py-2"
          >
            <Text className="text-white">Add your first course</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          className="px-4"
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              testID={`course-row-${item.id}`}
              onPress={() => router.push(`/course/${item.id}`)}
              className="border-b border-gray-200 py-3"
            >
              <Text className="text-base font-medium">{item.name}</Text>
              <Text className="text-sm text-gray-500">
                Par {item.total_par ?? '-'} · {item.total_length_meters ?? '-'} m
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
