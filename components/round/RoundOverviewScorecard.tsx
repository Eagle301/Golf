import { View, Text } from 'react-native';
import { calculateNetPar, calculateTotalNetPar } from '@/lib/calculations';

export interface OverviewHole {
  hole_number: number;
  par: number;
  length_meters: number | null;
  stroke_index: number | null;
}

interface RoundOverviewScorecardProps {
  holes: OverviewHole[];
  courseHandicap: number | null;
}

function HoleRange({
  holes,
  courseHandicap,
  holeCount,
  label,
}: {
  holes: OverviewHole[];
  courseHandicap: number | null;
  holeCount: 9 | 18;
  label: string;
}) {
  const totalLength = holes.reduce((sum, h) => sum + (h.length_meters ?? 0), 0);
  const totalPar = holes.reduce((sum, h) => sum + h.par, 0);
  const totalNetPar = calculateTotalNetPar(holes, courseHandicap, holeCount);

  return (
    <View
      className="mb-2 overflow-hidden rounded-lg border border-gray-200 dark:border-border-dark"
      testID={`overview-range-${label}`}
    >
      <View className="flex-row bg-brand py-2">
        <Text className="w-14 text-center text-xs font-semibold text-white" />
        {holes.map((h) => (
          <Text key={h.hole_number} className="flex-1 text-center text-xs font-semibold text-white">
            {h.hole_number}
          </Text>
        ))}
        <Text className="w-14 text-center text-xs font-semibold text-white">{label}</Text>
      </View>

      <View className="flex-row items-center py-1">
        <Text className="w-14 text-center text-xs text-text-secondary dark:text-text-secondary-dark">Index</Text>
        {holes.map((h) => (
          <Text
            key={h.hole_number}
            className="flex-1 text-center text-xs text-text-secondary dark:text-text-secondary-dark"
          >
            {h.stroke_index ?? '-'}
          </Text>
        ))}
        <Text className="w-14 text-center text-xs text-text-secondary dark:text-text-secondary-dark" />
      </View>

      <View className="flex-row items-center border-t border-gray-100 py-1 dark:border-border-dark">
        <Text className="w-14 text-center text-xs text-text-secondary dark:text-text-secondary-dark">Length</Text>
        {holes.map((h) => (
          <Text
            key={h.hole_number}
            className="flex-1 text-center text-xs text-text-secondary dark:text-text-secondary-dark"
          >
            {h.length_meters ?? '-'}
          </Text>
        ))}
        <Text className="w-14 text-center text-xs text-text-secondary dark:text-text-secondary-dark">
          {totalLength}
        </Text>
      </View>

      <View className="flex-row items-center border-t border-gray-100 py-1 dark:border-border-dark">
        <Text className="w-14 text-center text-xs text-text-primary dark:text-text-primary-dark">Par</Text>
        {holes.map((h) => (
          <Text
            key={h.hole_number}
            className="flex-1 text-center text-xs text-text-primary dark:text-text-primary-dark"
          >
            {h.par}
          </Text>
        ))}
        <Text className="w-14 text-center text-xs font-semibold text-text-primary dark:text-text-primary-dark">
          {totalPar}
        </Text>
      </View>

      <View className="flex-row items-center border-t border-gray-100 py-1 dark:border-border-dark">
        <Text className="w-14 text-center text-xs font-semibold text-text-primary dark:text-text-primary-dark">
          Net Par
        </Text>
        {holes.map((h) => {
          const np = calculateNetPar(h, courseHandicap, holeCount);
          return (
            <Text
              key={h.hole_number}
              testID={`overview-net-par-${h.hole_number}`}
              className={`flex-1 text-center text-xs ${np !== h.par ? 'font-semibold text-green-700 dark:text-accent-gold-dark' : 'text-text-primary dark:text-text-primary-dark'}`}
            >
              {np}
            </Text>
          );
        })}
        <Text className="w-14 text-center text-xs font-semibold text-text-primary dark:text-text-primary-dark">
          {totalNetPar}
        </Text>
      </View>
    </View>
  );
}

export function RoundOverviewScorecard({ holes, courseHandicap }: RoundOverviewScorecardProps) {
  const front9 = holes.filter((h) => h.hole_number <= 9);
  const back9 = holes.filter((h) => h.hole_number > 9);
  const holeCount: 9 | 18 = holes.length === 9 ? 9 : 18;

  return (
    <View testID="round-overview-scorecard">
      {front9.length > 0 && (
        <HoleRange holes={front9} courseHandicap={courseHandicap} holeCount={holeCount} label="Out" />
      )}
      {back9.length > 0 && (
        <HoleRange holes={back9} courseHandicap={courseHandicap} holeCount={holeCount} label="In" />
      )}
    </View>
  );
}
