import { View, Text } from 'react-native';

export type StatTone = 'good' | 'ok' | 'bad' | 'neutral';

const TONE_COLORS: Record<StatTone, string> = {
  good: '#16A34A',
  ok: '#D97706',
  bad: '#DC2626',
  neutral: '#9CA3AF',
};

interface StatBarRowProps {
  label: string;
  /** Formatted value shown on the right (e.g. "45%", "4.8", "—"). */
  valueLabel: string;
  /** Fill width as 0-100, or null to render no bar (no data). */
  fillPct: number | null;
  tone: StatTone;
  testID: string;
}

export function toneForHigherBetter(
  value: number | null | undefined,
  thresholds: { good: number; ok: number }
): StatTone {
  if (value == null) return 'neutral';
  if (value >= thresholds.good) return 'good';
  if (value >= thresholds.ok) return 'ok';
  return 'bad';
}

export function toneForLowerBetter(
  value: number | null | undefined,
  thresholds: { good: number; ok: number }
): StatTone {
  if (value == null) return 'neutral';
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.ok) return 'ok';
  return 'bad';
}

/**
 * One stat as a labeled mini progress bar: label, colored track fill sized
 * to fillPct, and the formatted value on the right in the same tone color.
 */
export function StatBarRow({ label, valueLabel, fillPct, tone, testID }: StatBarRowProps) {
  const color = TONE_COLORS[tone];

  return (
    <View className="py-1">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">{label}</Text>
        <Text testID={testID} className="text-xs font-semibold" style={{ color }}>
          {valueLabel}
        </Text>
      </View>
      <View className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        {fillPct !== null && (
          <View
            testID={`${testID}-bar`}
            style={{
              width: `${Math.min(Math.max(fillPct, 0), 100)}%`,
              height: '100%',
              borderRadius: 9999,
              backgroundColor: color,
            }}
          />
        )}
      </View>
    </View>
  );
}
