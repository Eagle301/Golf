import { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { HoleRow } from '@/components/course/HoleRow';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import {
  useCourse,
  saveCourse,
  deleteCourse,
  CourseValidationError,
  type HoleInput,
  type HoleCount,
} from '@/lib/hooks/useCourses';

const HOLE_COUNT_OPTIONS: HoleCount[] = [9, 18];

export default function CourseFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { course, holes: initialHoles, loading, error: loadError } = useCourse(id);

  const [name, setName] = useState('');
  const [holeCount, setHoleCount] = useState<HoleCount>(18);
  const [courseRating, setCourseRating] = useState('');
  const [slopeRating, setSlopeRating] = useState('');
  const [holes, setHoles] = useState<HoleInput[]>(initialHoles);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    setName(course.name);
    setHoleCount(course.hole_count);
    setCourseRating(course.course_rating != null ? String(course.course_rating) : '');
    setSlopeRating(course.slope_rating != null ? String(course.slope_rating) : '');
  }, [course.name, course.hole_count, course.course_rating, course.slope_rating]);

  useEffect(() => {
    setHoles(initialHoles);
  }, [initialHoles]);

  const parsedCourseRating = courseRating.trim() === '' ? null : parseFloat(courseRating);
  const parsedSlopeRating = slopeRating.trim() === '' ? null : parseInt(slopeRating, 10);

  const isValid =
    name.trim().length > 0 &&
    parsedCourseRating !== null &&
    parsedCourseRating > 0 &&
    parsedSlopeRating !== null &&
    parsedSlopeRating >= 55 &&
    parsedSlopeRating <= 155 &&
    holes.every(
      (h) =>
        (h.par === 3 || h.par === 4 || h.par === 5) &&
        !!h.length_meters &&
        h.length_meters > 0 &&
        !!h.stroke_index &&
        h.stroke_index >= 1 &&
        h.stroke_index <= holeCount
    ) &&
    new Set(holes.map((h) => h.stroke_index)).size === holes.length;

  const totalPar = holes.reduce((sum, h) => sum + (h.par ?? 0), 0);
  const totalLength = holes.reduce((sum, h) => sum + (h.length_meters ?? 0), 0);

  function updateHole(updated: HoleInput) {
    setHoles((prev) => prev.map((h) => (h.hole_number === updated.hole_number ? updated : h)));
  }

  function changeHoleCount(count: HoleCount) {
    setHoleCount(count);
    setHoles((prev) => {
      if (count < prev.length) {
        return prev.slice(0, count);
      }
      const extra = Array.from({ length: count - prev.length }, (_, i) => ({
        hole_number: prev.length + i + 1,
        par: null,
        length_meters: null,
        stroke_index: null,
      }));
      return [...prev, ...extra];
    });
  }

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    try {
      await saveCourse({
        id: course.id ?? undefined,
        name,
        hole_count: holeCount,
        course_rating: parsedCourseRating,
        slope_rating: parsedSlopeRating,
        holes,
      });
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
    setDeleteModalOpen(true);
  }

  async function confirmDelete() {
    setDeleteModalOpen(false);
    try {
      await deleteCourse(course.id!);
      router.back();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to delete course.');
    }
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator testID="course-form-loading" />
      </View>
    );
  }

  if (loadError) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark">
        <Text className="text-center text-red-600">{loadError}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background px-4 pt-4 dark:bg-background-dark" testID="course-form">
      <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">Course name</Text>
      <TextInput
        testID="course-name-input"
        className="mb-4 rounded border border-gray-300 px-3 py-2 text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Pebble Beach"
      />

      <View className="mb-4 flex-row">
        <View className="mr-3 flex-1">
          <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">
            Course Rating
          </Text>
          <TextInput
            testID="course-rating-input"
            className="rounded border border-gray-300 px-3 py-2 text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
            keyboardType="decimal-pad"
            value={courseRating}
            onChangeText={setCourseRating}
            placeholder="e.g. 72.5"
          />
        </View>
        <View className="flex-1">
          <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">
            Slope Rating
          </Text>
          <TextInput
            testID="slope-rating-input"
            className="rounded border border-gray-300 px-3 py-2 text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
            keyboardType="number-pad"
            value={slopeRating}
            onChangeText={setSlopeRating}
            placeholder="e.g. 130"
          />
        </View>
      </View>

      <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">Holes</Text>
      <View className="mb-4 flex-row gap-3">
        {HOLE_COUNT_OPTIONS.map((count) => (
          <Button
            key={count}
            testID={`hole-count-${count}`}
            label={String(count)}
            variant={holeCount === count ? 'primary' : 'secondary'}
            onPress={() => changeHoleCount(count)}
            containerClassName="flex-1"
          />
        ))}
      </View>

      {holes.map((hole) => (
        <HoleRow key={hole.hole_number} hole={hole} onChange={updateHole} />
      ))}

      <Text className="my-3 text-sm text-text-secondary dark:text-text-secondary-dark">
        Total par {totalPar} · {totalLength} m
      </Text>

      {saveError && <Text className="mb-3 text-red-600">{saveError}</Text>}

      <Button
        testID="save-course-button"
        label={saving ? 'Saving...' : 'Save'}
        variant="primary"
        disabled={!isValid || saving}
        onPress={handleSave}
        containerClassName="mb-3"
      />

      {course.id && (
        <Button
          testID="delete-course-button"
          label="Delete Course"
          variant="destructive"
          onPress={handleDelete}
          containerClassName="mb-8"
        />
      )}

      <ConfirmDialog
        visible={deleteModalOpen}
        title="Delete course?"
        message="This cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
      />
    </ScrollView>
  );
}
