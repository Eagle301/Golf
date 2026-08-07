import { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import {
  strokesForHole,
  calculatePoints,
  toSuperscript,
  calculateBruttoScore,
  calculateNetParForNine,
} from '@/lib/calculations';
import type { FairwayHit } from '@/types/database';
import { Card } from '@/components/ui/Card';

export interface ScorecardHole {
  hole_number: number;
  par: number;
  stroke_index: number | null;
  score: number | null;
  putts: number | null;
  fairway_hit: FairwayHit | null;
  gir: boolean | null;
  penalties?: number | null;
}

/** Handicap Index, Course Handicap, and Score Differential for a completed round - shown alongside the bottom stats when reviewing history. */
export interface ScorecardRoundSummary {
  courseHandicap: number | null;
  handicapIndex: number | null;
  scoreDifferential: number | null;
  /** Full (un-halved) values, used to show the formula behind each stat when expanded. */
  courseRating: number | null;
  slopeRating: number | null;
  totalPar: number;
}

interface ScorecardProps {
  holes: ScorecardHole[];
  courseHandicap: number | null;
  /** When given, hole numbers become tappable and call back with the tapped hole_number. */
  onSelectHole?: (holeNumber: number) => void;
  /** When given, renders Course Handicap / Handicap Index / Score Differential below the other stats - for a completed round's detail view. */
  roundSummary?: ScorecardRoundSummary;
}

function netScore(hole: ScorecardHole, courseHandicap: number | null, holeCount: 9 | 18): number | null {
  if (hole.score === null || hole.stroke_index === null || courseHandicap === null) return null;
  return hole.score - strokesForHole(courseHandicap, hole.stroke_index, holeCount);
}

function points(hole: ScorecardHole, courseHandicap: number | null, holeCount: 9 | 18): number | null {
  const net = netScore(hole, courseHandicap, holeCount);
  return net === null ? null : calculatePoints(net, hole.par);
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
  holeCount,
  label,
  onSelectHole,
}: {
  holes: ScorecardHole[];
  courseHandicap: number | null;
  holeCount: 9 | 18;
  label: string;
  onSelectHole?: (holeNumber: number) => void;
}) {
  const totalPar = holes.reduce((sum, h) => sum + h.par, 0);
  const totalScore = holes.every((h) => h.score !== null)
    ? holes.reduce((sum, h) => sum + (h.score ?? 0), 0)
    : null;
  const totalNet = holes.every((h) => netScore(h, courseHandicap, holeCount) !== null)
    ? holes.reduce((sum, h) => sum + (netScore(h, courseHandicap, holeCount) ?? 0), 0)
    : null;

  return (
    <View
      className="mb-2 overflow-hidden rounded-lg border border-gray-200 dark:border-border-dark"
      testID={`scorecard-range-${label}`}
    >
      <View className="flex-row">
        <View className="w-12">
          <View className="items-center bg-brand py-2">
            <Text className="text-center text-xs font-semibold text-white"> </Text>
          </View>
          <View className="py-1">
            <Text className="text-center text-xs text-text-secondary dark:text-text-secondary-dark">Index</Text>
          </View>
          <View className="border-t border-gray-100 py-1 dark:border-border-dark">
            <Text className="text-center text-xs text-text-primary dark:text-text-primary-dark">Par</Text>
          </View>
          <View className="border-t border-gray-100 py-1 dark:border-border-dark">
            <Text className="text-center text-xs font-semibold text-text-primary dark:text-text-primary-dark">
              Score
            </Text>
          </View>
          <View className="border-t border-gray-100 py-1 dark:border-border-dark">
            <Text className="text-center text-xs text-text-secondary dark:text-text-secondary-dark">Net</Text>
          </View>
        </View>

        {holes.map((h) => {
          const style = scoreStyle(h);
          const pts = points(h, courseHandicap, holeCount);
          return (
            <Pressable
              key={h.hole_number}
              testID={`scorecard-hole-${h.hole_number}`}
              disabled={!onSelectHole}
              onPress={() => onSelectHole?.(h.hole_number)}
              className="flex-1"
            >
              {({ pressed }) => (
                <View className={pressed && onSelectHole ? 'opacity-60' : ''}>
                  <View className="items-center bg-brand py-2">
                    <Text className="text-center text-xs font-semibold text-white">{h.hole_number}</Text>
                  </View>
                  <View className="items-center py-1">
                    <Text className="text-center text-xs text-text-secondary dark:text-text-secondary-dark">
                      {h.stroke_index ?? '-'}
                    </Text>
                  </View>
                  <View className="items-center border-t border-gray-100 py-1 dark:border-border-dark">
                    <Text className="text-center text-xs text-text-primary dark:text-text-primary-dark">
                      {h.par}
                    </Text>
                  </View>
                  <View className="items-center border-t border-gray-100 py-1 dark:border-border-dark">
                    <View className="relative">
                      <View
                        testID={`scorecard-score-${h.hole_number}`}
                        className={`h-6 w-6 items-center justify-center ${style.shape} ${style.bg}`}
                      >
                        <Text className={`text-xs font-semibold ${style.text}`}>{h.score ?? '-'}</Text>
                      </View>
                      {pts !== null && (
                        <Text
                          testID={`scorecard-points-${h.hole_number}`}
                          className={`absolute right-0.5 top-0.5 text-[10px] font-extrabold ${style.text}`}
                        >
                          {toSuperscript(pts)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View className="items-center border-t border-gray-100 py-1 dark:border-border-dark">
                    <Text
                      testID={`scorecard-net-${h.hole_number}`}
                      className="text-center text-xs text-text-secondary dark:text-text-secondary-dark"
                    >
                      {netScore(h, courseHandicap, holeCount) ?? '-'}
                    </Text>
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}

        <View className="w-12">
          <View className="items-center bg-brand py-2">
            <Text className="text-center text-xs font-semibold text-white">{label}</Text>
          </View>
          <View className="py-1">
            <Text className="text-center text-xs text-text-secondary dark:text-text-secondary-dark"> </Text>
          </View>
          <View className="border-t border-gray-100 py-1 dark:border-border-dark">
            <Text className="text-center text-xs font-semibold text-text-primary dark:text-text-primary-dark">
              {totalPar}
            </Text>
          </View>
          <View className="border-t border-gray-100 py-1 dark:border-border-dark">
            <Text className="text-center text-xs font-semibold text-text-primary dark:text-text-primary-dark">
              {totalScore ?? '-'}
            </Text>
          </View>
          <View className="border-t border-gray-100 py-1 dark:border-border-dark">
            <Text className="text-center text-xs text-text-secondary dark:text-text-secondary-dark">
              {totalNet ?? '-'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export function Scorecard({ holes, courseHandicap, onSelectHole, roundSummary }: ScorecardProps) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const front9 = holes.filter((h) => h.hole_number <= 9);
  const back9 = holes.filter((h) => h.hole_number > 9);
  const isNineHoles = holes.length === 9;
  const holeCount: 9 | 18 = isNineHoles ? 9 : 18;

  const totalPar = holes.reduce((sum, h) => sum + h.par, 0);
  const allScored = holes.length > 0 && holes.every((h) => h.score !== null);
  const grossTotal = allScored ? holes.reduce((sum, h) => sum + (h.score ?? 0), 0) : null;
  const netTotal =
    allScored && holes.every((h) => netScore(h, courseHandicap, holeCount) !== null)
      ? holes.reduce((sum, h) => sum + (netScore(h, courseHandicap, holeCount) ?? 0), 0)
      : null;
  const totalPoints =
    allScored && holes.every((h) => points(h, courseHandicap, holeCount) !== null)
      ? holes.reduce((sum, h) => sum + (points(h, courseHandicap, holeCount) ?? 0), 0)
      : null;
  const bruttoTotal = allScored ? calculateBruttoScore(holes, courseHandicap, holeCount) : null;
  const netParForNine = isNineHoles ? calculateNetParForNine(totalPar, courseHandicap) : null;
  const bruttoCorrectedForEighteen =
    bruttoTotal !== null && netParForNine !== null ? bruttoTotal + netParForNine : null;

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
  const totalPenalties = holes.every((h) => h.penalties != null)
    ? holes.reduce((sum, h) => sum + (h.penalties ?? 0), 0)
    : null;
  const girHit = holes.filter((h) => h.gir === true).length;

  return (
    <View testID="scorecard">
      {front9.length > 0 && (
        <HoleRange
          holes={front9}
          courseHandicap={courseHandicap}
          holeCount={holeCount}
          label="Out"
          onSelectHole={onSelectHole}
        />
      )}
      {back9.length > 0 && (
        <HoleRange
          holes={back9}
          courseHandicap={courseHandicap}
          holeCount={holeCount}
          label="In"
          onSelectHole={onSelectHole}
        />
      )}

      <Card className="mt-2 flex-row items-center justify-between px-4 py-3">
        <View>
          <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">Par</Text>
          <Text className="text-lg font-semibold text-text-primary dark:text-text-primary-dark">{totalPar}</Text>
        </View>
        <View>
          <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">Score</Text>
          <Text
            testID="scorecard-total-score"
            className="text-lg font-semibold text-text-primary dark:text-text-primary-dark"
          >
            {grossTotal ?? '-'}
            {netTotal !== null ? ` / ${netTotal}` : ''}
          </Text>
        </View>
        <View>
          <Text className="text-xs text-text-secondary dark:text-text-secondary-dark">Points</Text>
          <Text
            testID="scorecard-total-points"
            className="text-lg font-semibold text-text-primary dark:text-text-primary-dark"
          >
            {totalPoints ?? '-'}
          </Text>
        </View>
      </Card>

      <Card className="mt-2 px-4 py-3">
        <View className="mb-1 flex-row justify-between">
          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Putts</Text>
          <Text testID="scorecard-putts-stat" className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
            {totalPutts ?? '-'}
          </Text>
        </View>
        <View className="mb-1 flex-row justify-between">
          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Penalties</Text>
          <Text
            testID="scorecard-penalties-stat"
            className="text-sm font-medium text-text-primary dark:text-text-primary-dark"
          >
            {totalPenalties ?? '-'}
          </Text>
        </View>
        <View className="mb-1 flex-row justify-between">
          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Fairway hits</Text>
          <Text
            testID="scorecard-fairway-stat"
            className="text-sm font-medium text-text-primary dark:text-text-primary-dark"
          >
            {fairwayHit}/{fairwayMissLR}/{fairwayMissSL}
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Green hits</Text>
          <Text testID="scorecard-gir-stat" className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
            {girHit}/{holes.length}
          </Text>
        </View>

        {roundSummary && (
          <Pressable
            testID="scorecard-summary-toggle"
            onPress={() => setSummaryExpanded((prev) => !prev)}
            className="mt-2 border-t border-gray-200 pt-2 dark:border-border-dark"
          >
            <View className="mb-1 flex-row justify-between">
              <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Brutto score</Text>
              <Text
                testID="scorecard-brutto-stat"
                className="text-sm font-medium text-text-primary dark:text-text-primary-dark"
              >
                {isNineHoles
                  ? `${bruttoTotal ?? '-'} / ${bruttoCorrectedForEighteen ?? '-'}`
                  : (bruttoTotal ?? '-')}
              </Text>
            </View>
            <View className="mb-1 flex-row justify-between">
              <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Handicap Index</Text>
              <Text
                testID="scorecard-handicap-index-stat"
                className="text-sm font-medium text-text-primary dark:text-text-primary-dark"
              >
                {roundSummary.handicapIndex != null ? roundSummary.handicapIndex.toFixed(1) : '-'}
              </Text>
            </View>
            <View className="mb-1 flex-row justify-between">
              <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">Course Handicap</Text>
              <Text
                testID="scorecard-course-handicap-stat"
                className="text-sm font-medium text-text-primary dark:text-text-primary-dark"
              >
                {roundSummary.courseHandicap ?? '-'}
              </Text>
            </View>
            {summaryExpanded &&
              roundSummary.handicapIndex != null &&
              roundSummary.slopeRating != null &&
              roundSummary.courseRating != null && (
                <Text
                  testID="scorecard-course-handicap-detail"
                  className="mb-1 text-xs text-text-secondary dark:text-text-secondary-dark"
                >
                  {roundSummary.handicapIndex.toFixed(1)} × ({roundSummary.slopeRating}/113) + (
                  {roundSummary.courseRating.toFixed(1)} −{' '}
                  {isNineHoles ? roundSummary.totalPar * 2 : roundSummary.totalPar}) ={' '}
                  {roundSummary.courseHandicap ?? '-'}
                </Text>
              )}
            <View className="flex-row justify-between">
              <Text className="text-sm text-text-secondary dark:text-text-secondary-dark">
                Score Differential
              </Text>
              <Text
                testID="scorecard-score-differential-stat"
                className="text-sm font-medium text-text-primary dark:text-text-primary-dark"
              >
                {roundSummary.scoreDifferential != null ? roundSummary.scoreDifferential.toFixed(1) : '-'}
              </Text>
            </View>
            {summaryExpanded && roundSummary.slopeRating != null && roundSummary.courseRating != null && (
              <Text
                testID="scorecard-score-differential-detail"
                className="text-xs text-text-secondary dark:text-text-secondary-dark"
              >
                {isNineHoles
                  ? `(${bruttoTotal ?? '-'} + ${netParForNine ?? '-'} − ${roundSummary.courseRating}) × 113/${roundSummary.slopeRating} = ${roundSummary.scoreDifferential != null ? roundSummary.scoreDifferential.toFixed(1) : '-'}`
                  : `(${bruttoTotal ?? '-'} − ${roundSummary.courseRating}) × 113/${roundSummary.slopeRating} = ${roundSummary.scoreDifferential != null ? roundSummary.scoreDifferential.toFixed(1) : '-'}`}
              </Text>
            )}
          </Pressable>
        )}
      </Card>
    </View>
  );
}
