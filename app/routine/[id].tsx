import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { DrillRow } from '@/components/training/DrillRow';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import { supabase } from '@/lib/supabase';
import { pickDrillPhoto, uploadDrillPhoto, type PhotoSource } from '@/lib/training/drillPhotos';
import { TRAINING_CATEGORIES, TRAINING_CATEGORY_LABELS, CATEGORY_ICONS } from '@/lib/training/categories';
import {
  useRoutine,
  saveRoutine,
  deleteRoutine,
  RoutineValidationError,
  type DrillInput,
} from '@/lib/hooks/useRoutines';
import type { TrainingCategory } from '@/types/database';

/** The one thing still standing between this routine and a save, or null when it's ready. */
function validationHint(name: string, drills: DrillInput[]): string | null {
  if (name.trim() === '') return 'Name your routine to save it.';
  if (drills.length === 0) return 'Add at least one drill.';
  if (drills.some((d) => d.name.trim() === '')) return 'Every drill needs a name.';
  if (drills.some((d) => d.result_type === 'target' && d.target_value == null)) {
    return '"Out of" drills need a target.';
  }
  return null;
}

/** Section heading with an optional trailing count, used above the drill list. */
function SectionHeader({ title, trailing }: { title: string; trailing?: string }) {
  return (
    <View className="mb-2 flex-row items-baseline justify-between">
      <Text className="text-base font-semibold text-text-primary dark:text-text-primary-dark">{title}</Text>
      {trailing && (
        <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">{trailing}</Text>
      )}
    </View>
  );
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary dark:text-text-secondary-dark">
      {children}
    </Text>
  );
}

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

  const hint = validationHint(name, drills);
  const isValid = hint === null;

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
    setDrills((prev) => [
      ...prev,
      { name: '', target_value: null, photo_url: null, video_url: null, result_type: 'target' },
    ]);
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
      <KeyboardAvoidingView
        className="flex-1 bg-background dark:bg-background-dark"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerClassName="pb-6"
          testID="routine-form"
          keyboardShouldPersistTaps="handled"
        >
          {/* The routine's identity: what it's called and what part of the game it trains. */}
          <Card>
            <FieldLabel>Routine name</FieldLabel>
            <TextInput
              testID="routine-name-input"
              className="rounded-xl border border-gray-300 px-3 py-2.5 text-base text-text-primary dark:border-border-dark dark:text-text-primary-dark"
              value={name}
              onChangeText={setName}
              placeholder="e.g. 3-6-9 Ladder"
              placeholderTextColor="#9CA3AF"
            />

            <View className="mt-4">
              <FieldLabel>Description</FieldLabel>
              <TextInput
                testID="routine-description-input"
                className="min-h-[64px] rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-text-primary dark:border-border-dark dark:text-text-primary-dark"
                value={description}
                onChangeText={setDescription}
                placeholder="What is this routine for?"
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />
            </View>

            <View className="mt-4">
              <FieldLabel>Category</FieldLabel>
              {/* Two rows of two: the labels need the width, and the icons match
                  the Training tab's grid so a category reads the same everywhere. */}
              <View className="flex-row gap-2">
                {TRAINING_CATEGORIES.slice(0, 2).map((cat) => (
                  <CategoryChip
                    key={cat}
                    category={cat}
                    selected={category === cat}
                    onPress={() => setCategory(cat)}
                  />
                ))}
              </View>
              <View className="mt-2 flex-row gap-2">
                {TRAINING_CATEGORIES.slice(2, 4).map((cat) => (
                  <CategoryChip
                    key={cat}
                    category={cat}
                    selected={category === cat}
                    onPress={() => setCategory(cat)}
                  />
                ))}
              </View>
            </View>
          </Card>

          <View className="mt-6">
            <SectionHeader
              title="Drills"
              trailing={drills.length > 0 ? `${drills.length} drill${drills.length === 1 ? '' : 's'}` : undefined}
            />

            {/* Keyed branches: the empty state and the drill list occupy the
                same position, and letting React reuse instances across the
                swap trips the css-interop upgrade-warning crash in dev. */}
            {drills.length === 0 ? (
              <Pressable
                key="drills-empty"
                testID="drills-empty-state"
                onPress={addDrill}
                className="items-center rounded-2xl border border-dashed border-gray-300 px-4 py-8 dark:border-border-dark"
              >
                <Ionicons name="add-circle-outline" size={26} color="#4B5563" />
                <Text className="mt-2 text-sm font-medium text-text-primary dark:text-text-primary-dark">
                  Add your first drill
                </Text>
                <Text className="mt-1 text-center text-xs text-text-secondary dark:text-text-secondary-dark">
                  Each drill is one thing you measure during practice.
                </Text>
              </Pressable>
            ) : (
              <View key="drills-list">
                {drills.map((drill, index) => (
                  <DrillRow
                    key={drill.id ?? `new-${index}`}
                    testIDPrefix={`drill-${index}`}
                    position={index + 1}
                    drill={drill}
                    onChange={(updated) => updateDrill(index, updated)}
                    onRemove={() => removeDrill(index)}
                    onMoveUp={index > 0 ? () => moveDrill(index, -1) : undefined}
                    onMoveDown={index < drills.length - 1 ? () => moveDrill(index, 1) : undefined}
                    onPickPhoto={handlePickPhoto}
                  />
                ))}
              </View>
            )}

            {drills.length > 0 && (
              <Pressable
                testID="add-drill-button"
                onPress={addDrill}
                className="mt-1 flex-row items-center justify-center rounded-2xl border border-dashed border-gray-300 py-3.5 dark:border-border-dark"
              >
                <Ionicons name="add" size={18} color="#166534" />
                <Text className="ml-1.5 text-sm font-semibold text-brand dark:text-accent-gold-dark">Add drill</Text>
              </Pressable>
            )}
          </View>

          {/* Destructive action kept well clear of Save, which lives in the bar below. */}
          {routine.id && (
            <View className="mt-8 border-t border-gray-200 pt-4 dark:border-border-dark">
              <Pressable
                testID="delete-routine-button"
                onPress={() => setDeleteModalOpen(true)}
                className="flex-row items-center justify-center py-2"
              >
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                <Text className="ml-1.5 text-sm font-medium text-red-600">Delete routine</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>

        {/* Save stays reachable without scrolling to the end of a long drill list. */}
        <View className="border-t border-gray-200 bg-surface px-4 py-3 dark:border-border-dark dark:bg-surface-dark">
          {saveError && <Text className="mb-2 text-center text-sm text-red-600">{saveError}</Text>}
          {hint !== null && (
            <Text
              testID="routine-validation-hint"
              className="mb-2 text-center text-xs text-text-secondary dark:text-text-secondary-dark"
            >
              {hint}
            </Text>
          )}
          <Button
            testID="save-routine-button"
            label={saving ? 'Saving...' : 'Save routine'}
            variant="primary"
            disabled={!isValid || saving}
            onPress={handleSave}
          />
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: routine.id ? 'Edit Routine' : 'New Routine',
          headerLeft: () => <HeaderBackButton fallback="/training" />,
        }}
      />
      {body}
      <ConfirmDialog
        visible={deleteModalOpen}
        title="Delete routine?"
        message="This cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}

function CategoryChip({
  category,
  selected,
  onPress,
}: {
  category: TrainingCategory;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`category-${category}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`flex-1 flex-row items-center justify-center rounded-xl border py-3 ${
        selected
          ? 'border-brand bg-brand dark:border-accent-gold-dark dark:bg-accent-gold-dark'
          : 'border-gray-300 dark:border-border-dark'
      }`}
    >
      <Ionicons name={CATEGORY_ICONS[category]} size={16} color={selected ? '#FFFFFF' : '#4B5563'} />
      <Text
        className={`ml-1.5 text-xs font-semibold ${
          selected ? 'text-white dark:text-gray-900' : 'text-text-secondary dark:text-text-secondary-dark'
        }`}
      >
        {TRAINING_CATEGORY_LABELS[category]}
      </Text>
    </Pressable>
  );
}
