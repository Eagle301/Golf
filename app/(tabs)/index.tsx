import { useCallback } from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useProfile } from '@/lib/hooks/useProfile';
import { useScoreDifferentialHistory } from '@/lib/hooks/useScoreDifferentialHistory';
import { useRoundStats } from '@/lib/hooks/useRoundStats';
import { ScoreDifferentialChart } from '@/components/dashboard/ScoreDifferentialChart';
import { FairwayDistributionChart } from '@/components/dashboard/FairwayDistributionChart';
import { GirDonutChart } from '@/components/dashboard/GirDonutChart';
import { ScoringByParChart } from '@/components/dashboard/ScoringByParChart';
import { ScoringCategoryBreakdown } from '@/components/dashboard/ScoringCategoryBreakdown';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';

export default function DashboardScreen() {
  const { handicap, fullName, loading, refetch } = useProfile();
  const { rounds: differentialRounds, loading: differentialLoading, refetch: refetchDifferentials } =
    useScoreDifferentialHistory();
  const { stats, loading: statsLoading, refetch: refetchStats } = useRoundStats();

  // Refetch every time this tab regains focus (e.g. after finishing a round
  // updates the handicap) so it doesn't require an app restart to catch up.
  useFocusEffect(
    useCallback(() => {
      refetch();
      refetchDifferentials();
      refetchStats();
    }, [refetch, refetchDifferentials, refetchStats])
  );

  return (
    <ScrollView
      className="flex-1 bg-background dark:bg-background-dark"
      contentContainerClassName="items-center px-4 pt-8"
    >
      <View className="w-full flex-row items-center justify-between" testID="dashboard-header">
        <View className="flex-row items-center">
          <Avatar testID="dashboard-avatar" name={fullName} />
          <Text
            testID="dashboard-user-name"
            className="ml-3 text-lg font-semibold text-text-primary dark:text-text-primary-dark"
          >
            {fullName ?? 'Golfer'}
          </Text>
        </View>
        <View className="items-end" testID="handicap-card">
          <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">Handicap</Text>
          {loading ? (
            <ActivityIndicator testID="handicap-loading" />
          ) : (
            <Text
              className="text-2xl font-bold text-text-primary dark:text-text-primary-dark"
              testID="handicap-value"
            >
              {handicap != null ? handicap.toFixed(1) : '—'}
            </Text>
          )}
        </View>
      </View>

      <Card className="mt-6 w-full px-2 py-4" testID="differential-chart-card">
        {differentialLoading ? (
          <ActivityIndicator testID="differential-chart-loading" />
        ) : (
          <ScoreDifferentialChart rounds={differentialRounds} />
        )}
      </Card>

      <View className="mt-6 w-full flex-row">
        <Card className="mr-2 flex-1 px-4 py-4" testID="fairway-distribution-card">
          {statsLoading ? (
            <ActivityIndicator testID="fairway-distribution-loading" />
          ) : (
            <FairwayDistributionChart
              distribution={stats?.fairwayDistribution ?? { leftPct: 0, hitPct: 0, rightPct: 0, naPct: 0 }}
            />
          )}
        </Card>

        <Card className="ml-2 flex-1 items-center px-4 py-4" testID="gir-donut-card">
          {statsLoading ? (
            <ActivityIndicator testID="gir-donut-loading" />
          ) : (
            <GirDonutChart percentage={stats?.girPercentage ?? 0} />
          )}
        </Card>
      </View>

      <View className="mt-4 w-full flex-row">
        <Card className="mr-2 flex-1 items-center px-4 py-4" testID="average-score-card">
          <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">Avg. 18-hole score</Text>
          {statsLoading ? (
            <ActivityIndicator testID="average-score-loading" />
          ) : (
            <>
              <Text
                testID="dashboard-average-score"
                className="text-2xl font-bold text-text-primary dark:text-text-primary-dark"
              >
                {stats?.averageScore != null ? stats.averageScore.toFixed(1) : '—'}
              </Text>
              <ScoringCategoryBreakdown
                averages={
                  stats?.scoringCategoryAverages ?? {
                    eagle: 0,
                    birdie: 0,
                    par: 0,
                    bogey: 0,
                    double: 0,
                    doubleOrWorse: 0,
                  }
                }
              />
            </>
          )}
        </Card>

        <Card className="ml-2 flex-1 px-4 py-4" testID="scoring-by-par-card">
          {statsLoading ? (
            <ActivityIndicator testID="scoring-by-par-loading" />
          ) : (
            <ScoringByParChart scoreByPar={stats?.scoreByPar ?? { par3: null, par4: null, par5: null }} />
          )}
        </Card>
      </View>
    </ScrollView>
  );
}
