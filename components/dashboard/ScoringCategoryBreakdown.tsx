import { View, Text } from 'react-native';
import type { ScoringCategoryAverages } from '@/lib/calculations';

interface ScoringCategoryBreakdownProps {
  averages: ScoringCategoryAverages;
}

const CATEGORIES: { key: keyof ScoringCategoryAverages; label: string }[] = [
  { key: 'birdie', label: 'Birdie' },
  { key: 'par', label: 'Par' },
  { key: 'bogey', label: 'Bogey' },
  { key: 'double', label: 'Double' },
  { key: 'doubleOrWorse', label: 'Double+' },
];

/** Average holes per round landing in each scoring bucket, e.g. "Birdie 1.2". */
export function ScoringCategoryBreakdown({ averages }: ScoringCategoryBreakdownProps) {
  return (
    <View
      testID="scoring-category-breakdown"
      className="mt-3 w-full border-t border-gray-200 pt-2 dark:border-border-dark"
    >
      {CATEGORIES.map((c) => (
        <View key={c.key} className="flex-row justify-between py-0.5">
          <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">{c.label}</Text>
          <Text
            testID={`scoring-category-${c.key}`}
            className="text-xs font-medium text-text-primary dark:text-text-primary-dark"
          >
            {averages[c.key].toFixed(1)}
          </Text>
        </View>
      ))}
    </View>
  );
}
