import { useState } from 'react';
import { View, Text, TextInput, ScrollView, Image, Pressable, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { useRoutine } from '@/lib/hooks/useRoutines';
import { saveTrainingSession } from '@/lib/hooks/useTrainingSession';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function NewSessionScreen() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const router = useRouter();
  const { routine, drills, loading, error: loadError } = useRoutine(routineId);

  const [note, setNote] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setValue(drillId: string, text: string) {
    setValues((prev) => ({ ...prev, [drillId]: text }));
  }

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    try {
      await saveTrainingSession({
        routineId,
        datePlayed: today(),
        note: note.trim() === '' ? null : note,
        results: drills.map((drill) => {
          const text = values[drill.id!] ?? '';
          const parsed = text.trim() === '' ? null : parseFloat(text);
          return { drillId: drill.id!, value: Number.isNaN(parsed as number) ? null : parsed };
        }),
      });
      router.back();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save session.');
    } finally {
      setSaving(false);
    }
  }

  let body: React.ReactNode;

  if (loading) {
    body = (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator testID="new-session-loading" />
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
    <ScrollView className="flex-1 bg-background px-4 pt-4 dark:bg-background-dark" testID="new-session-form">
      <Text className="mb-1 text-xl font-semibold text-text-primary dark:text-text-primary-dark">
        {routine.name}
      </Text>
      {routine.description && (
        <Text className="mb-4 text-sm text-text-secondary dark:text-text-secondary-dark">{routine.description}</Text>
      )}

      {drills.map((drill) => (
        <View
          key={drill.id}
          testID={`session-drill-${drill.id}`}
          className="mb-3 rounded-xl border border-gray-200 p-3 dark:border-border-dark dark:bg-surface-dark"
        >
          <View className="flex-row items-center">
            {drill.photo_url && (
              <Image source={{ uri: drill.photo_url }} className="mr-3 h-12 w-12 rounded-lg" />
            )}
            <View className="flex-1">
              <Text className="text-sm font-medium text-text-primary dark:text-text-primary-dark">{drill.name}</Text>
              {drill.target_value != null && (
                <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">
                  Target {drill.target_value}
                </Text>
              )}
            </View>
            <TextInput
              testID={`session-drill-${drill.id}-value`}
              className="ml-2 w-16 rounded border border-gray-300 px-2 py-1 text-right text-text-primary dark:border-border-dark dark:text-text-primary-dark"
              placeholder="Result"
              keyboardType="numeric"
              value={values[drill.id!] ?? ''}
              onChangeText={(text) => setValue(drill.id!, text)}
            />
          </View>
        </View>
      ))}

      <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">Note</Text>
      <TextInput
        testID="session-note-input"
        className="mb-4 rounded border border-gray-300 px-3 py-2 text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
        value={note}
        onChangeText={setNote}
        placeholder="How did it go?"
        multiline
      />

      {saveError && <Text className="mb-3 text-red-600">{saveError}</Text>}

      <Button
        testID="save-session-button"
        label={saving ? 'Saving...' : 'Save Session'}
        variant="primary"
        disabled={saving}
        onPress={handleSave}
        containerClassName="mb-8"
      />
    </ScrollView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
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
