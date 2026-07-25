import { View, Text } from 'react-native';
import { strokesForHole } from '@/lib/calculations';

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

function netPar(hole: OverviewHole, courseHandicap: number | null): number {
  if (courseHandicap === null || hole.stroke_index === null) return hole.par;
  return hole.par + strokesForHole(courseHandicap, hole.stroke_index);
}

function HoleRange({
  holes,
  courseHandicap,
  label,
}: {
  holes: OverviewHole[];
  courseHandicap: number | null;
  label: string;
}) {
  const totalLength = holes.reduce((sum, h) => sum + (h.length_meters ?? 0), 0);
  const totalPar = holes.reduce((sum, h) => sum + h.par, 0);
  const totalNetPar = holes.reduce((sum, h) => sum + netPar(h, courseHandicap), 0);

  return (
    <View
      className="mb-2 overflow-hidden rounded-lg border border-gray-200"
      testID={`overview-range-${label}`}
    >
      <View className="flex-row bg-green-700 py-2">
        <Text className="w-14 text-center text-xs font-semibold text-white" />
        {holes.map((h) => (
          <Text key={h.hole_number} className="flex-1 text-center text-xs font-semibold text-white">
            {h.hole_number}
          </Text>
        ))}
        <Text className="w-12 text-center text-xs font-semibold text-white">{label}</Text>
      </View>

      <View className="flex-row items-center py-1">
        <Text className="w-14 text-center text-xs text-gray-500">Length</Text>
        {holes.map((h) => (
          <Text key={h.hole_number} className="flex-1 text-center text-xs text-gray-500">
            {h.length_meters ?? '-'}
          </Text>
        ))}
        <Text className="w-12 text-center text-xs text-gray-500">{totalLength}</Text>
      </View>

      <View className="flex-row items-center border-t border-gray-100 py-1">
        <Text className="w-14 text-center text-xs text-gray-700">Par</Text>
        {holes.map((h) => (
          <Text key={h.hole_number} className="flex-1 text-center text-xs text-gray-700">
            {h.par}
          </Text>
        ))}
        <Text className="w-12 text-center text-xs font-semibold text-gray-700">{totalPar}</Text>
      </View>

      <View className="flex-row items-center border-t border-gray-100 py-1">
        <Text className="w-14 text-center text-xs font-semibold text-gray-700">Net Par</Text>
        {holes.map((h) => {
          const np = netPar(h, courseHandicap);
          return (
            <Text
              key={h.hole_number}
              testID={`overview-net-par-${h.hole_number}`}
              className={`flex-1 text-center text-xs ${np !== h.par ? 'font-semibold text-green-700' : 'text-gray-700'}`}
            >
              {np}
            </Text>
          );
        })}
        <Text className="w-12 text-center text-xs font-semibold text-gray-900">{totalNetPar}</Text>
      </View>
    </View>
  );
}

export function RoundOverviewScorecard({ holes, courseHandicap }: RoundOverviewScorecardProps) {
  const front9 = holes.filter((h) => h.hole_number <= 9);
  const back9 = holes.filter((h) => h.hole_number > 9);

  return (
    <View testID="round-overview-scorecard">
      {front9.length > 0 && <HoleRange holes={front9} courseHandicap={courseHandicap} label="Out" />}
      {back9.length > 0 && <HoleRange holes={back9} courseHandicap={courseHandicap} label="In" />}
    </View>
  );
}
