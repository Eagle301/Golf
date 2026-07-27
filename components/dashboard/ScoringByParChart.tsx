import { View, Text } from 'react-native';

interface ScoringByParChartProps {
  scoreByPar: { par3: number | null; par4: number | null; par5: number | null };
}

const BAR_AREA_HEIGHT = 100;
const BAR_COLOR = '#1F2937';

const CATEGORIES: { key: 'par3' | 'par4' | 'par5'; label: string; par: number }[] = [
  { key: 'par3', label: 'Par 3', par: 3 },
  { key: 'par4', label: 'Par 4', par: 4 },
  { key: 'par5', label: 'Par 5', par: 5 },
];

/** Three-bar comparison of average score on Par 3s, 4s, and 5s. */
export function ScoringByParChart({ scoreByPar }: ScoringByParChartProps) {
  const values = CATEGORIES.map((c) => scoreByPar[c.key]).filter((v): v is number => v !== null);
  const hasData = values.length > 0;
  const maxValue = hasData ? Math.max(...values) : 0;

  return (
    <View testID="scoring-by-par-chart">
      <Text className="mb-2 text-sm font-medium text-text-primary dark:text-text-primary-dark">Scoring by Par</Text>
      {hasData ? (
        <View className="flex-row items-end justify-between" style={{ height: BAR_AREA_HEIGHT }}>
          {CATEGORIES.map((c) => {
            const value = scoreByPar[c.key];
            const barHeight = value !== null && maxValue > 0 ? (value / maxValue) * BAR_AREA_HEIGHT : 0;
            return (
              <View key={c.key} className="flex-1 items-center justify-end">
                {value !== null && (
                  <Text
                    testID={`scoring-by-par-value-${c.key}`}
                    className="mb-1 text-xs font-semibold text-text-primary dark:text-text-primary-dark"
                  >
                    {value.toFixed(1)}
                  </Text>
                )}
                <View
                  testID={`scoring-by-par-bar-${c.key}`}
                  className="w-8 rounded-t"
                  style={{ height: Math.max(barHeight, value !== null ? 2 : 0), backgroundColor: BAR_COLOR }}
                />
              </View>
            );
          })}
        </View>
      ) : (
        <Text testID="scoring-by-par-empty" className="text-sm text-text-secondary dark:text-text-secondary-dark">
          No scored holes yet.
        </Text>
      )}
      <View className="mt-1 flex-row justify-between">
        {CATEGORIES.map((c) => (
          <Text key={c.key} className="flex-1 text-center text-xs text-text-secondary dark:text-text-secondary-dark">
            {c.label}
          </Text>
        ))}
      </View>
    </View>
  );
}
