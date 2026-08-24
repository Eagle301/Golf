import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ExpandablePhoto } from '@/components/ui/ExpandablePhoto';
import { StepperInput } from '@/components/ui/StepperInput';
import { DrillVideo } from '@/components/training/DrillVideo';
import { TargetMeter } from '@/components/training/TargetMeter';
import { useRoutine } from '@/lib/hooks/useRoutines';
import { useDrillProgress } from '@/lib/hooks/useDrillProgress';
import { saveTrainingSession } from '@/lib/hooks/useTrainingSession';
import { drillStats, type DrillStat } from '@/lib/training/practiceStats';
import { formatTimestamp } from '@/lib/training/youtube';
import type { DrillResultType } from '@/types/database';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * "Last 6 · Best 9" for counted drills, "Last ✓/✗" for checkmark drills -
 * or null with no history yet.
 */
function statLine(stat: DrillStat | undefined, resultType: DrillResultType): string | null {
  if (!stat || (stat.last === null && stat.best === null)) return null;
  if (resultType === 'check') {
    return stat.last === null ? null : `Last ${stat.last >= 1 ? '✓' : '✗'}`;
  }
  const parts: string[] = [];
  if (stat.last !== null) parts.push(`Last ${stat.last}`);
  if (stat.best !== null) parts.push(`Best ${stat.best}`);
  return parts.join(' · ');
}

/** Ticks once a second and renders the time since mount, so a session shows how long it's been running. */
function ElapsedTimer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View
      testID="session-timer"
      className="flex-row items-center rounded-full bg-surface px-3 py-1 dark:border dark:border-border-dark dark:bg-surface-dark"
    >
      <Ionicons name="stopwatch-outline" size={14} color="#4B5563" />
      <Text className="ml-1 text-xs font-semibold text-text-secondary dark:text-text-secondary-dark">
        {formatTimestamp(seconds)}
      </Text>
    </View>
  );
}

