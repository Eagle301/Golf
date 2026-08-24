import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TargetMeterProps {
  /** The result entered so far - null when nothing is logged yet. */
  value: number | null;
  target: number | null;
  testID: string;
}

/** Small whole-number targets read best as one segment per rep; anything else becomes a bar. */
const MAX_SEGMENTS = 12;

/**
 * Visual progress toward a drill's target: a row of segments (or a bar for
 * large targets) that fills as results come in and turns gold with a check
 * once the target is met. Renders nothing for drills without a target.
 */
export function TargetMeter({ value, target, testID }: TargetMeterProps) {
  if (target == null || target <= 0) return null;

  const progress = Math.min(value ?? 0, target);
  const met = value != null && value >= target;
  const segmented = Number.isInteger(target) && target <= MAX_SEGMENTS;

  const filledClass = met ? 'bg-accent-gold' : 'bg-brand dark:bg-accent-gold-dark';
  const emptyClass = 'bg-gray-200 dark:bg-border-dark';

  return (
    <View testID={testID} className="mt-3 flex-row items-center">
      {segmented ? (
        <View className="flex-1 flex-row" style={{ gap: 4 }}>
          {Array.from({ length: target }, (_, i) => {
            const filled = i < Math.floor(progress);
            return (
              <View
                key={i}
                testID={`${testID}-segment-${i}${filled ? '-filled' : ''}`}
                className={`h-2 flex-1 rounded-full ${filled ? filledClass : emptyClass}`}
              />
            );
          })}
        </View>
      ) : (
        <View testID={`${testID}-bar`} className={`h-2 flex-1 overflow-hidden rounded-full ${emptyClass}`}>
          <View
            testID={`${testID}-bar-fill`}
            className={`h-full rounded-full ${filledClass}`}
            style={{ width: `${(progress / target) * 100}%` }}
          />
        </View>
      )}

      {met ? (
        <View testID={`${testID}-met`} className="ml-3 flex-row items-center">
          <Ionicons name="checkmark-circle" size={16} color="#EAB308" />
          <Text className="ml-1 text-xs font-semibold text-accent-gold">Target met</Text>
        </View>
      ) : (
        <Text className="ml-3 text-xs font-medium text-text-secondary dark:text-text-secondary-dark">
          {`${value ?? 0} / ${target}`}
        </Text>
      )}
    </View>
  );
}
