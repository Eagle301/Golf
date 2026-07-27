import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Scorecard } from '@/components/round/Scorecard';
import { useActiveRound } from '@/lib/hooks/useActiveRound';
import { useRoundDetail, deleteRound } from '@/lib/hooks/useRoundDetail';
import { calculateCourseHandicap, calculateNetParDiff, formatRelativeToPar } from '@/lib/calculations';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';

export default function ScorecardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (id === 'active') {
    return <ActiveRoundScorecard />;
  }
  return <HistoricalRoundScorecard roundId={id} />;
}

function ActiveRoundScorecard() {
  const router = useRouter();
  const { activeRound, loading, updateActiveRound } = useActiveRound();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator testID="scorecard-loading" />
      </View>
    );
  }

  if (!activeRound) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark">
        <Text className="text-center text-text-secondary dark:text-text-secondary-dark">
          No round in progress.
        </Text>
      </View>
    );
  }

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

  function handleSelectHole(holeNumber: number) {
    if (!activeRound) return;
    updateActiveRound({ ...activeRound, currentHoleIndex: holeNumber - 1 });
    router.back();
  }

  const netParDiff = calculateNetParDiff(activeRound.holeLogs, courseHandicap, activeRound.hole_count);

  return (
    <ScrollView className="flex-1 bg-background p-4 dark:bg-background-dark" testID="scorecard-screen">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-xl font-semibold text-text-primary dark:text-text-primary-dark">
          {activeRound.course_name}
        </Text>
        <Text
          testID="scorecard-net-par-diff"
          className="text-xl font-bold text-text-primary dark:text-text-primary-dark"
        >
          {formatRelativeToPar(netParDiff)}
        </Text>
      </View>
      <Scorecard holes={activeRound.holeLogs} courseHandicap={courseHandicap} onSelectHole={handleSelectHole} />
    </ScrollView>
  );
}

function HistoricalRoundScorecard({ roundId }: { roundId: string }) {
  const router = useRouter();
  const { roundDetail, loading, error } = useRoundDetail(roundId);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    setDeleteModalOpen(false);
    setDeleting(true);
    await deleteRound(roundId);
    // replace, not push: this round is gone, so it shouldn't be possible to
    // navigate "back" into it.
    router.replace('/rounds');
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background dark:bg-background-dark">
        <ActivityIndicator testID="scorecard-loading" />
      </View>
    );
  }

  if (error || !roundDetail) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6 dark:bg-background-dark">
        <Text className="text-center text-red-600">{error ?? 'Round not found.'}</Text>
      </View>
    );
  }

  const courseHandicap =
    roundDetail.handicapAtTime != null && roundDetail.courseRating != null && roundDetail.slopeRating != null
      ? calculateCourseHandicap(
          roundDetail.handicapAtTime,
          roundDetail.slopeRating,
          roundDetail.courseRating,
          roundDetail.totalPar,
          roundDetail.holeCount
        )
      : null;

  const netParDiff = calculateNetParDiff(roundDetail.holes, courseHandicap, roundDetail.holeCount);

  return (
    <>
      <ScrollView className="flex-1 bg-background p-4 dark:bg-background-dark" testID="scorecard-screen">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-xl font-semibold text-text-primary dark:text-text-primary-dark">
            {roundDetail.courseName}
          </Text>
          <Text
            testID="scorecard-net-par-diff"
            className="text-xl font-bold text-text-primary dark:text-text-primary-dark"
          >
            {formatRelativeToPar(netParDiff)}
          </Text>
        </View>
        <Scorecard
          holes={roundDetail.holes}
          courseHandicap={courseHandicap}
          roundSummary={{
            courseHandicap,
            handicapIndex: roundDetail.handicapAtTime,
            scoreDifferential: roundDetail.scoreDifferential,
            courseRating: roundDetail.courseRating,
            slopeRating: roundDetail.slopeRating,
            totalPar: roundDetail.totalPar,
          }}
        />
        <Button
          testID="delete-round-button"
          variant="destructive"
          label="Delete Round"
          disabled={deleting}
          onPress={() => setDeleteModalOpen(true)}
          containerClassName="mb-8 mt-4"
        />
      </ScrollView>
      <ConfirmDialog
        visible={deleteModalOpen}
        title="Delete round?"
        message="This cannot be undone."
        confirmLabel="Delete"
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
