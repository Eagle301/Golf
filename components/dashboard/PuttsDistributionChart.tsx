import { View, Text } from 'react-native';
import type { PuttsDistribution } from '@/lib/calculations';

interface PuttsDistributionChartProps {
  distribution: PuttsDistribution;
  averagePerRound: number | null;
  /** Collapsed layout: average shows just the number (no "/ round"), and the per-bucket legend is hidden. */
  compact?: boolean;
}

const SEGMENTS: { key: keyof PuttsDistribution; label: string; color: string }[] = [
  { key: 'putts0Pct', label: '0', color: '#0EA5E9' },
  { key: 'putts1Pct', label: '1', color: '#22C55E' },
  { key: 'putts2Pct', label: '2', color: '#EAB308' },
  { key: 'putts3Pct', label: '3', color: '#F97316' },
  { key: 'putts4PlusPct', label: '4+', color: '#EF4444' },
];

/** Horizontal stacked bar: % of holes with 0/1/2/3/4+ putts, plus the average per 18-hole round. */
export function PuttsDistributionChart({
  distribution,
  averagePerRound,
  compact = false,
}: PuttsDistributionChartProps) {
  const hasData = SEGMENTS.some((s) => distribution[s.key] > 0);

  return (
    <View testID="putts-distribution-chart">
      <View className="mb-2 flex-row items-baseline justify-between">
        <Text className="text-sm font-medium text-text-primary dark:text-text-primary-dark">Putts</Text>
        <Text
          testID="putts-average-per-round"
          className="text-sm font-semibold text-text-primary dark:text-text-primary-dark"
        >
          {averagePerRound != null
            ? compact
              ? `Avg. ${averagePerRound.toFixed(1)}`
              : `Avg. ${averagePerRound.toFixed(1)} / round`
            : '—'}
        </Text>
      </View>
      {hasData ? (
        <>
          <View className="h-5 w-full flex-row overflow-hidden rounded-full bg-gray-100">
            {SEGMENTS.map(
              (s) =>
                distribution[s.key] > 0 && (
                  <View
                    key={s.key}
                    testID={`putts-segment-${s.label}`}
                    style={{ flex: distribution[s.key], backgroundColor: s.color }}
                  />
                )
            )}
          </View>
          {!compact && (
            <View className="mt-2 flex-row justify-between">
              {SEGMENTS.map((s) => (
                <Text
                  key={s.key}
                  className="text-sm font-bold text-text-secondary dark:text-text-secondary-dark"
                >
                  {s.label}: {distribution[s.key].toFixed(0)}%
                </Text>
              ))}
            </View>
          )}
        </>
      ) : (
        <Text testID="putts-distribution-empty" className="text-sm text-text-secondary dark:text-text-secondary-dark">
          No putts data yet.
        </Text>
      )}
    </View>
  );
}
