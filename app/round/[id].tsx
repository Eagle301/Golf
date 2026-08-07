import { useCallback, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, Modal } from 'react-native';
import { useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useActiveRound } from '@/lib/hooks/useActiveRound';
import { useParIndicatorPreference } from '@/lib/hooks/useParIndicatorPreference';
import { syncPendingRounds } from '@/lib/hooks/useRoundSync';
import { addPendingRound } from '@/lib/offline/pendingRounds';
import {
  calculateGir,
  calculateRoundDifferential,
  calculateCourseHandicap,
  calculateTotalNetPar,
  calculateNetParForNine,
  calculateBruttoScore,
  calculatePoints,
  toSuperscript,
  strokesForHole,
} from '@/lib/calculations';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { RoundOverviewScorecard } from '@/components/round/RoundOverviewScorecard';
import { Scorecard } from '@/components/round/Scorecard';
import type { HoleLogEntry } from '@/lib/offline/types';
import type { FairwayHit } from '@/types/database';

const SCORE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const PUTTS_OPTIONS = [0, 1, 2, 3, 4];

const MISS_OPTIONS: { value: FairwayHit; label: string }[] = [
  { value: 'missed_left', label: 'Left' },
  { value: 'missed_right', label: 'Right' },
  { value: 'missed_short', label: 'Shit' },
];

