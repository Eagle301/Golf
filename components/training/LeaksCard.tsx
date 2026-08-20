import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import type { Leak, LeakKind } from '@/lib/training/leaks';
import type { TrainingCategory } from '@/types/database';

interface LeaksCardProps {
  /** All leaks, already ranked biggest first (see computeLeaks). */
  leaks: Leak[];
  onPractice: (category: TrainingCategory) => void;
}

const LEAK_LABELS: Record<LeakKind, string> = {
  three_putts: '3-putts',
  penalties: 'Penalty strokes',
  chips: 'Extra chip shots',
  up_and_down: 'Up & downs',
  tee_shots: 'Missed fairways',
  approach: 'Missed greens',
};

/** "+1.1" / "-0.5" / "E" for an average-vs-par value. */
function formatAvgVsPar(avg: number): string {
  const rounded = avg.toFixed(1);
  if (rounded === '0.0' || rounded === '-0.0') return 'E';
  return avg > 0 ? `+${rounded}` : rounded;
}

/**
 * Secondary stat under each leak: how often the count-based leaks happen per
 * round, or the missed-vs-hit scoring averages behind a gap-based leak.
 */
function leakDetail(leak: Leak): string | null {
  switch (leak.kind) {
    case 'three_putts':
    case 'penalties':
      return leak.perRound != null ? `${leak.perRound.toFixed(1)} per round` : null;
    case 'chips':
      return leak.perRound != null ? `${leak.perRound.toFixed(1)} chips per round` : null;
    case 'up_and_down':
      if (leak.upAndDownOppsPerRound == null || leak.upAndDownOppsPerRound === 0) return null;
      return leak.upAndDownPct != null
        ? `${leak.upAndDownOppsPerRound.toFixed(1)} chances per round (${Math.round(leak.upAndDownPct)}% saved)`
        : `${leak.upAndDownOppsPerRound.toFixed(1)} chances per round`;
    case 'tee_shots':
    case 'approach':
      return leak.hitAvgVsPar != null && leak.missAvgVsPar != null
        ? `${formatAvgVsPar(leak.missAvgVsPar)} vs ${formatAvgVsPar(leak.hitAvgVsPar)} when hit`
        : null;
  }
}

/**
 * Ranked stroke-leak list for the Training tab. Every leak is shown, biggest
 * first, and tapping a row jumps to the training category that addresses it.
 */
export function LeaksCard({ leaks, onPractice }: LeaksCardProps) {
  return (
    <Card className="px-4 py-3" testID="leaks-card">
      <View className="flex-row items-center">
        <Ionicons name="water-outline" size={18} color="#DC2626" />
        <Text className="ml-2 text-xs font-semibold uppercase text-text-secondary dark:text-text-secondary-dark">
          Stroke leaks
        </Text>
      </View>
      {leaks.map((leak, index) => {
        const detail = leakDetail(leak);
        return (
          <Pressable
            key={leak.kind}
            testID={`leak-row-${leak.kind}`}
            onPress={() => onPractice(leak.category)}
            className={`py-2 ${index > 0 ? 'border-t border-gray-200 dark:border-border-dark' : 'mt-1'}`}
          >
            <View className="flex-row items-center justify-between">
              <Text
                testID={`leak-label-${leak.kind}`}
                className={`text-sm ${
                  index === 0
                    ? 'font-semibold text-text-primary dark:text-text-primary-dark'
                    : 'text-text-primary dark:text-text-primary-dark'
                }`}
              >
                {LEAK_LABELS[leak.kind]}
              </Text>
              <Text
                testID={`leak-value-${leak.kind}`}
                className="text-sm text-text-secondary dark:text-text-secondary-dark"
              >
                {leak.strokesPerRound !== null
                  ? `~${leak.strokesPerRound.toFixed(1)} strokes/round`
                  : 'Not enough data'}
              </Text>
            </View>
            {detail !== null && (
              <Text
                testID={`leak-detail-${leak.kind}`}
                className="mt-0.5 text-xs text-text-secondary dark:text-text-secondary-dark"
              >
                {detail}
              </Text>
            )}
          </Pressable>
        );
      })}
    </Card>
  );
}
