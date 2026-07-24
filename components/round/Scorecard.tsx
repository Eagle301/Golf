import { View, Text } from 'react-native';
import { strokesForHole } from '@/lib/calculations';
import type { FairwayHit } from '@/types/database';

export interface ScorecardHole {
  hole_number: number;
  par: number;
  stroke_index: number | null;
  score: number | null;
  putts: number | null;
  fairway_hit: FairwayHit | null;
  gir: boolean | null;
}

interface ScorecardProps {
  holes: ScorecardHole[];
  courseHandicap: number | null;
}

function netScore(hole: ScorecardHole, courseHandicap: number | null): number | null {
  if (hole.score === null || hole.stroke_index === null || courseHandicap === null) return null;
  return hole.score - strokesForHole(courseHandicap, hole.stroke_index);
}

function scoreStyle(hole: ScorecardHole): { bg: string; text: string; shape: string } {
  if (hole.score === null) return { bg: '', text: 'text-gray-400', shape: 'rounded' };
  const diff = hole.score - hole.par;
  if (diff <= -2) return { bg: 'bg-orange-400', text: 'text-white', shape: 'rounded-full' };
  if (diff === -1) return { bg: 'bg-red-500', text: 'text-white', shape: 'rounded-full' };
  if (diff === 0) return { bg: '', text: 'text-gray-900', shape: 'rounded' };
  if (diff === 1) return { bg: 'bg-blue-400', text: 'text-white', shape: 'rounded' };
  return { bg: 'bg-blue-800', text: 'text-white', shape: 'rounded' };
}

function HoleRange({
  holes,
  courseHandicap,
  label,
}: {
  holes: ScorecardHole[];
  courseHandicap: number | null;
  label: string;
}) {
  const totalPar = holes.reduce((sum, h) => sum + h.par, 0);
  const totalScore = holes.every((h) => h.score !== null)
    ? holes.reduce((sum, h) => sum + (h.score ?? 0), 0)
    : null;
  const totalNet = holes.every((h) => netScore(h, courseHandicap) !== null)
    ? holes.reduce((sum, h) => sum + (netScore(h, courseHandicap) ?? 0), 0)
    : null;

  return (
    <View className="mb-2 overflow-hidden rounded-lg border border-gray-200" testID={`scorecard-range-${label}`}>
      <View className="flex-row bg-green-700 py-2">
        <Text className="w-10 text-center text-xs font-semibold text-white" />
        {holes.map((h) => (
          <Text key={h.hole_number} className="flex-1 text-center text-xs font-semibold text-white">
            {h.hole_number}
          </Text>
        ))}
        <Text className="w-12 text-center text-xs font-semibold text-white">{label}</Text>
      </View>

      <View className="flex-row items-center py-1">
        <Text className="w-10 text-center text-xs text-gray-500">Index</Text>
        {holes.map((h) => (
          <Text key={h.hole_number} className="flex-1 text-center text-xs text-gray-500">
            {h.stroke_index ?? '-'}
          </Text>
        ))}
        <Text className="w-12 text-center text-xs text-gray-500" />
      </View>

      <View className="flex-row items-center border-t border-gray-100 py-1">
        <Text className="w-10 text-center text-xs text-gray-700">Par</Text>
        {holes.map((h) => (
          <Text key={h.hole_number} className="flex-1 text-center text-xs text-gray-700">
            {h.par}
          </Text>
        ))}
        <Text className="w-12 text-center text-xs font-semibold text-gray-700">{totalPar}</Text>
      </View>

      <View className="flex-row items-center border-t border-gray-100 py-1">
        <Text className="w-10 text-center text-xs font-semibold text-gray-700">Score</Text>
        {holes.map((h) => {
          const style = scoreStyle(h);
          return (
            <View key={h.hole_number} className="flex-1 items-center">
              <View
                testID={`scorecard-score-${h.hole_number}`}
                className={`h-6 w-6 items-center justify-center ${style.shape} ${style.bg}`}
              >
                <Text className={`text-xs font-semibold ${style.text}`}>{h.score ?? '-'}</Text>
              </View>
            </View>
          );
        })}
        <Text className="w-12 text-center text-xs font-semibold text-gray-900">{totalScore ?? '-'}</Text>
      </View>

      <View className="flex-row items-center border-t border-gray-100 py-1">
        <Text className="w-10 text-center text-xs text-gray-500">Net</Text>
        {holes.map((h) => (
          <Text
            key={h.hole_number}
            testID={`scorecard-net-${h.hole_number}`}
            className="flex-1 text-center text-xs text-gray-500"
          >
            {netScore(h, courseHandicap) ?? '-'}
          </Text>
        ))}
        <Text className="w-12 text-center text-xs text-gray-500">{totalNet ?? '-'}</Text>
      </View>
    </View>
  );
}

