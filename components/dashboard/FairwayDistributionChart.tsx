import { View, Text } from 'react-native';

interface FairwayDistributionChartProps {
  distribution: { leftPct: number; hitPct: number; rightPct: number; naPct: number };
  /** Collapsed layout: header shows Hit% instead of N/A%, and the Left/Hit/Right legend is hidden. */
  compact?: boolean;
}

/** Horizontal stacked bar: % of fairways missed left, hit, missed right. */
export function FairwayDistributionChart({ distribution, compact = false }: FairwayDistributionChartProps) {
  const { leftPct, hitPct, rightPct, naPct } = distribution;
  const hasData = leftPct + hitPct + rightPct > 0;

  return (
    <View testID="fairway-distribution-chart">
      <View className="mb-2 flex-row items-baseline justify-between">
        <Text className="text-sm font-medium text-text-primary dark:text-text-primary-dark">Fairways Hit</Text>
        {compact ? (
          <Text testID="fairway-hit-stat" className="text-sm font-bold text-green-700">
            Hit {hitPct.toFixed(0)}%
          </Text>
        ) : (
          <Text
            testID="fairway-na-stat"
            className="text-sm font-bold text-text-secondary dark:text-text-secondary-dark"
          >
            N/A {naPct.toFixed(0)}%
          </Text>
        )}
      </View>
      {hasData ? (
        <>
          <View className="h-5 w-full flex-row overflow-hidden rounded-full bg-gray-100">
            {leftPct > 0 && <View testID="fairway-segment-left" style={{ flex: leftPct }} className="bg-amber-500" />}
            {hitPct > 0 && <View testID="fairway-segment-hit" style={{ flex: hitPct }} className="bg-green-600" />}
            {rightPct > 0 && (
              <View testID="fairway-segment-right" style={{ flex: rightPct }} className="bg-amber-500" />
            )}
          </View>
          {!compact && (
            <View className="mt-2 flex-row justify-between">
              <Text className="text-sm font-bold text-text-secondary dark:text-text-secondary-dark">
                Left {leftPct.toFixed(0)}%
              </Text>
              <Text className="text-sm font-bold text-green-700">Hit {hitPct.toFixed(0)}%</Text>
              <Text className="text-sm font-bold text-text-secondary dark:text-text-secondary-dark">
                Right {rightPct.toFixed(0)}%
              </Text>
            </View>
          )}
        </>
      ) : (
        <Text testID="fairway-distribution-empty" className="text-sm text-text-secondary dark:text-text-secondary-dark">
          No fairway data yet.
        </Text>
      )}
    </View>
  );
}
