import { useCallback, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, Pressable } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useProfile } from '@/lib/hooks/useProfile';
import { useScoreDifferentialHistory } from '@/lib/hooks/useScoreDifferentialHistory';
import { useRoundStats } from '@/lib/hooks/useRoundStats';
import { ScoreDifferentialChart } from '@/components/dashboard/ScoreDifferentialChart';
import { FairwayDistributionChart } from '@/components/dashboard/FairwayDistributionChart';
import { GirDonutChart } from '@/components/dashboard/GirDonutChart';
import { ScoringByParChart } from '@/components/dashboard/ScoringByParChart';
import { ScoringCategoryBreakdown } from '@/components/dashboard/ScoringCategoryBreakdown';
import { PuttsDistributionChart } from '@/components/dashboard/PuttsDistributionChart';
import { StatBarRow, toneForHigherBetter, toneForLowerBetter } from '@/components/dashboard/StatBarRow';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';

// Used only until the row below has been measured for the first time.
const FALLBACK_COMPACT_CARD_HEIGHT = 208;

function formatPct(pct: number | null | undefined): string {
  return pct != null ? `${Math.round(pct)}%` : '—';
}

// Absolute quality bands for the GIR-card breakdown bars: percentages read
// against amateur norms (30%+ is genuinely good, under 15% needs work);
// chips/round reads inverted - fewer is better.
const PCT_TONES = { good: 30, ok: 15 };
const CHIPS_TONES = { good: 7, ok: 12 };

function girPctRow(label: string, pct: number | null | undefined, testID: string) {
  return (
    <StatBarRow
      label={label}
      valueLabel={formatPct(pct)}
      fillPct={pct ?? null}
      tone={toneForHigherBetter(pct, PCT_TONES)}
      testID={testID}
    />
  );
}