export default function LiveRoundScreen() {
  const router = useRouter();
  const { activeRound, loading, updateActiveRound, discardActiveRound, refetch } = useActiveRound();
  const { preference: parIndicatorPreference } = useParIndicatorPreference();
  const [finishing, setFinishing] = useState(false);
  const [missModalOpen, setMissModalOpen] = useState(false);
  const [discardModalOpen, setDiscardModalOpen] = useState(false);

  // Re-sync from storage whenever this screen regains focus (e.g. returning
  // from the mid-round Scorecard after jumping to a different hole) - our
  // local state otherwise wouldn't see a change persisted by that other
  // screen's own useActiveRound() instance.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  function handleDiscard() {
    setDiscardModalOpen(true);
  }

  async function confirmDiscard() {
    setDiscardModalOpen(false);
    await discardActiveRound();
    // replace, not push: this round is gone, so it shouldn't be possible to
    // navigate "back" into it - and repeated push here was piling up
    // duplicate (tabs) entries in the stack every round, which is what made
    // the header back button eventually stop responding.
    router.replace('/rounds');
  }

  let body: React.ReactNode;

  if (loading) {
    body = (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator testID="round-loading" />
      </View>
    );
  } else if (!activeRound) {
    body = (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark">
        <Text className="text-center text-text-secondary dark:text-text-secondary-dark">No round in progress.</Text>
      </View>
    );
  } else {
    const { currentHoleIndex, hole_count, holeLogs } = activeRound;
    const isOverview = currentHoleIndex === -1;
    const isReviewPanel = currentHoleIndex === hole_count;
    const isFinishPanel = currentHoleIndex > hole_count;
    const hole = !isOverview && !isReviewPanel && !isFinishPanel ? holeLogs[currentHoleIndex] : null;

    const courseHandicap =
      activeRound.handicap_at_start != null &&
      activeRound.course_rating != null &&
      activeRound.slope_rating != null &&
      activeRound.total_par != null
        ? calculateCourseHandicap(
            activeRound.handicap_at_start,
            activeRound.slope_rating,
            activeRound.course_rating,
            activeRound.total_par,
            activeRound.hole_count
          )
        : null;

    const incompleteHoleNumbers = holeLogs
      .filter((h) => h.score === null || h.putts === null)
      .map((h) => h.hole_number);

    function updateHole(updated: HoleLogEntry) {
      if (!activeRound) return;
      const newHoleLogs = activeRound.holeLogs.map((h) =>
        h.hole_number === updated.hole_number ? updated : h
      );
      updateActiveRound({ ...activeRound, holeLogs: newHoleLogs });
    }

    function goNext() {
      if (!activeRound) return;
      updateActiveRound({ ...activeRound, currentHoleIndex: activeRound.currentHoleIndex + 1 });
    }

    function goPrevious() {
      if (!activeRound) return;
      updateActiveRound({ ...activeRound, currentHoleIndex: activeRound.currentHoleIndex - 1 });
    }

    function goToHole(holeNumber: number) {
      if (!activeRound) return;
      updateActiveRound({ ...activeRound, currentHoleIndex: holeNumber - 1 });
    }

    function updateNotes(notes: string) {
      if (!activeRound) return;
      updateActiveRound({ ...activeRound, notes });
    }

    async function handleFinish() {
      if (!activeRound) return;
      if (incompleteHoleNumbers.length > 0) return;
      setFinishing(true);
      const finalHoleLogs = activeRound.holeLogs.map((h) => ({
        ...h,
        gir:
          !h.gir_overridden && h.score !== null && h.putts !== null
            ? calculateGir(h.score, h.putts, h.par)
            : h.gir,
      }));
      const totalScore = finalHoleLogs.reduce((sum, h) => sum + (h.score ?? 0), 0);
      const totalPutts = finalHoleLogs.reduce((sum, h) => sum + (h.putts ?? 0), 0);
      const bruttoScore = calculateBruttoScore(finalHoleLogs, courseHandicap, activeRound.hole_count);
      const scoreDifferential =
        activeRound.course_rating != null && activeRound.slope_rating != null
          ? activeRound.hole_count === 9
            ? calculateRoundDifferential(
                bruttoScore,
                activeRound.course_rating,
                activeRound.slope_rating,
                9,
                calculateNetParForNine(
                  finalHoleLogs.reduce((sum, h) => sum + h.par, 0),
                  courseHandicap
                )
              )
            : calculateRoundDifferential(bruttoScore, activeRound.course_rating, activeRound.slope_rating, 18)
          : null;

      await addPendingRound({
        localId: activeRound.localId,
        course_id: activeRound.course_id,
        date_played: activeRound.date_played,
        notes: activeRound.notes,
        total_score: totalScore,
        total_putts: totalPutts,
        score_differential: scoreDifferential,
        handicap_at_time: activeRound.handicap_at_start,
        holeLogs: finalHoleLogs,
      });
      await discardActiveRound();
      await syncPendingRounds();
      setFinishing(false);
      // replace, not push - see the comment in confirmDiscard above.
      router.replace('/rounds');
    }

    if (isFinishPanel) {
      body = (
        <ScrollView className="flex-1 bg-background px-4 pt-4 dark:bg-background-dark" testID="finish-panel">
          <Text className="mb-2 text-xl font-semibold text-text-primary dark:text-text-primary-dark">
            Finish Round
          </Text>
          <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">Notes</Text>
          <TextInput
            testID="round-notes-input"
            className="mb-4 rounded border border-gray-300 px-3 py-2 text-text-primary dark:border-border-dark dark:bg-surface-dark dark:text-text-primary-dark"
            value={activeRound.notes}
            onChangeText={updateNotes}
            placeholder="How did it go?"
            multiline
          />
          <Button
            testID="previous-hole-button"
            variant="secondary"
            label="Back to Review"
            onPress={goPrevious}
            containerClassName="mb-3"
          />
          {incompleteHoleNumbers.length > 0 && (
            <View
              testID="incomplete-holes-warning"
              className="mb-3 rounded border border-accent-gold bg-accent-gold/15 px-3 py-2 dark:border-accent-gold-dark dark:bg-accent-gold-dark/15"
            >
              <Text className="text-sm text-text-primary dark:text-text-primary-dark">
                Finish {incompleteHoleNumbers.length === 1 ? 'hole' : 'holes'}{' '}
                {incompleteHoleNumbers.join(', ')} before submitting.
              </Text>
            </View>
          )}
          <Button
            testID="finish-round-button"
            variant="primary"
            disabled={finishing || incompleteHoleNumbers.length > 0}
            label={finishing ? 'Finishing...' : 'Finish Round'}
            onPress={handleFinish}
            containerClassName="mb-3"
          />
          <Button
            testID="discard-round-button"
            variant="destructive"
            label="Discard Round"
            onPress={handleDiscard}
            containerClassName="mb-8"
          />
        </ScrollView>
      );
    } else if (isReviewPanel) {
      body = (
        <ScrollView className="flex-1 bg-background px-4 pt-4 dark:bg-background-dark" testID="review-panel">
          <Text className="mb-2 text-xl font-semibold text-text-primary dark:text-text-primary-dark">
            Review Scorecard
          </Text>
          <Text className="mb-3 text-sm text-text-secondary dark:text-text-secondary-dark">
            Tap a hole number to go back and edit it.
          </Text>
          {incompleteHoleNumbers.length > 0 && (
            <Text
              testID="review-incomplete-note"
              className="mb-3 text-sm text-accent-gold dark:text-accent-gold-dark"
            >
              Not yet complete: {incompleteHoleNumbers.join(', ')}
            </Text>
          )}

          <Scorecard holes={holeLogs} courseHandicap={courseHandicap} onSelectHole={goToHole} />

          <Button
            testID="previous-hole-button"
            variant="secondary"
            label={`Back to Hole ${hole_count}`}
            onPress={goPrevious}
            containerClassName="mb-3 mt-4"
          />
          <Button testID="continue-to-finish-button" variant="primary" label="Continue" onPress={goNext} containerClassName="mb-3" />
          <Button
            testID="discard-round-button"
            variant="destructive"
            label="Discard Round"
            onPress={handleDiscard}
            containerClassName="mb-8"
          />
        </ScrollView>
      );
    } else if (isOverview) {
      body = (
        <ScrollView className="flex-1 bg-background px-4 pt-4 dark:bg-background-dark" testID="overview-panel">
          <Text className="mb-1 text-xl font-semibold text-text-primary dark:text-text-primary-dark">
            {activeRound.course_name}
          </Text>
          <Card className="mb-4 flex-row flex-wrap justify-between px-4 py-3">
            <View>
              <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">Course Handicap</Text>
              <Text
                testID="overview-course-handicap"
                className="text-lg font-semibold text-text-primary dark:text-text-primary-dark"
              >
                {courseHandicap ?? '-'}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">Par</Text>
              <Text
                testID="overview-total-par"
                className="text-lg font-semibold text-text-primary dark:text-text-primary-dark"
              >
                {activeRound.total_par ?? '-'}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">Net Par</Text>
              <Text
                testID="overview-total-net-par"
                className="text-lg font-semibold text-text-primary dark:text-text-primary-dark"
              >
                {calculateTotalNetPar(holeLogs, courseHandicap, hole_count)}
              </Text>
            </View>
            <View>
              <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">Length</Text>
              <Text
                testID="overview-total-length"
                className="text-lg font-semibold text-text-primary dark:text-text-primary-dark"
              >
                {activeRound.total_length_meters ?? '-'} m
              </Text>
            </View>
          </Card>

          <RoundOverviewScorecard holes={holeLogs} courseHandicap={courseHandicap} />

          <Button
            testID="start-round-button"
            variant="primary"
            label="Start Round"
            onPress={goNext}
            containerClassName="mb-3 mt-4"
          />
          <Button
            testID="discard-round-button"
            variant="destructive"
            label="Discard Round"
            onPress={handleDiscard}
            containerClassName="mb-8"
          />
        </ScrollView>
      );
    } else if (hole) {
      const canAdvance = hole.score !== null && hole.putts !== null;
      const gir =
        !hole.gir_overridden && hole.score !== null && hole.putts !== null
          ? calculateGir(hole.score, hole.putts, hole.par)
          : hole.gir;
      const fairwayIsNo = hole.fairway_hit != null && hole.fairway_hit !== 'yes';

      const extraStrokes =
        courseHandicap != null && hole.stroke_index != null
          ? strokesForHole(courseHandicap, hole.stroke_index, hole_count)
          : 0;
      const adjustedPar = hole.par + extraStrokes;
      const points = hole.score !== null ? calculatePoints(hole.score - extraStrokes, hole.par) : null;

      function selectMiss(value: FairwayHit) {
        if (!hole) return;
        updateHole({ ...hole, fairway_hit: value });
        setMissModalOpen(false);
      }

      body = (
        <ScrollView className="flex-1 bg-background px-4 pt-4 dark:bg-background-dark" testID="hole-view">
          <Text className="text-xl font-semibold text-text-primary dark:text-text-primary-dark">
            Hole {hole.hole_number} · Par {hole.par}
            {extraStrokes > 0 ? ` (${adjustedPar})` : ''}
            {hole.length_meters != null ? (
              <Text
                testID="hole-length"
                className="text-base font-normal text-text-secondary dark:text-text-secondary-dark"
              >
                {' '}
                · {hole.length_meters}m
              </Text>
            ) : null}
          </Text>

          <Text className="mb-1 mt-4 text-sm font-medium text-text-primary dark:text-text-primary-dark">
            Score
          </Text>
          <View className="mb-4 flex-row flex-wrap">
            {SCORE_OPTIONS.map((n) => {
              const isPar =
                parIndicatorPreference === 'off'
                  ? false
                  : parIndicatorPreference === 'net_par'
                    ? n === adjustedPar
                    : n === hole.par;
              return (
              <View
                key={n}
                style={hole.score === n ? { zIndex: 10 } : undefined}
                className="relative w-1/3 p-1"
              >
                <Pressable
                  testID={`score-${n}`}
                  onPress={() => updateHole({ ...hole, score: n })}
                  className={`h-14 w-full items-center justify-center rounded-xl border-2 ${
                    hole.score === n
                      ? 'border-transparent bg-brand dark:bg-accent-gold-dark'
                      : isPar
                        ? 'border-gray-900 bg-gray-200 dark:border-gray-100 dark:bg-gray-700'
                        : 'border-transparent bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <Text
                    className={`text-base font-medium ${
                      hole.score === n
                        ? 'text-white dark:text-gray-900'
                        : 'text-text-primary dark:text-text-primary-dark'
                    }`}
                  >
                    {n}
                  </Text>
                </Pressable>
                {hole.score === n && points !== null && (
                  <View
                    style={{ zIndex: 10, elevation: 10 }}
                    className="absolute -right-2 -top-2 h-8 min-w-8 items-center justify-center rounded-full border-2 border-white bg-green-700 px-1.5 dark:border-background-dark dark:bg-accent-gold-dark"
                  >
                    <Text
                      testID="hole-points-badge"
                      className="text-lg font-extrabold text-white dark:text-gray-900"
                    >
                      {toSuperscript(points)}
                    </Text>
                  </View>
                )}
              </View>
              );
            })}
          </View>

          <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">Putts</Text>
          <View className="mb-4 flex-row">
            {PUTTS_OPTIONS.map((n) => (
              <View key={n} className="flex-1 px-1">
                <Pressable
                  testID={`putts-${n}`}
                  onPress={() => updateHole({ ...hole, putts: n })}
                  className={`h-14 w-full items-center justify-center rounded-xl ${
                    hole.putts === n
                      ? 'bg-brand dark:bg-accent-gold-dark'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <Text
                    className={`text-lg font-medium ${
                      hole.putts === n
                        ? 'text-white dark:text-gray-900'
                        : 'text-text-primary dark:text-text-primary-dark'
                    }`}
                  >
                    {n === 4 ? '4+' : n}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>

          <Text className="mb-1 text-sm font-medium text-text-primary dark:text-text-primary-dark">
            Fairway
          </Text>
          <View className="mb-3 flex-row">
            <Pressable
              testID="fairway-yes"
              onPress={() => updateHole({ ...hole, fairway_hit: 'yes' })}
              className={`mr-1.5 flex-1 items-center rounded-xl py-3.5 ${
                hole.fairway_hit === 'yes'
                  ? 'bg-brand dark:bg-accent-gold-dark'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <Text
                className={`font-medium ${
                  hole.fairway_hit === 'yes'
                    ? 'text-white dark:text-gray-900'
                    : 'text-text-primary dark:text-text-primary-dark'
                }`}
              >
                Yes
              </Text>
            </Pressable>
            <Pressable
              testID="fairway-no"
              onPress={() => setMissModalOpen(true)}
              className={`ml-1.5 flex-1 items-center rounded-xl py-3.5 ${
                fairwayIsNo ? 'bg-brand dark:bg-accent-gold-dark' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              <Text
                className={`font-medium ${
                  fairwayIsNo
                    ? 'text-white dark:text-gray-900'
                    : 'text-text-primary dark:text-text-primary-dark'
                }`}
              >
                {fairwayIsNo
                  ? `No (${MISS_OPTIONS.find((o) => o.value === hole.fairway_hit)?.label})`
                  : 'No'}
              </Text>
            </Pressable>
          </View>

          <Modal
            visible={missModalOpen}
            transparent
            animationType="fade"
            onRequestClose={() => setMissModalOpen(false)}
          >
            <Pressable
              testID="miss-modal-backdrop"
              className="flex-1 items-center justify-center bg-black/50"
              onPress={() => setMissModalOpen(false)}
            >
              <Card className="w-72 p-4">
                <Text className="mb-3 text-center text-base font-medium text-text-primary dark:text-text-primary-dark">
                  Missed which way?
                </Text>
                <View className="flex-row">
                  {MISS_OPTIONS.slice(0, 2).map((opt, i) => (
                    <Pressable
                      key={opt.value}
                      testID={`miss-${opt.value}`}
                      onPress={() => selectMiss(opt.value)}
                      className={`flex-1 items-center rounded-xl bg-gray-200 py-4 dark:bg-gray-700 ${
                        i === 0 ? 'mr-1.5' : 'ml-1.5'
                      }`}
                    >
                      <Text className="font-medium text-text-primary dark:text-text-primary-dark">
                        {opt.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                {MISS_OPTIONS.slice(2).map((opt) => (
                  <Pressable
                    key={opt.value}
                    testID={`miss-${opt.value}`}
                    onPress={() => selectMiss(opt.value)}
                    className="mt-3 items-center rounded-xl bg-gray-200 py-4 dark:bg-gray-700"
                  >
                    <Text className="font-medium text-text-primary dark:text-text-primary-dark">{opt.label}</Text>
                  </Pressable>
                ))}
              </Card>
            </Pressable>
          </Modal>

          <Pressable
            testID="gir-toggle"
            onPress={() => updateHole({ ...hole, gir: !gir, gir_overridden: true })}
            className={`mb-3 items-center rounded py-3 ${
              gir ? 'bg-brand dark:bg-accent-gold-dark' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <Text
              className={
                gir ? 'text-white dark:text-gray-900' : 'text-text-primary dark:text-text-primary-dark'
              }
            >
              GIR: {gir ? 'Yes' : 'No'}
            </Text>
          </Pressable>

          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
              Penalties
            </Text>
            <View className="flex-row items-center">
              <Pressable
                testID="penalties-minus"
                onPress={() => updateHole({ ...hole, penalties: Math.max(0, hole.penalties - 1) })}
                className="h-8 w-8 items-center justify-center rounded bg-gray-200 dark:bg-gray-700"
              >
                <Text className="text-text-primary dark:text-text-primary-dark">-</Text>
              </Pressable>
              <Text className="mx-3 text-text-primary dark:text-text-primary-dark">{hole.penalties}</Text>
              <Pressable
                testID="penalties-plus"
                onPress={() => updateHole({ ...hole, penalties: hole.penalties + 1 })}
                className="h-8 w-8 items-center justify-center rounded bg-gray-200 dark:bg-gray-700"
              >
                <Text className="text-text-primary dark:text-text-primary-dark">+</Text>
              </Pressable>
            </View>
          </View>

          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
              Chip Shots
            </Text>
            <View className="flex-row items-center">
              <Pressable
                testID="chip-shots-minus"
                onPress={() => updateHole({ ...hole, chip_shots: Math.max(0, hole.chip_shots - 1) })}
                className="h-8 w-8 items-center justify-center rounded bg-gray-200 dark:bg-gray-700"
              >
                <Text className="text-text-primary dark:text-text-primary-dark">-</Text>
              </Pressable>
              <Text className="mx-3 text-text-primary dark:text-text-primary-dark">{hole.chip_shots}</Text>
              <Pressable
                testID="chip-shots-plus"
                onPress={() => updateHole({ ...hole, chip_shots: hole.chip_shots + 1 })}
                className="h-8 w-8 items-center justify-center rounded bg-gray-200 dark:bg-gray-700"
              >
                <Text className="text-text-primary dark:text-text-primary-dark">+</Text>
              </Pressable>
            </View>
          </View>

          <View className="mb-8 flex-row justify-between">
            <Button
              testID="previous-hole-button"
              variant="secondary"
              label={currentHoleIndex === 0 ? 'Overview' : 'Previous'}
              onPress={goPrevious}
              containerClassName="flex-1 mr-2"
            />
            <Button
              testID="next-hole-button"
              variant="primary"
              disabled={!canAdvance}
              label="Next"
              onPress={goNext}
              containerClassName="flex-1 ml-2"
            />
          </View>

          <Button
            testID="discard-round-button"
            variant="destructive"
            label="Discard Round"
            onPress={handleDiscard}
            containerClassName="mb-8"
          />
        </ScrollView>
      );
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Pressable
              testID="header-back-button"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/rounds'))}
              className="ml-2"
              hitSlop={8}
            >
              <Ionicons name="chevron-back" color="#FFFFFF" size={26} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable
              testID="scorecard-button"
              onPress={() => router.push({ pathname: '/round/scorecard', params: { id: 'active' } })}
              className="mr-2 rounded-full border border-white px-3 py-1.5"
              hitSlop={8}
            >
              <Text className="text-sm font-medium text-white">Scorecard</Text>
            </Pressable>
          ),
        }}
      />
      {body}
      <ConfirmDialog
        visible={discardModalOpen}
        title="Discard round?"
        message="This cannot be undone."
        confirmLabel="Discard"
        onCancel={() => setDiscardModalOpen(false)}
        onConfirm={confirmDiscard}
      />
    </>
  );
}
