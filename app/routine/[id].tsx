import { useEffect, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DrillRow } from '@/components/training/DrillRow';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { pickDrillPhoto, uploadDrillPhoto, type PhotoSource } from '@/lib/training/drillPhotos';
import { TRAINING_CATEGORIES, TRAINING_CATEGORY_LABELS } from '@/lib/training/categories';
import {
  useRoutine,
  saveRoutine,
  deleteRoutine,
  RoutineValidationError,
  type DrillInput,
} from '@/lib/hooks/useRoutines';
import type { TrainingCategory } from '@/types/database';

export default function RoutineFormScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { routine, drills: initialDrills, loading, error: loadError } = useRoutine(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TrainingCategory>('putts');
  const [drills, setDrills] = useState<DrillInput[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    setName(routine.name);
    setDescription(routine.description ?? '');
    setCategory(routine.category);
  }, [routine.name, routine.description, routine.category]);

  useEffect(() => {
    setDrills(initialDrills);
  }, [initialDrills]);

  const isValid = name.trim().length > 0 && drills.length > 0 && drills.every((d) => d.name.trim().length > 0);

  function updateDrill(index: number, updated: DrillInput) {
    setDrills((prev) => prev.map((d, i) => (i === index ? updated : d)));
  }

  function removeDrill(index: number) {
    setDrills((prev) => prev.filter((_, i) => i !== index));
  }

  function moveDrill(index: number, direction: -1 | 1) {
    setDrills((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addDrill() {
    setDrills((prev) => [...prev, { name: '', target_value: null, photo_url: null }]);
  }

  async function handlePickPhoto(source: PhotoSource): Promise<string | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated.');

    const localUri = await pickDrillPhoto(source);
    if (!localUri) return null;

    return uploadDrillPhoto(user.id, localUri);
  }

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    try {
      await saveRoutine({
        id: routine.id ?? undefined,
        name,
        description: description.trim() === '' ? null : description,
        category,
        drills,
      });
      router.back();
    } catch (err) {
      if (err instanceof RoutineValidationError) {
        setSaveError(err.message);
      } else {
        setSaveError(err instanceof Error ? err.message : 'Failed to save routine.');
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
      await deleteRoutine(routine.id!);
      router.back();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to delete routine.');
    }
  }

  let body: React.ReactNode;

  if (loading) {
    body = (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator testID="routine-form-loading" />
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
    <ScrollView className="flex-1 bg-background px-4 pt-4 dark:bg-background-dark" testID="routine-form">
      <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">Routine name</Text>
      <TextInput
        testID="routine-name-input"
        className="mb-4 rounded border border-gray-300 px-3 py-2 text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
        value={name}
        onChangeText={setName}
        placeholder="e.g. 3-6-9 Ladder"
      />

      <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">Description</Text>
      <TextInput
        testID="routine-description-input"
        className="mb-4 rounded border border-gray-300 px-3 py-2 text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
        value={description}
        onChangeText={setDescription}
        placeholder="What is this routine for?"
        multiline
      />

      <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">Category</Text>
      <View className="mb-4 flex-row flex-wrap gap-2">
        {TRAINING_CATEGORIES.map((cat) => (
          <Button
            key={cat}
            testID={`category-${cat}`}
            label={TRAINING_CATEGORY_LABELS[cat]}
            variant={category === cat ? 'primary' : 'secondary'}
            onPress={() => setCategory(cat)}
          />
        ))}
      </View>

      <Text className="mb-2 text-sm font-medium text-text-primary dark:text-text-primary-dark">Drills</Text>
      {drills.map((drill, index) => (
        <DrillRow
          key={drill.id ?? `new-${index}`}
          testIDPrefix={`drill-${index}`}
          drill={drill}
          onChange={(updated) => updateDrill(index, updated)}
          onRemove={() => removeDrill(index)}
          onMoveUp={index > 0 ? () => moveDrill(index, -1) : undefined}
          onMoveDown={index < drills.length - 1 ? () => moveDrill(index, 1) : undefined}
          onPickPhoto={handlePickPhoto}
        />
      ))}

      <Button
        testID="add-drill-button"
        label="+ Add Drill"
        variant="secondary"
        onPress={addDrill}
        containerClassName="mb-4"
      />

      {saveError && <Text className="mb-3 text-red-600">{saveError}</Text>}

      <Button
        testID="save-routine-button"
        label={saving ? 'Saving...' : 'Save'}
        variant="primary"
        disabled={!isValid || saving}
        onPress={handleSave}
        containerClassName="mb-3"
      />

      {routine.id && (
        <Button
          testID="delete-routine-button"
          label="Delete Routine"
          variant="destructive"
          onPress={handleDelete}
          containerClassName="mb-8"
        />
      )}

      <ConfirmDialog
        visible={deleteModalOpen}
        title="Delete routine?"
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
          title: routine.id ? 'Edit Routine' : 'New Routine',
          headerLeft: () => (
            <Pressable
              testID="header-back-button"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/training'))}
              className="ml-2"
              hitSlop={8}
            >
              <Ionicons name="chevron-back" color="#FFFFFF" size={26} />
            </Pressable>
          ),
        }}
      />
      {body}
    </>
  );
}