export default function DashboardScreen() {
  const { handicap, fullName, loading, refetch } = useProfile();
  const { rounds: differentialRounds, loading: differentialLoading, refetch: refetchDifferentials } =
    useScoreDifferentialHistory();
  const { stats, loading: statsLoading, refetch: refetchStats } = useRoundStats();
  const [fairwayPuttsExpanded, setFairwayPuttsExpanded] = useState(false);
  const [girExpanded, setGirExpanded] = useState(false);
  // The avg-score/scoring-by-par row below is always mounted (it never
  // toggles away), so measuring it is stable - unlike measuring the GIR
  // card, which glitched every time it unmounted/remounted across the
  // expand/collapse toggle. The compact fairway/putts card and the GIR card
  // both get this exact height, so every stat card on the dashboard lines up.
  const [bottomRowHeight, setBottomRowHeight] = useState<number | null>(null);
  const compactCardHeight = bottomRowHeight ?? FALLBACK_COMPACT_CARD_HEIGHT;
  // The compact card's content area (its height minus the Card's own vertical
  // padding, py-4 = 16 top + 16 bottom), split into two explicit, equal
  // halves - fixed pixel heights rather than flex-1, so the split line's
  // position can't drift depending on how the two halves were last laid out.
  const compactHalfHeight = (compactCardHeight - 32) / 2;

  function measureBottomRowCard(height: number) {
    setBottomRowHeight((prev) => Math.max(prev ?? 0, height));
  }

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
      showsVerticalScrollIndicator={false}
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
        {!girExpanded && (
        <Pressable
          testID="fairway-putts-toggle"
          onPress={() => setFairwayPuttsExpanded((v) => !v)}
          className={`flex-1 ${fairwayPuttsExpanded ? '' : 'mr-2'}`}
        >
          <Card
            className={`flex-1 px-4 py-4 ${!fairwayPuttsExpanded ? 'overflow-hidden' : ''}`}
            style={!fairwayPuttsExpanded ? { height: compactCardHeight } : undefined}
            testID="fairway-distribution-card"
          >
            {statsLoading ? (
              <ActivityIndicator testID="fairway-distribution-loading" />
            ) : fairwayPuttsExpanded ? (
              <>
                <FairwayDistributionChart
                  distribution={stats?.fairwayDistribution ?? { leftPct: 0, hitPct: 0, rightPct: 0, naPct: 0 }}
                />
                <View className="mt-4 border-t border-gray-200 pt-4 dark:border-border-dark">
                  <PuttsDistributionChart
                    distribution={
                      stats?.puttsDistribution ?? {
                        putts0Pct: 0,
                        putts1Pct: 0,
                        putts2Pct: 0,
                        putts3Pct: 0,
                        putts4PlusPct: 0,
                      }
                    }
                    averagePerRound={stats?.averagePutts ?? null}
                  />
                </View>
              </>
            ) : (
              // Compact: split the card into two explicit, equal-height
              // halves, each vertically centering its bar - fixed pixel
              // heights (not flex-1) so the split line's position can't
              // drift depending on how the halves were laid out previously.
              <>
                <View style={{ height: compactHalfHeight, justifyContent: 'center' }}>
                  <FairwayDistributionChart
                    distribution={stats?.fairwayDistribution ?? { leftPct: 0, hitPct: 0, rightPct: 0, naPct: 0 }}
                    compact
                  />
                </View>
                <View
                  className="border-t border-gray-200 dark:border-border-dark"
                  style={{ height: compactHalfHeight, justifyContent: 'center' }}
                >
                  <PuttsDistributionChart
                    distribution={
                      stats?.puttsDistribution ?? {
                        putts0Pct: 0,
                        putts1Pct: 0,
                        putts2Pct: 0,
                        putts3Pct: 0,
                        putts4PlusPct: 0,
                      }
                    }
                    averagePerRound={stats?.averagePutts ?? null}
                    compact
                  />
                </View>
              </>
            )}
          </Card>
        </Pressable>
        )}

        {!fairwayPuttsExpanded && (
          // Pressable wrapper (mirroring the fairway side's) owns the flex-1
          // sizing; the Card itself carries no sizing classes. A flex item
          // that carries its own padding grows unevenly against a sibling
          // whose padding lives one level deeper - see fairway-distribution-card.
          <Pressable
            testID="gir-donut-toggle"
            onPress={() => setGirExpanded((v) => !v)}
            className={`flex-1 ${girExpanded ? '' : 'ml-2'}`}
          >
            <Card
              className={girExpanded ? 'px-4 py-4' : 'items-center px-4 py-4'}
              style={girExpanded ? undefined : { height: compactCardHeight, justifyContent: 'center' }}
              testID="gir-donut-card"
            >
              {statsLoading ? (
                <ActivityIndicator testID="gir-donut-loading" />
              ) : girExpanded ? (
                // Expanded: breakdown list on the left, the same donut on the
                // right. The fairway/putts card is hidden while expanded, the
                // same way this card hides when that one expands.
                <View className="flex-row items-center">
                  <View className="mr-4 flex-1" testID="gir-breakdown">
                    {girPctRow('GIR Par 3', stats?.girByPar.par3, 'gir-par3-value')}
                    {girPctRow('GIR Par 4', stats?.girByPar.par4, 'gir-par4-value')}
                    {girPctRow('GIR Par 5', stats?.girByPar.par5, 'gir-par5-value')}
                    {girPctRow('Scrambling', stats?.scramblingPercentage, 'gir-scrambling-value')}
                    <StatBarRow
                      label="Chips/round"
                      valueLabel={stats?.chipsPerRound != null ? stats.chipsPerRound.toFixed(1) : '—'}
                      // Scale the bar against 18 (a chip on every hole).
                      fillPct={stats?.chipsPerRound != null ? (stats.chipsPerRound / 18) * 100 : null}
                      tone={toneForLowerBetter(stats?.chipsPerRound, CHIPS_TONES)}
                      testID="gir-chips-value"
                    />
                  </View>
                  <GirDonutChart percentage={stats?.girPercentage ?? 0} />
                </View>
              ) : (
                <GirDonutChart percentage={stats?.girPercentage ?? 0} />
              )}
            </Card>
          </Pressable>
        )}
      </View>

      <View className="mt-4 w-full flex-row">
        <Card
          className="mr-2 flex-1 items-center px-4 py-4"
          testID="average-score-card"
          onLayout={(e) => measureBottomRowCard(e.nativeEvent.layout.height)}
        >
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

        <Card
          className="ml-2 flex-1 px-4 py-4"
          testID="scoring-by-par-card"
          onLayout={(e) => measureBottomRowCard(e.nativeEvent.layout.height)}
        >
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
