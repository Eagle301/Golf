import { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, Alert, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useActiveRound } from '@/lib/hooks/useActiveRound';
import { syncPendingRounds } from '@/lib/hooks/useRoundSync';
import { addPendingRound } from '@/lib/offline/pendingRounds';
import { calculateGir } from '@/lib/calculations';
import type { HoleLogEntry } from '@/lib/offline/types';
import type { FairwayHit } from '@/types/database';

const SCORE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const PUTTS_OPTIONS = [0, 1, 2, 3, 4];

const MISS_OPTIONS: { value: FairwayHit; label: string }[] = [
  { value: 'missed_left', label: 'Left' },
  { value: 'missed_right', label: 'Right' },
  { value: 'missed_short', label: 'Short' },
  { value: 'missed_long', label: 'Long' },
];

export default function LiveRoundScreen() {
  const router = useRouter();
  const { activeRound, loading, updateActiveRound, discardActiveRound } = useActiveRound();
  const [finishing, setFinishing] = useState(false);
  const [missModalOpen, setMissModalOpen] = useState(false);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator testID="round-loading" />
      </View>
    );
  }

  if (!activeRound) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-gray-500">No round in progress.</Text>
      </View>
    );
  }

  const { currentHoleIndex, hole_count, holeLogs } = activeRound;
  const isFinishPanel = currentHoleIndex >= hole_count;
  const hole = !isFinishPanel ? holeLogs[currentHoleIndex] : null;

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

  function updateNotes(notes: string) {
    if (!activeRound) return;
    updateActiveRound({ ...activeRound, notes });
  }

  async function handleFinish() {
    if (!activeRound) return;
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
    const totalPar = finalHoleLogs.reduce((sum, h) => sum + h.par, 0);

    await addPendingRound({
      localId: activeRound.localId,
      course_id: activeRound.course_id,
      date_played: activeRound.date_played,
      notes: activeRound.notes,
      total_score: totalScore,
      total_putts: totalPutts,
      score_differential: totalScore - totalPar,
      holeLogs: finalHoleLogs,
    });
    await discardActiveRound();
    syncPendingRounds();
    setFinishing(false);
    router.push('/rounds');
  }

  function handleDiscard() {
    Alert.alert('Discard round?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await discardActiveRound();
          router.push('/rounds');
        },
      },
    ]);
  }

  if (isFinishPanel) {
    return (
      <ScrollView className="flex-1 bg-white px-4 pt-4" testID="finish-panel">
        <Text className="mb-2 text-xl font-semibold">Finish Round</Text>
        <Text className="mb-1 text-sm font-medium text-gray-700">Notes</Text>
        <TextInput
          testID="round-notes-input"
          className="mb-4 rounded border border-gray-300 px-3 py-2"
          value={activeRound.notes}
          onChangeText={updateNotes}
          placeholder="How did it go?"
          multiline
        />
        <Pressable
          testID="previous-hole-button"
          onPress={goPrevious}
          className="mb-3 items-center rounded border border-gray-300 py-3"
        >
          <Text className="font-medium text-gray-700">Back to Hole {hole_count}</Text>
        </Pressable>
        <Pressable
          testID="finish-round-button"
          disabled={finishing}
          onPress={handleFinish}
          className="mb-3 items-center rounded bg-green-600 py-3"
        >
          <Text className="font-medium text-white">{finishing ? 'Finishing...' : 'Finish Round'}</Text>
        </Pressable>
        <Pressable testID="discard-round-button" onPress={handleDiscard} className="mb-8 items-center py-3">
          <Text className="font-medium text-red-600">Discard Round</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (!hole) return null;

  const canAdvance = hole.score !== null && hole.putts !== null;
  const gir =
    !hole.gir_overridden && hole.score !== null && hole.putts !== null
      ? calculateGir(hole.score, hole.putts, hole.par)
      : hole.gir;
  const fairwayIsNo = hole.fairway_hit != null && hole.fairway_hit !== 'yes';

  function selectMiss(value: FairwayHit) {
    if (!hole) return;
    updateHole({ ...hole, fairway_hit: value });
    setMissModalOpen(false);
  }

  return (
    <ScrollView className="flex-1 bg-white px-4 pt-4" testID="hole-view">
      <Text className="text-xl font-semibold">
        Hole {hole.hole_number} · Par {hole.par}
      </Text>

      <Text className="mb-1 mt-4 text-sm font-medium text-gray-700">Score</Text>
      <View className="mb-3 flex-row flex-wrap">
        {SCORE_OPTIONS.map((n) => (
          <Pressable
            key={n}
            testID={`score-${n}`}
            onPress={() => updateHole({ ...hole, score: n })}
            className={`mb-2 mr-2 h-10 w-10 items-center justify-center rounded-full ${
              hole.score === n ? 'bg-green-600' : 'bg-gray-200'
            }`}
          >
            <Text className={hole.score === n ? 'text-white' : 'text-gray-700'}>{n}</Text>
          </Pressable>
        ))}
      </View>

      <Text className="mb-1 text-sm font-medium text-gray-700">Putts</Text>
      <View className="mb-3 flex-row flex-wrap">
        {PUTTS_OPTIONS.map((n) => (
          <Pressable
            key={n}
            testID={`putts-${n}`}
            onPress={() => updateHole({ ...hole, putts: n })}
            className={`mb-2 mr-2 h-10 w-10 items-center justify-center rounded-full ${
              hole.putts === n ? 'bg-green-600' : 'bg-gray-200'
            }`}
          >
            <Text className={hole.putts === n ? 'text-white' : 'text-gray-700'}>
              {n === 4 ? '4+' : n}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text className="mb-1 text-sm font-medium text-gray-700">Fairway</Text>
      <View className="mb-3 flex-row">
        <Pressable
          testID="fairway-yes"
          onPress={() => updateHole({ ...hole, fairway_hit: 'yes' })}
          className={`mr-2 rounded px-4 py-2 ${
            hole.fairway_hit === 'yes' ? 'bg-green-600' : 'bg-gray-200'
          }`}
        >
          <Text className={hole.fairway_hit === 'yes' ? 'text-white' : 'text-gray-700'}>Yes</Text>
        </Pressable>
        <Pressable
          testID="fairway-no"
          onPress={() => setMissModalOpen(true)}
          className={`rounded px-4 py-2 ${fairwayIsNo ? 'bg-green-600' : 'bg-gray-200'}`}
        >
          <Text className={fairwayIsNo ? 'text-white' : 'text-gray-700'}>
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
          <View className="w-64 rounded bg-white p-4">
            <Text className="mb-3 text-center text-base font-medium">Missed which way?</Text>
            {MISS_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                testID={`miss-${opt.value}`}
                onPress={() => selectMiss(opt.value)}
                className="mb-2 items-center rounded bg-gray-200 py-3"
              >
                <Text className="text-gray-700">{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <Pressable
        testID="gir-toggle"
        onPress={() => updateHole({ ...hole, gir: !gir, gir_overridden: true })}
        className={`mb-3 items-center rounded py-3 ${gir ? 'bg-green-600' : 'bg-gray-200'}`}
      >
        <Text className={gir ? 'text-white' : 'text-gray-700'}>GIR: {gir ? 'Yes' : 'No'}</Text>
      </Pressable>

      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-gray-700">Penalties</Text>
        <View className="flex-row items-center">
          <Pressable
            testID="penalties-minus"
            onPress={() => updateHole({ ...hole, penalties: Math.max(0, hole.penalties - 1) })}
            className="h-8 w-8 items-center justify-center rounded bg-gray-200"
          >
            <Text>-</Text>
          </Pressable>
          <Text className="mx-3">{hole.penalties}</Text>
          <Pressable
            testID="penalties-plus"
            onPress={() => updateHole({ ...hole, penalties: hole.penalties + 1 })}
            className="h-8 w-8 items-center justify-center rounded bg-gray-200"
          >
            <Text>+</Text>
          </Pressable>
        </View>
      </View>

      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-sm font-medium text-gray-700">Chip Shots</Text>
        <View className="flex-row items-center">
          <Pressable
            testID="chip-shots-minus"
            onPress={() => updateHole({ ...hole, chip_shots: Math.max(0, hole.chip_shots - 1) })}
            className="h-8 w-8 items-center justify-center rounded bg-gray-200"
          >
            <Text>-</Text>
          </Pressable>
          <Text className="mx-3">{hole.chip_shots}</Text>
          <Pressable
            testID="chip-shots-plus"
            onPress={() => updateHole({ ...hole, chip_shots: hole.chip_shots + 1 })}
            className="h-8 w-8 items-center justify-center rounded bg-gray-200"
          >
            <Text>+</Text>
          </Pressable>
        </View>
      </View>

      <View className="mb-8 flex-row justify-between">
        <Pressable
          testID="previous-hole-button"
          disabled={currentHoleIndex === 0}
          onPress={goPrevious}
          className={`flex-1 mr-2 items-center rounded py-3 ${
            currentHoleIndex === 0 ? 'bg-gray-200' : 'bg-gray-300'
          }`}
        >
          <Text className="font-medium text-gray-700">Previous</Text>
        </Pressable>
        <Pressable
          testID="next-hole-button"
          disabled={!canAdvance}
          onPress={goNext}
          className={`flex-1 ml-2 items-center rounded py-3 ${canAdvance ? 'bg-green-600' : 'bg-gray-300'}`}
        >
          <Text className="font-medium text-white">Next</Text>
        </Pressable>
      </View>

      <Pressable testID="discard-round-button" onPress={handleDiscard} className="mb-8 items-center py-3">
        <Text className="font-medium text-red-600">Discard Round</Text>
      </Pressable>
    </ScrollView>
  );
}