export default function NewSessionScreen() {
  const { routineId } = useLocalSearchParams<{ routineId: string }>();
  const router = useRouter();
  const { routine, drills, loading, error: loadError } = useRoutine(routineId);
  const { drills: progress } = useDrillProgress(routineId);

  const [note, setNote] = useState('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  const stats = drillStats(progress);

  // The back handler and header button close over refs, not state, so they
  // always see the latest entries without re-registering.
  const dirtyRef = useRef(false);
  dirtyRef.current = note.trim() !== '' || Object.values(values).some((v) => v.trim() !== '');
  const savedRef = useRef(false);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/training');
    }
  }

  /** Returns true when leaving needs confirmation (and opens the dialog). */
  function guardLeave(): boolean {
    if (!dirtyRef.current || savedRef.current) return false;
    setDiscardDialogOpen(true);
    return true;
  }

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => guardLeave());
    return () => subscription.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setValue(drillId: string, text: string) {
    setValues((prev) => ({ ...prev, [drillId]: text }));
  }

  function numericValue(drillId: string): number | null {
    const text = values[drillId] ?? '';
    const parsed = text.trim() === '' ? null : parseFloat(text);
    return Number.isNaN(parsed as number) ? null : parsed;
  }

  async function handleSave() {
    setSaveError(null);
    setSaving(true);
    try {
      await saveTrainingSession({
        routineId,
        datePlayed: today(),
        note: note.trim() === '' ? null : note,
        results: drills.map((drill) => ({ drillId: drill.id!, value: numericValue(drill.id!) })),
      });
      savedRef.current = true;
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
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView
          className="flex-1 bg-background px-4 pt-4 dark:bg-background-dark"
          contentContainerClassName="pb-8"
          testID="new-session-form"
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 text-xl font-semibold text-text-primary dark:text-text-primary-dark">
              {routine.name}
            </Text>
            <ElapsedTimer />
          </View>
          {routine.description && (
            <Text className="mt-1 text-sm text-text-secondary dark:text-text-secondary-dark">
              {routine.description}
            </Text>
          )}

          <View className="mt-4">
            {drills.map((drill) => {
              const line = statLine(stats[drill.id!], drill.result_type);
              const checked = (numericValue(drill.id!) ?? 0) >= 1;
              return (
                <View
                  key={drill.id}
                  testID={`session-drill-${drill.id}`}
                  className="mb-3 rounded-2xl bg-surface p-4 shadow-sm dark:border dark:border-border-dark dark:bg-surface-dark dark:shadow-none"
                >
                  <View className="flex-row items-center">
                    {drill.photo_url && (
                      <View className="mr-3">
                        <ExpandablePhoto
                          uri={drill.photo_url}
                          className="h-12 w-12 rounded-lg"
                          testID={`session-drill-${drill.id}-photo`}
                        />
                      </View>
                    )}
                    {drill.video_url && (
                      <View className="mr-3">
                        <DrillVideo
                          url={drill.video_url}
                          testID={`session-drill-${drill.id}-video`}
                          className="h-12 w-20 rounded-lg"
                        />
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="text-base font-semibold text-text-primary dark:text-text-primary-dark">
                        {drill.name}
                      </Text>
                      {line && (
                        <Text className="mt-0.5 text-xs text-text-secondary dark:text-text-secondary-dark">
                          {line}
                        </Text>
                      )}
                    </View>
                  </View>

                  {drill.result_type === 'check' ? (
                    <Pressable
                      testID={`session-drill-${drill.id}-check`}
                      onPress={() => setValue(drill.id!, checked ? '' : '1')}
                      className="mt-3 flex-row items-center justify-center"
                      hitSlop={8}
                    >
                      <View
                        className={`h-14 w-14 items-center justify-center rounded-full border-2 ${
                          checked
                            ? 'border-brand bg-brand dark:border-accent-gold-dark dark:bg-accent-gold-dark'
                            : 'border-gray-300 dark:border-border-dark'
                        }`}
                      >
                        {checked && <Ionicons name="checkmark" size={30} color="#FFFFFF" />}
                      </View>
                      <Text
                        className={`ml-3 text-base font-medium ${
                          checked
                            ? 'text-brand dark:text-accent-gold-dark'
                            : 'text-text-secondary dark:text-text-secondary-dark'
                        }`}
                      >
                        {checked ? 'Done' : 'Mark done'}
                      </Text>
                    </Pressable>
                  ) : (
                    <>
                      <View className="mt-3 flex-row items-center justify-center">
                        <StepperInput
                          value={values[drill.id!] ?? ''}
                          onChange={(text) => setValue(drill.id!, text)}
                          testID={`session-drill-${drill.id}`}
                        />
                        {drill.result_type === 'target' && drill.target_value != null && (
                          <Text className="ml-2 text-2xl font-semibold text-text-secondary dark:text-text-secondary-dark">
                            {`/ ${drill.target_value}`}
                          </Text>
                        )}
                      </View>

                      <TargetMeter
                        value={numericValue(drill.id!)}
                        target={drill.result_type === 'target' ? drill.target_value : null}
                        testID={`session-drill-${drill.id}-meter`}
                      />
                    </>
                  )}
                </View>
              );
            })}
          </View>

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
      </KeyboardAvoidingView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          // The swipe-back gesture would bypass the discard guard below.
          gestureEnabled: false,
          headerLeft: () => (
            <Pressable
              testID="session-back-button"
              onPress={() => {
                if (!guardLeave()) goBack();
              }}
              className="ml-2"
              hitSlop={8}
            >
              <Ionicons name="chevron-back" color="#FFFFFF" size={26} />
            </Pressable>
          ),
        }}
      />
      {body}
      <ConfirmDialog
        visible={discardDialogOpen}
        title="Discard session?"
        message="Entered results will be lost."
        confirmLabel="Discard"
        onCancel={() => setDiscardDialogOpen(false)}
        onConfirm={() => {
          setDiscardDialogOpen(false);
          savedRef.current = true;
          goBack();
        }}
      />
    </>
  );
}
