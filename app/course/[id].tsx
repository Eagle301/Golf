import { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { HoleRow } from '@/components/course/HoleRow';
import { TeeBoxCard } from '@/components/course/TeeBoxCard';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import {
  useCourse,
  saveCourse,
  deleteCourse,
  blankTee,
  CourseValidationError,
  type HoleInput,
  type HoleCount,
  type TeeBoxInput,
  type SaveCourseInput,
} from '@/lib/hooks/useCourses';

const HOLE_COUNT_OPTIONS: HoleCount[] = [9, 18];

function isTeeValid(tee: TeeBoxInput, holeCount: HoleCount): boolean {
  return (
    tee.name.trim().length > 0 &&
    tee.course_rating !== null &&
    tee.course_rating > 0 &&
    tee.slope_rating !== null &&
    tee.slope_rating >= 55 &&
    tee.slope_rating <= 155 &&
    tee.lengths.length === holeCount &&
    tee.lengths.every((l) => !!l && l > 0)
  );
}

export default function CourseFormScreen() {
  const { id, importJson } = useLocalSearchParams<{ id: string; importJson?: string }>();
  const router = useRouter();
  const { course, holes: initialHoles, tees: initialTees, loading, error: loadError } = useCourse(id);

  const [name, setName] = useState('');
  const [club, setClub] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [holeCount, setHoleCount] = useState<HoleCount>(18);
  const [holes, setHoles] = useState<HoleInput[]>(initialHoles);
  const [tees, setTees] = useState<TeeBoxInput[]>(initialTees);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // A CSV import (see app/(tabs)/courses.tsx) pre-fills this screen instead
  // of the usual blank/fetched state - the two effects below must not clobber
  // it once applied, since useCourse('new') re-settles its blank state on a
  // later render after this component's first paint.
  const isImporting = id === 'new' && !!importJson;

  useEffect(() => {
    if (isImporting) return;
    setName(course.name);
    setClub(course.club ?? '');
    setLatitude(course.latitude != null ? String(course.latitude) : '');
    setLongitude(course.longitude != null ? String(course.longitude) : '');
    setHoleCount(course.hole_count);
  }, [isImporting, course.name, course.club, course.latitude, course.longitude, course.hole_count]);

  useEffect(() => {
    if (isImporting) return;
    setHoles(initialHoles);
    setTees(initialTees);
  }, [isImporting, initialHoles, initialTees]);

  useEffect(() => {
    if (!isImporting) return;
    try {
      const imported = JSON.parse(importJson as string) as SaveCourseInput;
      setName(imported.name);
      setClub(imported.club ?? '');
      setHoleCount(imported.hole_count);
      setHoles(imported.holes);
      setTees(imported.tees);
    } catch {
      setSaveError('Failed to load imported CSV data.');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isImporting, importJson]);

  const isValid =
    name.trim().length > 0 &&
    holes.every(
      (h) =>
        (h.par === 3 || h.par === 4 || h.par === 5) &&
        !!h.stroke_index &&
        h.stroke_index >= 1 &&
        h.stroke_index <= holeCount
    ) &&
    new Set(holes.map((h) => h.stroke_index)).size === holes.length &&
    tees.length > 0 &&
    tees.every((tee) => isTeeValid(tee, holeCount)) &&
    new Set(tees.map((t) => t.name.trim().toLowerCase())).size === tees.length;

  const totalPar = holes.reduce((sum, h) => sum + (h.par ?? 0), 0);

  function updateHole(updated: HoleInput) {
    setHoles((prev) => prev.map((h) => (h.hole_number === updated.hole_number ? updated : h)));
  }

  function updateTee(index: number, updated: TeeBoxInput) {
    setTees((prev) => prev.map((t, i) => (i === index ? updated : t)));
  }

  function removeTee(index: number) {
    setTees((prev) => prev.filter((_, i) => i !== index));
  }

  function addTee() {
    setTees((prev) => [...prev, blankTee(holeCount)]);
  }

  function resizeLengths(lengths: (number | null)[], count: HoleCount): (number | null)[] {
    if (count < lengths.length) return lengths.slice(0, count);
    return [...lengths, ...Array(count - lengths.length).fill(null)];
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
        stroke_index: null,
      }));
      return [...prev, ...extra];
    });
    setTees((prev) => prev.map((tee) => ({ ...tee, lengths: resizeLengths(tee.lengths, count) })));
  }

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    try {
      const parsedLatitude = latitude.trim() === '' ? null : parseFloat(latitude);
      const parsedLongitude = longitude.trim() === '' ? null : parseFloat(longitude);
      await saveCourse({
        id: course.id ?? undefined,
        name,
        club: club.trim() || null,
        latitude: Number.isNaN(parsedLatitude as number) ? null : parsedLatitude,
        longitude: Number.isNaN(parsedLongitude as number) ? null : parsedLongitude,
        hole_count: holeCount,
        holes,
        tees,
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

  let body: React.ReactNode;

  if (loading) {
    body = (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator testID="course-form-loading" />
      </View>
    );
  } else if (loadError) {
    body = (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark">
        <Text className="text-center text-red-600">{loadError}</Text>
      </View>
    );
  } else {
    body = (
      <ScrollView className="flex-1 bg-background px-4 pt-4 dark:bg-background-dark" testID="course-form">
        <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">Course name</Text>
        <TextInput
          testID="course-name-input"
          className="mb-4 rounded border border-gray-300 px-3 py-2 text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Pebble Beach"
        />

        <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">
          Golf club (optional)
        </Text>
        <TextInput
          testID="course-club-input"
          className="mb-4 rounded border border-gray-300 px-3 py-2 text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
          value={club}
          onChangeText={setClub}
          placeholder="e.g. GKG"
        />

        <View className="mb-4 flex-row">
          <View className="mr-3 flex-1">
            <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">
              Latitude (optional)
            </Text>
            <TextInput
              testID="course-latitude-input"
              className="rounded border border-gray-300 px-3 py-2 text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
              keyboardType="numbers-and-punctuation"
              value={latitude}
              onChangeText={setLatitude}
              placeholder="e.g. 64.086"
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">
              Longitude (optional)
            </Text>
            <TextInput
              testID="course-longitude-input"
              className="rounded border border-gray-300 px-3 py-2 text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
              keyboardType="numbers-and-punctuation"
              value={longitude}
              onChangeText={setLongitude}
              placeholder="e.g. -21.878"
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
          Total par {totalPar}
        </Text>

        <Text className="mb-2 text-sm font-medium text-text-primary dark:text-text-primary-dark">Tee boxes</Text>
        {tees.map((tee, i) => (
          <TeeBoxCard
            key={tee.id ?? `new-${i}`}
            tee={tee}
            index={i}
            onChange={(updated) => updateTee(i, updated)}
            onRemove={() => removeTee(i)}
            removable={tees.length > 1}
          />
        ))}
        <Button
          testID="add-tee-button"
          label="Add tee box"
          variant="secondary"
          onPress={addTee}
          containerClassName="mb-4"
        />

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

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => <HeaderBackButton fallback="/courses" />,
        }}
      />
      {body}
    </>
  );
}
