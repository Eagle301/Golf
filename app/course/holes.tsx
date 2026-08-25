import { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { HoleLineEditor } from '@/components/course/HoleLineEditor';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { HeaderBackButton } from '@/components/ui/HeaderBackButton';
import {
  useHoleGeometry,
  saveHoleGeometry,
  copyableCourses,
  copyGeometry,
  type CopyCandidate,
  type HoleWithPath,
} from '@/lib/hooks/useHoleGeometry';
import { applyEdit, placePoint, isComplete, type HolePoint } from '@/lib/holeGeometry';
import type { HoleEditorMessage } from '@/lib/courseMapHtml';

type Mode = 'place' | 'adjust';

function parseCoordinate(raw: string | undefined, limit: number): number | null {
  if (raw == null || raw.trim() === '') return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || Math.abs(value) > limit) return null;
  return value;
}

/**
 * Draws the line for each hole: tap to place a tee then a green, tap again
 * for bends, switch to adjust to drag or delete a point. The screen owns
 * every path; the map document is only a surface for gestures.
 */
export default function HoleLinesScreen() {
  const router = useRouter();
  const { id, name, club, lat, lng } = useLocalSearchParams<{
    id: string;
    name?: string;
    club?: string;
    lat?: string;
    lng?: string;
  }>();

  const { holes: savedHoles, loading, error } = useHoleGeometry(id);

  const [holes, setHoles] = useState<HoleWithPath[]>([]);
  const [activeHoleNumber, setActiveHoleNumber] = useState(1);
  const [mode, setMode] = useState<Mode>('place');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [candidates, setCandidates] = useState<CopyCandidate[]>([]);
  // One undo step per hole - undo should never reach back into a hole the
  // user has since navigated away from.
  const [history, setHistory] = useState<Record<number, HolePoint[][]>>({});

  useEffect(() => {
    setHoles(savedHoles);
    setHistory({});
    setDirty(false);
  }, [savedHoles]);

  useEffect(() => {
    let cancelled = false;
    if (!id || savedHoles.length === 0) return;
    copyableCourses(
      id,
      club ?? null,
      savedHoles.map((hole) => ({ hole_number: hole.hole_number, par: hole.par, stroke_index: null }))
    ).then((found) => {
      if (!cancelled) setCandidates(found);
    });
    return () => {
      cancelled = true;
    };
  }, [id, club, savedHoles]);

  const latitude = parseCoordinate(lat, 90);
  const longitude = parseCoordinate(lng, 180);

  const activePath = useMemo(
    () => holes.find((hole) => hole.hole_number === activeHoleNumber)?.path ?? [],
    [holes, activeHoleNumber]
  );

  const setActivePath = useCallback(
    (next: HolePoint[]) => {
      setHistory((previous) => ({
        ...previous,
        [activeHoleNumber]: [...(previous[activeHoleNumber] ?? []), activePath],
      }));
      setHoles((previous) =>
        previous.map((hole) => (hole.hole_number === activeHoleNumber ? { ...hole, path: next } : hole))
      );
      setDirty(true);
    },
    [activeHoleNumber, activePath]
  );

  const handleEdit = useCallback(
    (message: HoleEditorMessage) => {
      const point: HolePoint = [message.latitude ?? 0, message.longitude ?? 0];

      if (message.type === 'point-added') {
        // A tap on the map only means "add" while placing; in adjust mode the
        // taps that matter are the ones on the markers themselves.
        if (mode !== 'place') return;
        setActivePath(placePoint(activePath, point));
        return;
      }
      if (message.type === 'point-moved' && message.index != null) {
        setActivePath(applyEdit(activePath, { kind: 'move-point', index: message.index, point }));
        return;
      }
      if (message.type === 'point-removed' && message.index != null) {
        if (mode !== 'adjust') return;
        setActivePath(applyEdit(activePath, { kind: 'remove-point', index: message.index }));
      }
    },
    [mode, activePath, setActivePath]
  );

  function handleUndo() {
    const steps = history[activeHoleNumber];
    if (!steps || steps.length === 0) return;
    const previous = steps[steps.length - 1];
    setHistory((existing) => ({ ...existing, [activeHoleNumber]: steps.slice(0, -1) }));
    setHoles((existing) =>
      existing.map((hole) => (hole.hole_number === activeHoleNumber ? { ...hole, path: previous } : hole))
    );
  }

  function handleCopyFrom(candidate: CopyCandidate) {
    setHoles((existing) => copyGeometry(existing, candidate.holes));
    setDirty(true);
  }

  const isLastHole = holes.length > 0 && activeHoleNumber >= holes[holes.length - 1].hole_number;

  /**
   * Saves as it goes and steps to the next hole, so tracing a course is one
   * pass through it rather than a save after every line. On the last hole
   * there is nowhere left to go, so it finishes.
   */
  async function handleNext() {
    setSaveError(null);
    setSaving(true);
    try {
      await saveHoleGeometry(holes.map((hole) => ({ hole_id: hole.id, path: hole.path })));
      setDirty(false);
      if (isLastHole) {
        router.back();
        return;
      }
      const next = holes.find((hole) => hole.hole_number > activeHoleNumber);
      if (next) setActiveHoleNumber(next.hole_number);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save hole lines.');
    } finally {
      setSaving(false);
    }
  }

  function handleBack() {
    if (dirty) {
      setLeaveDialogOpen(true);
      return;
    }
    router.back();
  }

  const mappedCount = holes.filter((hole) => isComplete(hole.path)).length;

  let body: React.ReactNode;

  if (loading) {
    body = (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator testID="hole-lines-loading" />
      </View>
    );
  } else if (error || latitude == null || longitude == null) {
    body = (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark">
        <Text className="text-center text-text-secondary dark:text-text-secondary-dark">
          {error ?? 'This course has no location yet.'}
        </Text>
      </View>
    );
  } else {
    body = (
      <View className="flex-1 bg-background dark:bg-background-dark">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="max-h-14 grow-0 border-b border-border-dark/40 px-2 py-2"
        >
          {holes.map((hole) => {
            const active = hole.hole_number === activeHoleNumber;
            return (
              <Pressable
                key={hole.hole_number}
                testID={`hole-tab-${hole.hole_number}`}
                onPress={() => setActiveHoleNumber(hole.hole_number)}
                className={`mr-2 h-9 w-9 items-center justify-center rounded-full border ${
                  active ? 'border-brand bg-brand dark:border-accent dark:bg-accent' : 'border-gray-300 dark:border-border-dark'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active
                      ? 'text-white dark:text-gray-900'
                      : isComplete(hole.path)
                        ? 'text-brand dark:text-accent'
                        : 'text-text-secondary dark:text-text-secondary-dark'
                  }`}
                >
                  {hole.hole_number}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="flex-1">
          <HoleLineEditor
            course={{
              name: name ?? 'Course',
              club: club ?? null,
              latitude,
              longitude,
              holes: holes.map((hole) => ({ hole_number: hole.hole_number, path: hole.path })),
            }}
            holes={holes.map((hole) => ({ hole_number: hole.hole_number, path: hole.path }))}
            activeHoleNumber={activeHoleNumber}
            onEdit={handleEdit}
          />
        </View>

        <View className="border-t border-border-dark/40 p-3">
          <View className="mb-3 flex-row items-center justify-between">
            <Text
              testID="mapped-count"
              className="text-sm text-text-secondary dark:text-text-secondary-dark"
            >
              {`${mappedCount} of ${holes.length} holes mapped`}
            </Text>
            <View className="flex-row">
              <Pressable
                testID="mode-place"
                onPress={() => setMode('place')}
                className={`mr-2 rounded-full border px-3 py-1 ${
                  mode === 'place' ? 'border-brand bg-brand dark:border-accent dark:bg-accent' : 'border-gray-300 dark:border-border-dark'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    mode === 'place' ? 'text-white dark:text-gray-900' : 'text-text-secondary dark:text-text-secondary-dark'
                  }`}
                >
                  Place
                </Text>
              </Pressable>
              <Pressable
                testID="mode-adjust"
                onPress={() => setMode('adjust')}
                className={`rounded-full border px-3 py-1 ${
                  mode === 'adjust' ? 'border-brand bg-brand dark:border-accent dark:bg-accent' : 'border-gray-300 dark:border-border-dark'
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    mode === 'adjust' ? 'text-white dark:text-gray-900' : 'text-text-secondary dark:text-text-secondary-dark'
                  }`}
                >
                  Adjust
                </Text>
              </Pressable>
            </View>
          </View>

          {candidates.length > 0 && (
            <View className="mb-3 flex-row flex-wrap">
              {candidates.map((candidate) => (
                <Button
                  key={candidate.id}
                  testID={`copy-from-${candidate.id}`}
                  variant="link"
                  label={`Copy lines from ${candidate.name} (${candidate.mappedHoles})`}
                  onPress={() => handleCopyFrom(candidate)}
                  containerClassName="mr-3"
                  textClassName="text-xs"
                />
              ))}
            </View>
          )}

          {saveError && <Text className="mb-2 text-sm text-red-600">{saveError}</Text>}

          <View className="flex-row">
            <Button
              testID="undo-button"
              variant="secondary"
              label="Undo"
              onPress={handleUndo}
              containerClassName="mr-2 flex-1"
              textClassName="text-sm"
            />
            <Button
              testID="clear-hole-button"
              variant="secondary"
              label="Clear"
              onPress={() => setActivePath([])}
              containerClassName="mr-2 flex-1"
              textClassName="text-sm"
            />
            <Button
              testID="next-hole-button"
              label={isLastHole ? 'Done' : 'Next hole'}
              disabled={saving}
              onPress={handleNext}
              containerClassName="flex-1"
              textClassName="text-sm"
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: name ? `${name} · lines` : 'Hole lines',
          // The app's own back arrow, not a one-off - it just needs to ask
          // about unsaved lines before leaving.
          headerLeft: () => <HeaderBackButton fallback="/courses" onPress={handleBack} />,
        }}
      />
      {body}
      <ConfirmDialog
        visible={leaveDialogOpen}
        title="Discard unsaved lines?"
        message="The lines you drew since the last save will be lost."
        confirmLabel="Discard"
        onCancel={() => setLeaveDialogOpen(false)}
        onConfirm={() => {
          setLeaveDialogOpen(false);
          router.back();
        }}
      />
    </>
  );
}
