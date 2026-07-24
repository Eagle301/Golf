import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Scorecard } from '@/components/round/Scorecard';
import { useActiveRound } from '@/lib/hooks/useActiveRound';
import { useRoundDetail } from '@/lib/hooks/useRoundDetail';
import { calculateCourseHandicap } from '@/lib/calculations';

export default function ScorecardScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (id === 'active') {
    return <ActiveRoundScorecard />;
  }
  return <HistoricalRoundScorecard roundId={id} />;
}

function ActiveRoundScorecard() {
  const { activeRound, loading } = useActiveRound();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator testID="scorecard-loading" />
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

  const courseHandicap =
    activeRound.handicap_at_start != null &&
    activeRound.course_rating != null &&
    activeRound.slope_rating != null &&
    activeRound.total_par != null
      ? calculateCourseHandicap(
          activeRound.handicap_at_start,
          activeRound.slope_rating,
          activeRound.course_rating,
          activeRound.total_par
        )
      : null;

  return (
    <ScrollView className="flex-1 bg-white p-4" testID="scorecard-screen">
      <Text className="mb-3 text-xl font-semibold">{activeRound.course_name}</Text>
      <Scorecard holes={activeRound.holeLogs} courseHandicap={courseHandicap} />
    </ScrollView>
  );
}

function HistoricalRoundScorecard({ roundId }: { roundId: string }) {
  const { roundDetail, loading, error } = useRoundDetail(roundId);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator testID="scorecard-loading" />
      </View>
    );
  }

  if (error || !roundDetail) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
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
          roundDetail.totalPar
        )
      : null;

  return (
    <ScrollView className="flex-1 bg-white p-4" testID="scorecard-screen">
      <Text className="mb-3 text-xl font-semibold">{roundDetail.courseName}</Text>
      <Scorecard holes={roundDetail.holes} courseHandicap={courseHandicap} />
    </ScrollView>
  );
}