export function Scorecard({ holes, courseHandicap }: ScorecardProps) {
  const front9 = holes.filter((h) => h.hole_number <= 9);
  const back9 = holes.filter((h) => h.hole_number > 9);

  const totalPar = holes.reduce((sum, h) => sum + h.par, 0);
  const allScored = holes.length > 0 && holes.every((h) => h.score !== null);
  const grossTotal = allScored ? holes.reduce((sum, h) => sum + (h.score ?? 0), 0) : null;
  const netTotal =
    allScored && holes.every((h) => netScore(h, courseHandicap) !== null)
      ? holes.reduce((sum, h) => sum + (netScore(h, courseHandicap) ?? 0), 0)
      : null;

  const fairwayEligible = holes.filter((h) => h.par !== 3);
  const fairwayHit = fairwayEligible.filter((h) => h.fairway_hit === 'yes').length;
  const fairwayMissLR = fairwayEligible.filter(
    (h) => h.fairway_hit === 'missed_left' || h.fairway_hit === 'missed_right'
  ).length;
  const fairwayMissSL = fairwayEligible.filter(
    (h) => h.fairway_hit === 'missed_short' || h.fairway_hit === 'missed_long'
  ).length;

  const totalPutts = holes.every((h) => h.putts !== null)
    ? holes.reduce((sum, h) => sum + (h.putts ?? 0), 0)
    : null;
  const girHit = holes.filter((h) => h.gir === true).length;

  return (
    <View testID="scorecard">
      {front9.length > 0 && <HoleRange holes={front9} courseHandicap={courseHandicap} label="Out" />}
      {back9.length > 0 && <HoleRange holes={back9} courseHandicap={courseHandicap} label="In" />}

      <View className="mt-2 flex-row items-center justify-between rounded-lg bg-gray-100 px-4 py-3">
        <View>
          <Text className="text-xs text-gray-500">Par</Text>
          <Text className="text-lg font-semibold">{totalPar}</Text>
        </View>
        <View>
          <Text className="text-xs text-gray-500">Score</Text>
          <Text testID="scorecard-total-score" className="text-lg font-semibold">
            {grossTotal ?? '-'}
            {netTotal !== null ? ` / ${netTotal}` : ''}
          </Text>
        </View>
      </View>

      <View className="mt-2 rounded-lg bg-gray-50 px-4 py-3">
        <View className="mb-1 flex-row justify-between">
          <Text className="text-sm text-gray-600">Fairway hits</Text>
          <Text testID="scorecard-fairway-stat" className="text-sm font-medium">
            {fairwayHit}/{fairwayMissLR}/{fairwayMissSL}
          </Text>
        </View>
        <View className="mb-1 flex-row justify-between">
          <Text className="text-sm text-gray-600">Putts</Text>
          <Text testID="scorecard-putts-stat" className="text-sm font-medium">
            {totalPutts ?? '-'}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-gray-600">Green hits</Text>
          <Text testID="scorecard-gir-stat" className="text-sm font-medium">
            {girHit}/{holes.length}
          </Text>
        </View>
      </View>
    </View>
  );
}
