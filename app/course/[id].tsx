import { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { HoleRow } from '@/components/course/HoleRow';
import {
  useCourse,
  saveCourse,
  deleteCourse,
  CourseValidationError,
  type HoleInput,
} from '@/lib/hooks/useCourses';

export default function CourseFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { course, holes: initialHoles, loading, error: loadError } = useCourse(id);

  const [name, setName] = useState('');
  const [holes, setHoles] = useState<HoleInput[]>(initialHoles);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(course.name);
  }, [course.name]);

  useEffect(() => {
    setHoles(initialHoles);
  }, [initialHoles]);

  const isValid =
    name.trim().length > 0 &&
    holes.every((h) => (h.par === 3 || h.par === 4 || h.par === 5) && !!h.length_meters && h.length_meters > 0);

  const totalPar = holes.reduce((sum, h) => sum + (h.par ?? 0), 0);
  const totalLength = holes.reduce((sum, h) => sum + (h.length_meters ?? 0), 0);

  function updateHole(updated: HoleInput) {
    setHoles((prev) => prev.map((h) => (h.hole_number === updated.hole_number ? updated : h)));
  }

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    try {
      await saveCourse({ id: course.id ?? undefined, name, holes });
      router.back();
    } catch (err) {
      if (err instanceof CourseValidationError) {
        setSaveError(err.message);
      } else {
        setSaveError(err instanceof Error ? err.message : 'Failed to save course.');
      }
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert('Delete course?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteCourse(course.id!);
            router.back();
          } catch (err) {
            setSaveError(err instanceof Error ? err.message : 'Failed to delete course.');
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator testID="course-form-loading" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-red-600">{loadError}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-4" testID="course-form">
      <Text className="mb-1 text-sm font-medium text-gray-700">Course name</Text>
      <TextInput
        testID="course-name-input"
        className="mb-4 rounded border border-gray-300 px-3 py-2"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Pebble Beach"
      />

      {holes.map((hole) => (
        <HoleRow key={hole.hole_number} hole={hole} onChange={updateHole} />
      ))}

      <Text className="my-3 text-sm text-gray-600">
        Total par {totalPar} · {totalLength} m
      </Text>

      {saveError && <Text className="mb-3 text-red-600">{saveError}</Text>}

      <Pressable
        testID="save-course-button"
        disabled={!isValid || saving}
        onPress={handleSave}
        className={`mb-3 items-center rounded py-3 ${isValid && !saving ? 'bg-green-600' : 'bg-gray-300'}`}
      >
        <Text className="font-medium text-white">{saving ? 'Saving...' : 'Save'}</Text>
      </Pressable>

      {course.id && (
        <Pressable
          testID="delete-course-button"
          onPress={handleDelete}
          className="mb-8 items-center rounded border border-red-600 py-3"
        >
          <Text className="font-medium text-red-600">Delete Course</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
